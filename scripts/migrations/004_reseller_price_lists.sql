-- ==============================================================================
-- 004 - Reseller price lists: clients of the reseller (owner) with fixed prices
--
-- * A partner account may be "managed" (managed_by = the reseller). Such an account
--   is a FINAL CLIENT: it never sees the purchase price, never sets a price. It only
--   sees the unit prices set by the reseller in its own price list (account.price_list).
-- * price_list = { "prices": { "<module id>": <unit price HT> }, "retouchPrice": <HT> }
-- * Quotes of a managed account store the reseller's price as the unit price
--   (modules[].basePrice, no clientPrice). The server enforces those prices on every
--   save and masks any legacy cost / client-price split on read.
-- * Existing partner accounts become clients of the reseller, with a price list copied
--   from the model quote RM-2026-0013 (its client prices, retouche price included).
--
-- Cut-over: apply together with the new front-end. Safe to re-run.
-- ==============================================================================

-- ------------------------------------------------------------------ schema --

do $$
declare v_owner uuid; v_ref app_quotes; v_list jsonb;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'app_accounts' and column_name = 'managed_by'
  ) then
    alter table app_accounts add column managed_by uuid references app_accounts(id) on delete set null;
    alter table app_accounts add column price_list jsonb not null default '{}'::jsonb;

    -- backfill: current partners are clients of the reseller; price list = the model quote
    select id into v_owner from app_accounts where role = 'owner' order by created_at limit 1;
    if v_owner is not null then
      select * into v_ref from app_quotes where reference = 'RM-2026-0013';
      if found then
        v_list := jsonb_build_object(
          'prices', coalesce((
            select jsonb_object_agg(
                     m ->> 'id',
                     coalesce((m ->> 'clientPrice')::numeric, (m ->> 'basePrice')::numeric))
              from jsonb_array_elements(v_ref.data -> 'modules') m
             where m ->> 'id' not like 'custom-%'
          ), '{}'::jsonb),
          'retouchPrice', coalesce(
            (v_ref.data #>> '{settings,retouchClientPrice}')::numeric,
            (v_ref.data #>> '{settings,retouchUnitPrice}')::numeric, 45)
        );
      else
        v_list := '{}'::jsonb;
      end if;
      update app_accounts set managed_by = v_owner, price_list = v_list where role = 'partner';
    end if;
  end if;
end $$;

-- ----------------------------------------------------------------- helpers --

-- Same rule as getClientUnitPrice (src/utils/formatters.ts)
create or replace function app_effective_price(m jsonb, s jsonb) returns numeric
language sql immutable as $$
  select case
    when coalesce(s ->> 'clientMode', 'forfait') = 'tjm' then
      round(coalesce((m ->> 'days')::numeric, 0)
            * coalesce((s ->> 'clientTjm')::numeric, (s ->> 'tjmSuzali')::numeric, 0), 2)
    when m ->> 'clientPrice' is not null then (m ->> 'clientPrice')::numeric
    when coalesce(s ->> 'mode', 'forfait') = 'tjm' then
      coalesce((m ->> 'days')::numeric, 0) * coalesce((s ->> 'tjmSuzali')::numeric, 0)
        * (1 + coalesce((s ->> 'partnerMarginPercent')::numeric, 0) / 100)
    else
      coalesce((m ->> 'basePrice')::numeric, 0) * (1 + coalesce((s ->> 'partnerMarginPercent')::numeric, 0) / 100)
  end
$$;

create or replace function app_effective_retouche(s jsonb) returns numeric
language sql immutable as $$
  select coalesce((s ->> 'retouchClientPrice')::numeric, (s ->> 'retouchUnitPrice')::numeric, 0)
$$;

-- What a managed account is allowed to see: one price per line, no purchase price, no TJM.
create or replace function app_quote_mask(p_data jsonb) returns jsonb
language plpgsql immutable as $$
declare s jsonb := coalesce(p_data -> 'settings', '{}'::jsonb); v_mods jsonb;
begin
  select coalesce(jsonb_agg(
           jsonb_set(m - 'clientPrice', '{basePrice}', to_jsonb(round(app_effective_price(m, s), 2)))
           order by ord), '[]'::jsonb)
    into v_mods
    from jsonb_array_elements(coalesce(p_data -> 'modules', '[]'::jsonb)) with ordinality t(m, ord);
  return jsonb_set(jsonb_set(p_data, '{modules}', v_mods), '{settings}',
    (s - 'clientTjm' - 'retouchClientPrice') || jsonb_build_object(
      'mode', 'forfait', 'clientMode', 'forfait', 'tjmSuzali', 0, 'partnerMarginPercent', 0,
      'discountPercent', 0, 'retouchUnitPrice', app_effective_retouche(s)));
end $$;

-- Prices of a managed account's quote = its price list. Nothing price-related comes from the caller.
-- Returns the normalized data (modules, settings, rebuilt clientSnapshot) and the HT total.
create or replace function app_quote_enforce(p_data jsonb, p_prior jsonb, p_list jsonb, out o_data jsonb, out o_total numeric)
language plpgsql immutable as $$
declare
  v_prices jsonb := coalesce(p_list -> 'prices', '{}'::jsonb);
  v_retouch numeric := coalesce((p_list ->> 'retouchPrice')::numeric, 0);
  v_prior_set jsonb := coalesce(p_prior -> 'settings', '{}'::jsonb);
  v_in_set jsonb := coalesce(p_data -> 'settings', '{}'::jsonb);
  v_prior_prices jsonb := '{}'::jsonb;
  v_buffer numeric; v_included numeric; v_vat numeric; v_requested numeric;
  v_mods jsonb; v_snap_mods jsonb; v_pages numeric; v_billable numeric;
  v_set jsonb; v_snap_set jsonb;
begin
  if p_prior is not null then
    select coalesce(jsonb_object_agg(m ->> 'id', round(app_effective_price(m, v_prior_set), 2)), '{}'::jsonb)
      into v_prior_prices
      from jsonb_array_elements(coalesce(p_prior -> 'modules', '[]'::jsonb)) m;
  end if;

  -- settings that move the price stay as stored (or default on a new quote)
  v_buffer    := coalesce((v_prior_set ->> 'bufferPercent')::numeric, 30);
  v_included  := coalesce((v_prior_set ->> 'retouchesIncludedPerPage')::numeric, 2);
  v_vat       := coalesce((v_prior_set ->> 'vatRate')::numeric, 20);
  v_requested := least(500, greatest(0, round(coalesce((v_in_set ->> 'retouchesRequested')::numeric, 0))));

  -- lines: the grid price (or the price already on the quote for an older custom line); unknown lines are dropped
  select coalesce(jsonb_agg(
           jsonb_set(jsonb_set(m - 'clientPrice' - 'minQuantity', '{basePrice}', to_jsonb(price)),
                     '{quantity}', to_jsonb(qty))
           order by ord), '[]'::jsonb)
    into v_mods
    from (
      select m, ord,
             coalesce((v_prices ->> (m ->> 'id'))::numeric, (v_prior_prices ->> (m ->> 'id'))::numeric) as price,
             least(1000, greatest(0, round(coalesce((m ->> 'quantity')::numeric, 0)))) as qty
        from jsonb_array_elements(coalesce(p_data -> 'modules', '[]'::jsonb)) with ordinality t(m, ord)
    ) s
   where price is not null;

  v_set := jsonb_build_object(
    'mode', 'forfait', 'clientMode', 'forfait', 'tjmSuzali', 0, 'partnerMarginPercent', 0,
    'bufferPercent', v_buffer, 'retouchesIncludedPerPage', v_included, 'retouchUnitPrice', v_retouch,
    'retouchesRequested', v_requested, 'vatRate', v_vat, 'discountPercent', 0);

  -- same rules as buildClientSnapshot (src/utils/quoteData.ts)
  select coalesce(jsonb_agg(
           jsonb_set(m, '{optional}', to_jsonb((m ->> 'id') like 'opt-%')) order by ord), '[]'::jsonb)
    into v_snap_mods
    from jsonb_array_elements(v_mods) with ordinality t(m, ord);

  select coalesce(sum((m ->> 'quantity')::numeric), 0)
    into v_pages
    from jsonb_array_elements(v_mods) m
   where (m ->> 'quantity')::numeric > 0
     and (m ->> 'id') not like 'opt-%' and (m ->> 'id') not like 'inc-%' and (m ->> 'id') <> 'extra-retouches';
  v_billable := greatest(0, v_requested - v_pages * v_included);
  if v_billable > 0 then
    v_snap_mods := v_snap_mods || jsonb_build_array(jsonb_build_object(
      'id', 'extra-retouches', 'name', 'Retouches supplémentaires', 'category', 'content',
      'description', 'Retouches demandées au-delà des ' || (v_pages * v_included)::int || ' incluses (' || v_included::int || ' par page).',
      'includedDetails', '', 'basePrice', v_retouch, 'days', 0, 'quantity', v_billable, 'optional', false));
  end if;

  v_snap_set := jsonb_build_object(
    'mode', 'forfait', 'clientMode', 'forfait', 'tjmSuzali', 0, 'partnerMarginPercent', 0,
    'bufferPercent', v_buffer, 'retouchesIncludedPerPage', v_included,
    'retouchUnitPrice', v_retouch, 'retouchClientPrice', v_retouch, 'retouchesRequested', 0,
    'vatRate', v_vat, 'discountPercent', 0);

  o_total := round(coalesce((
    select sum((m ->> 'basePrice')::numeric * (m ->> 'quantity')::numeric)
      from jsonb_array_elements(v_snap_mods) m), 0), 2);
  o_data := jsonb_build_object(
    'modules', v_mods, 'settings', v_set,
    'metadata', coalesce(p_data -> 'metadata', '{}'::jsonb),
    'clientSnapshot', jsonb_build_object(
      'modules', v_snap_mods, 'settings', v_snap_set, 'metadata', coalesce(p_data -> 'metadata', '{}'::jsonb)));
end $$;

create or replace function app_valid_price_list(p jsonb) returns boolean
language plpgsql immutable as $$
declare r record;
begin
  if p is null or coalesce(jsonb_typeof(p), '') <> 'object' or coalesce(jsonb_typeof(p -> 'prices'), '') <> 'object'
     or coalesce(jsonb_typeof(p -> 'retouchPrice'), '') <> 'number' then
    return false;
  end if;
  if (p ->> 'retouchPrice')::numeric not between 0 and 100000 then return false; end if;
  for r in select key, value from jsonb_each(p -> 'prices') loop
    if length(r.key) > 64 or jsonb_typeof(r.value) <> 'number' or (r.value #>> '{}')::numeric not between 0 and 100000 then
      return false;
    end if;
  end loop;
  return true;
end $$;

-- Account as exposed to staff (partner list) ...
create or replace function app_account_json(a app_accounts) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', a.id, 'role', a.role, 'name', a.name, 'tagline', a.tagline,
    'dailyRate', a.daily_rate, 'contactName', a.contact_name, 'email', a.email,
    'phone', a.phone, 'address', a.address, 'siret', a.siret, 'active', a.active,
    'mustChangePassword', a.must_change_password,
    'managed', a.managed_by is not null,
    'priceList', case when a.managed_by is not null then a.price_list else null end
  )
$$;

-- ... and to the account itself: a client of the reseller never learns the purchase day rate
create or replace function app_self_json(a app_accounts) returns jsonb
language sql immutable as $$
  select case when a.managed_by is null then app_account_json(a)
              else app_account_json(a) || jsonb_build_object('dailyRate', 0) end
$$;

create or replace function app_quote_row_json(q app_quotes, with_data boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ac app_accounts; r jsonb;
begin
  select * into ac from app_accounts where id = q.account_id;
  r := jsonb_build_object(
    'id', q.id, 'reference', q.reference, 'title', q.title,
    'clientName', q.client_name, 'clientEmail', q.client_email,
    'status', q.status, 'totalHt', q.total_ht,
    'accountId', q.account_id, 'accountName', ac.name, 'accountManaged', ac.managed_by is not null,
    'updatedAt', q.updated_at, 'createdAt', q.created_at,
    'signedAt', q.signed_at, 'signedBy', q.signed_by
  );
  if with_data then
    r := r || jsonb_build_object('data', q.data, 'shareToken', q.share_token, 'signature', q.signature);
  end if;
  return r;
end $$;

-- ------------------------------------------------------------------ session --

create or replace function app_login(p_email text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; v_email text; v_token text; v_exp timestamptz;
begin
  v_email := lower(trim(coalesce(p_email, '')));
  delete from app_login_attempts where at < now() - interval '1 day';
  delete from app_sessions where expires_at < now();

  if (select count(*) from app_login_attempts where email = v_email and at > now() - interval '15 minutes') >= 5
     or (select count(*) from app_login_attempts where at > now() - interval '5 minutes') >= 100 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  select * into a from app_accounts where active and v_email <> '' and lower(email) = v_email;
  if not found then
    perform crypt(coalesce(p_password, ''), gen_salt('bf'));   -- same cost whether or not the account exists
    insert into app_login_attempts (email) values (v_email);
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;
  if a.pin_hash <> crypt(coalesce(p_password, ''), a.pin_hash) then
    insert into app_login_attempts (email) values (v_email);
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;

  delete from app_login_attempts where email = v_email;
  v_token := encode(gen_random_bytes(24), 'hex');
  v_exp := now() + interval '12 hours';
  insert into app_sessions (token, account_id, expires_at) values (v_token, a.id, v_exp);
  return jsonb_build_object('ok', true, 'token', v_token, 'expiresAt', v_exp, 'account', app_self_json(a));
end $$;

create or replace function app_session(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; v_exp timestamptz;
begin
  select ac.* into a
    from app_sessions s join app_accounts ac on ac.id = s.account_id
   where s.token = p_token and s.expires_at > now() and ac.active;
  if not found then
    return null;
  end if;
  select expires_at into v_exp from app_sessions where token = p_token;
  return jsonb_build_object('expiresAt', v_exp, 'account', app_self_json(a));
end $$;

create or replace function app_account_update(
  p_token text, p_name text, p_tagline text, p_daily_rate numeric,
  p_contact_name text, p_email text, p_phone text, p_address text, p_siret text
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; v_email text;
begin
  a := app_auth(p_token);
  if coalesce(trim(p_name), '') = '' then raise exception 'name_required'; end if;
  v_email := trim(coalesce(p_email, ''));
  if v_email = '' or position('@' in v_email) < 2 then raise exception 'email_required'; end if;
  if exists (select 1 from app_accounts where lower(email) = lower(v_email) and id <> a.id) then
    raise exception 'email_taken';
  end if;
  update app_accounts set
    name = trim(p_name),
    tagline = coalesce(p_tagline, ''),
    contact_name = coalesce(p_contact_name, ''),
    email = v_email,
    phone = coalesce(p_phone, ''),
    address = coalesce(p_address, ''),
    siret = coalesce(p_siret, ''),
    daily_rate = case
      when a.role in ('owner', 'admin') and p_daily_rate between 0 and 5000 then p_daily_rate
      else daily_rate end
  where id = a.id
  returning * into a;
  return app_self_json(a);
end $$;

-- ----------------------------------------------------------------- partners --
-- A partner created by the reseller (owner) is always one of their clients: prices come from its price list.
-- The admin chooses, per account, between an independent partner and a client of the reseller.

drop function if exists app_partner_save(text, uuid, text, text, numeric, text, text, text, text, text, text, boolean);

create or replace function app_partner_save(
  p_token text, p_id uuid, p_name text, p_tagline text, p_daily_rate numeric,
  p_contact_name text, p_email text, p_phone text, p_address text, p_siret text,
  p_password text, p_active boolean, p_managed boolean, p_price_list jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; t app_accounts; v_email text; v_reseller uuid; v_managed boolean;
begin
  a := app_auth(p_token);
  if a.role not in ('owner', 'admin') then raise exception 'forbidden'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name_required'; end if;
  if p_daily_rate is null or p_daily_rate < 0 or p_daily_rate > 5000 then raise exception 'invalid_rate'; end if;
  if p_price_list is not null and not app_valid_price_list(p_price_list) then raise exception 'invalid_price_list'; end if;

  v_email := trim(coalesce(p_email, ''));
  if v_email = '' or position('@' in v_email) < 2 then raise exception 'email_required'; end if;
  if exists (select 1 from app_accounts where lower(email) = lower(v_email) and id is distinct from p_id) then
    raise exception 'email_taken';
  end if;
  if p_password is not null and (length(p_password) < 10 or length(p_password) > 200) then
    raise exception 'invalid_password_format';
  end if;

  if p_id is null then
    v_managed := a.role = 'owner' or coalesce(p_managed, false);
  else
    select managed_by is not null into v_managed from app_accounts where id = p_id and role = 'partner';
    if not found then raise exception 'not_found'; end if;
    if a.role = 'admin' and p_managed is not null then v_managed := p_managed; end if;
  end if;
  v_reseller := case when not v_managed then null
                     when a.role = 'owner' then a.id
                     else (select id from app_accounts where role = 'owner' order by created_at limit 1) end;
  if v_managed and v_reseller is null then raise exception 'no_reseller'; end if;

  if p_id is null then
    if p_password is null then raise exception 'password_required'; end if;
    if v_managed and p_price_list is null then raise exception 'price_list_required'; end if;
    insert into app_accounts (role, name, tagline, pin_hash, must_change_password, daily_rate, contact_name,
                              email, phone, address, siret, active, managed_by, price_list)
    values ('partner', trim(p_name), coalesce(p_tagline, ''), crypt(p_password, gen_salt('bf')), true, p_daily_rate,
            coalesce(p_contact_name, ''), v_email, coalesce(p_phone, ''),
            coalesce(p_address, ''), coalesce(p_siret, ''), coalesce(p_active, true),
            v_reseller, coalesce(p_price_list, '{}'::jsonb))
    returning * into t;
  else
    update app_accounts set
      name = trim(p_name), tagline = coalesce(p_tagline, ''), daily_rate = p_daily_rate,
      contact_name = coalesce(p_contact_name, ''), email = v_email,
      phone = coalesce(p_phone, ''), address = coalesce(p_address, ''), siret = coalesce(p_siret, ''),
      active = coalesce(p_active, active),
      pin_hash = case when p_password is null then pin_hash else crypt(p_password, gen_salt('bf')) end,
      must_change_password = case when p_password is null then must_change_password else true end,
      managed_by = v_reseller,
      price_list = coalesce(p_price_list, price_list)
    where id = p_id and role = 'partner'
    returning * into t;
    if v_managed and (t.price_list is null or t.price_list = '{}'::jsonb) then raise exception 'price_list_required'; end if;
    if p_active is false or p_password is not null then delete from app_sessions where account_id = p_id; end if;
  end if;
  return app_account_json(t);
end $$;

-- Prices of one client of the reseller (owner or admin)
create or replace function app_partner_prices_save(p_token text, p_id uuid, p_price_list jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; t app_accounts;
begin
  a := app_auth(p_token);
  if a.role not in ('owner', 'admin') then raise exception 'forbidden'; end if;
  if not app_valid_price_list(p_price_list) then raise exception 'invalid_price_list'; end if;
  update app_accounts set price_list = p_price_list
   where id = p_id and role = 'partner' and managed_by is not null
  returning * into t;
  if not found then raise exception 'not_found'; end if;
  return app_account_json(t);
end $$;

-- ------------------------------------------------------------------- quotes --

create or replace function app_quote_get(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; q app_quotes; r jsonb;
begin
  a := app_auth(p_token);
  select * into q from app_quotes where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if not (a.role in ('owner', 'admin') or q.account_id = a.id) then raise exception 'forbidden'; end if;
  r := app_quote_row_json(q, true);
  if a.managed_by is not null then
    r := jsonb_set(r, '{data}', app_quote_mask(q.data));
  end if;
  return r;
end $$;

create or replace function app_quote_save(
  p_token text, p_id uuid, p_title text, p_client_name text, p_client_email text,
  p_status text, p_total_ht numeric, p_data jsonb, p_expected_updated_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; q app_quotes; v_data jsonb; v_total numeric; v_enf record;
begin
  a := app_auth(p_token);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'invalid_data'; end if;

  v_data := p_data;
  v_total := p_total_ht;

  if p_id is null then
    if a.managed_by is not null then
      select * into v_enf from app_quote_enforce(p_data, null, a.price_list);
      v_data := v_enf.o_data; v_total := v_enf.o_total;
    end if;
    insert into app_quotes (account_id, reference, title, client_name, client_email, status, total_ht, data, share_token)
    values (
      a.id,
      'RM-' || extract(year from now())::int || '-' || lpad(nextval('app_quote_seq')::text, 4, '0'),
      coalesce(p_title, ''), coalesce(p_client_name, ''), coalesce(p_client_email, ''),
      case when p_status = 'sent' then 'sent' else 'draft' end,
      coalesce(v_total, 0), v_data, encode(gen_random_bytes(16), 'hex')
    ) returning * into q;
    return jsonb_build_object('ok', true, 'quote', app_quote_row_json(q, true));
  end if;

  select * into q from app_quotes where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if not (a.role in ('owner', 'admin') or q.account_id = a.id) then raise exception 'forbidden'; end if;
  if q.status = 'signed' then raise exception 'locked'; end if;
  if p_expected_updated_at is not null and q.updated_at <> p_expected_updated_at then
    return jsonb_build_object('ok', false, 'conflict', true);
  end if;

  if a.managed_by is not null then
    select * into v_enf from app_quote_enforce(p_data, q.data, a.price_list);
    v_data := v_enf.o_data; v_total := v_enf.o_total;
  end if;

  update app_quotes set
    title = coalesce(p_title, title),
    client_name = coalesce(p_client_name, client_name),
    client_email = coalesce(p_client_email, client_email),
    status = case when p_status in ('draft', 'sent') then p_status else status end,
    total_ht = coalesce(v_total, total_ht),
    data = v_data,
    updated_at = clock_timestamp()
  where id = p_id
  returning * into q;
  return jsonb_build_object('ok', true, 'quote', app_quote_row_json(q, true));
end $$;

-- ------------------------------------------------------------------- grants --

revoke execute on function app_effective_price(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function app_effective_retouche(jsonb) from public, anon, authenticated;
revoke execute on function app_quote_mask(jsonb) from public, anon, authenticated;
revoke execute on function app_quote_enforce(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function app_valid_price_list(jsonb) from public, anon, authenticated;
revoke execute on function app_self_json(app_accounts) from public, anon, authenticated;
revoke execute on function app_account_json(app_accounts) from public, anon, authenticated;
revoke execute on function app_quote_row_json(app_quotes, boolean) from public, anon, authenticated;

grant execute on function
  app_login(text, text), app_session(text),
  app_account_update(text, text, text, numeric, text, text, text, text, text),
  app_partner_save(text, uuid, text, text, numeric, text, text, text, text, text, text, boolean, boolean, jsonb),
  app_partner_prices_save(text, uuid, jsonb),
  app_quote_get(text, uuid),
  app_quote_save(text, uuid, text, text, text, text, numeric, jsonb, timestamptz)
to anon, authenticated;
