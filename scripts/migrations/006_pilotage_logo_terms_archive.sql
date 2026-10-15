-- ==============================================================================
-- 006 - Pilotage (sent date, delivery progress, payments), logo, payment terms, archive
--
-- * app_quotes: sent_at (date the quote was sent), delivery_status / started_at / delivered_at
--   (production after signature) and payments (date each instalment was received).
-- * Only the owner and the admin move a quote forward or record a payment, and only once signed.
-- * app_accounts: logo (small image as a data URL), default payment terms / late-payment mentions,
--   archived_at (an archived client keeps its quotes and history, is hidden, and cannot sign in).
-- * app_brand(): the reseller's name and logo, readable before login (login screen).
--
-- Safe to re-run.
-- ==============================================================================

-- ------------------------------------------------------------------ schema --

alter table app_quotes add column if not exists sent_at timestamptz;
alter table app_quotes add column if not exists delivery_status text not null default 'todo';
alter table app_quotes add column if not exists started_at timestamptz;
alter table app_quotes add column if not exists delivered_at timestamptz;
alter table app_quotes add column if not exists payments jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_quotes_delivery_status_check') then
    alter table app_quotes add constraint app_quotes_delivery_status_check
      check (delivery_status in ('todo', 'in_progress', 'delivered'));
  end if;
end $$;

-- quotes already sent before this migration: the best known date
update app_quotes set sent_at = coalesce(signed_at, updated_at) where sent_at is null and status in ('sent', 'signed');

alter table app_accounts add column if not exists logo text;
alter table app_accounts add column if not exists payment_terms text not null default '';
alter table app_accounts add column if not exists late_penalties text not null default '';
alter table app_accounts add column if not exists archived_at timestamptz;

-- ----------------------------------------------------------------- helpers --

-- Delay in working days: same rule as computeQuoteCalculations (days x quantity, plus the safety buffer)
create or replace function app_quote_lead_days(p jsonb) returns numeric
language sql immutable as $$
  select round(
    coalesce(sum((m ->> 'days')::numeric * (m ->> 'quantity')::numeric), 0)
      * (1 + coalesce((p #>> '{clientSnapshot,settings,bufferPercent}')::numeric, 30) / 100), 2)
    from jsonb_array_elements(coalesce(p #> '{clientSnapshot,modules}', '[]'::jsonb)) m
   where coalesce((m ->> 'quantity')::numeric, 0) > 0
$$;

create or replace function app_account_json(a app_accounts) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', a.id, 'role', a.role, 'name', a.name, 'tagline', a.tagline,
    'dailyRate', a.daily_rate, 'contactName', a.contact_name, 'email', a.email,
    'phone', a.phone, 'address', a.address, 'siret', a.siret, 'active', a.active,
    'mustChangePassword', a.must_change_password,
    'managed', a.managed_by is not null,
    'priceList', case when a.managed_by is not null then a.price_list else null end,
    'legalForm', a.legal_form, 'shareCapital', a.share_capital, 'rcs', a.rcs,
    'vatNumber', a.vat_number, 'website', a.website,
    'paymentTerms', a.payment_terms, 'latePenalties', a.late_penalties,
    'archived', a.archived_at is not null, 'hasLogo', coalesce(a.logo, '') <> ''
  )
$$;

-- the account itself also gets its logo (not sent in partner lists)
create or replace function app_self_json(a app_accounts) returns jsonb
language sql immutable as $$
  select (case when a.managed_by is null then app_account_json(a)
               else app_account_json(a) || jsonb_build_object('dailyRate', 0) end)
         || jsonb_build_object('logo', nullif(a.logo, ''))
$$;

create or replace function app_quote_row_json(q app_quotes, with_data boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ac app_accounts; iss app_accounts; r jsonb; v_vat numeric; v_dep numeric;
begin
  select * into ac from app_accounts where id = q.account_id;
  v_vat := coalesce((q.data #>> '{clientSnapshot,settings,vatRate}')::numeric, 20);
  v_dep := coalesce((q.data #>> '{metadata,depositPercentage}')::numeric, 30);
  r := jsonb_build_object(
    'id', q.id, 'reference', q.reference, 'title', q.title,
    'clientName', q.client_name, 'clientEmail', q.client_email,
    'status', q.status, 'totalHt', q.total_ht,
    'accountId', q.account_id, 'accountName', ac.name, 'accountManaged', ac.managed_by is not null,
    'accountArchived', ac.archived_at is not null,
    'updatedAt', q.updated_at, 'createdAt', q.created_at,
    'signedAt', q.signed_at, 'signedBy', q.signed_by,
    'sentAt', q.sent_at, 'deliveryStatus', q.delivery_status,
    'startedAt', q.started_at, 'deliveredAt', q.delivered_at, 'payments', q.payments,
    'leadDays', app_quote_lead_days(q.data), 'vatRate', v_vat, 'depositPercent', v_dep,
    'totalTtc', round(q.total_ht * (1 + v_vat / 100), 2)
  );
  if with_data then
    -- the issuer of a client-of-the-reseller quote is the reseller
    iss := ac;
    if ac.managed_by is not null then
      select * into iss from app_accounts where id = ac.managed_by and active;
      if not found then iss := ac; end if;
    end if;
    r := r || jsonb_build_object('data', q.data, 'shareToken', q.share_token, 'signature', q.signature,
                                 'issuerLogo', nullif(iss.logo, ''));
  end if;
  return r;
end $$;

-- ----------------------------------------------------------- brand and logo --

create or replace function app_brand() returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce((
    select jsonb_build_object('name', name, 'logo', nullif(logo, ''))
      from app_accounts where role = 'owner' and active order by created_at limit 1
  ), '{}'::jsonb)
$$;

-- p_logo: data URL of a small PNG / JPEG / WebP image; null or '' removes it
create or replace function app_logo_save(p_token text, p_logo text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts;
begin
  a := app_auth(p_token);
  if a.managed_by is not null then raise exception 'forbidden'; end if;
  if coalesce(p_logo, '') <> '' and (length(p_logo) > 200000
       or p_logo !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$') then
    raise exception 'invalid_logo';
  end if;
  update app_accounts set logo = nullif(p_logo, '') where id = a.id;
  return true;
end $$;

-- ------------------------------------------------------------- own profile --

drop function if exists app_account_update(text, text, text, numeric, text, text, text, text, text, text, text, text, text, text);

create or replace function app_account_update(
  p_token text, p_name text, p_tagline text, p_daily_rate numeric,
  p_contact_name text, p_email text, p_phone text, p_address text, p_siret text,
  p_legal_form text default '', p_share_capital text default '', p_rcs text default '',
  p_vat_number text default '', p_website text default '',
  p_payment_terms text default null, p_late_penalties text default null
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
    legal_form = left(trim(coalesce(p_legal_form, '')), 80),
    share_capital = left(trim(coalesce(p_share_capital, '')), 80),
    rcs = left(trim(coalesce(p_rcs, '')), 120),
    vat_number = left(trim(coalesce(p_vat_number, '')), 40),
    website = left(trim(coalesce(p_website, '')), 200),
    payment_terms = case when p_payment_terms is null then payment_terms else left(trim(p_payment_terms), 500) end,
    late_penalties = case when p_late_penalties is null then late_penalties else left(trim(p_late_penalties), 1000) end,
    daily_rate = case
      when a.role in ('owner', 'admin') and p_daily_rate between 0 and 5000 then p_daily_rate
      else daily_rate end
  where id = a.id
  returning * into a;
  return app_self_json(a);
end $$;

-- ----------------------------------------------------- quote seen by client --

create or replace function client_quote_get(p_share_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare q app_quotes; ac app_accounts; iss app_accounts;
begin
  select * into q from app_quotes where share_token = p_share_token and status in ('sent', 'signed');
  if not found then return null; end if;
  select * into ac from app_accounts where id = q.account_id;
  iss := ac;
  if ac.managed_by is not null then
    select * into iss from app_accounts where id = ac.managed_by and active;
    if not found then iss := ac; end if;
  end if;
  return jsonb_build_object(
    'reference', q.reference, 'title', q.title, 'status', q.status,
    'snapshot', q.data -> 'clientSnapshot',
    'issuer', jsonb_build_object(
      'name', iss.name, 'tagline', iss.tagline, 'contactName', iss.contact_name,
      'email', iss.email, 'phone', iss.phone, 'address', iss.address, 'siret', iss.siret,
      'legalForm', iss.legal_form, 'shareCapital', iss.share_capital, 'rcs', iss.rcs,
      'vatNumber', iss.vat_number, 'website', iss.website, 'logo', nullif(iss.logo, '')),
    'signedBy', q.signed_by, 'signedAt', q.signed_at, 'signature', q.signature,
    'updatedAt', q.updated_at
  );
end $$;

-- -------------------------------------------------------------------- quotes --

-- same as 005, plus the date the quote was sent
create or replace function app_quote_save(
  p_token text, p_id uuid, p_title text, p_client_name text, p_client_email text,
  p_status text, p_total_ht numeric, p_data jsonb, p_expected_updated_at timestamptz,
  p_account_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; t app_accounts; q app_quotes; v_data jsonb; v_total numeric; v_enf record; v_status text;
begin
  a := app_auth(p_token);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'invalid_data'; end if;

  v_data := p_data;
  v_total := p_total_ht;

  if p_id is null then
    t := a;
    if p_account_id is not null and p_account_id <> a.id then
      if a.role not in ('owner', 'admin') then raise exception 'forbidden'; end if;
      select * into t from app_accounts where id = p_account_id and role = 'partner' and active;
      if not found then raise exception 'not_found'; end if;
    end if;
    if t.managed_by is not null then
      select * into v_enf from app_quote_enforce(p_data, null, t.price_list);
      v_data := v_enf.o_data; v_total := v_enf.o_total;
    end if;
    v_status := case when p_status = 'sent' then 'sent' else 'draft' end;
    insert into app_quotes (account_id, reference, title, client_name, client_email, status, total_ht, data, share_token, sent_at)
    values (
      t.id,
      'RM-' || extract(year from now())::int || '-' || lpad(nextval('app_quote_seq')::text, 4, '0'),
      coalesce(p_title, ''), coalesce(p_client_name, ''), coalesce(p_client_email, ''),
      v_status, coalesce(v_total, 0), v_data, encode(gen_random_bytes(16), 'hex'),
      case when v_status = 'sent' then now() end
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
  v_status := case when p_status in ('draft', 'sent') then p_status else q.status end;

  update app_quotes set
    title = coalesce(p_title, title),
    client_name = coalesce(p_client_name, client_name),
    client_email = coalesce(p_client_email, client_email),
    status = v_status,
    sent_at = case when v_status = 'sent' then coalesce(sent_at, now()) else sent_at end,
    total_ht = coalesce(v_total, total_ht),
    data = v_data,
    updated_at = clock_timestamp()
  where id = p_id
  returning * into q;
  return jsonb_build_object('ok', true, 'quote', app_quote_row_json(q, true));
end $$;

-- Production progress of a signed quote (owner / admin)
create or replace function app_quote_progress_set(p_token text, p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; q app_quotes;
begin
  a := app_auth(p_token);
  if a.role not in ('owner', 'admin') then raise exception 'forbidden'; end if;
  if p_status not in ('todo', 'in_progress', 'delivered') then raise exception 'invalid_status'; end if;
  select * into q from app_quotes where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if q.status <> 'signed' then raise exception 'not_signed'; end if;
  update app_quotes set
    delivery_status = p_status,
    started_at = case when p_status = 'todo' then null else coalesce(started_at, now()) end,
    delivered_at = case when p_status = 'delivered' then now() else null end
  where id = p_id
  returning * into q;
  return app_quote_row_json(q, false);
end $$;

-- Record (or cancel) the reception of one instalment of a signed quote (owner / admin)
create or replace function app_quote_payment_set(p_token text, p_id uuid, p_step text, p_received boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; q app_quotes;
begin
  a := app_auth(p_token);
  if a.role not in ('owner', 'admin') then raise exception 'forbidden'; end if;
  if p_step not in ('order', 'mockups', 'production') then raise exception 'invalid_step'; end if;
  select * into q from app_quotes where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if q.status <> 'signed' then raise exception 'not_signed'; end if;
  update app_quotes set
    payments = case when coalesce(p_received, false)
                    then jsonb_set(payments, array[p_step], to_jsonb(to_char(now(), 'YYYY-MM-DD')))
                    else payments - p_step end
  where id = p_id
  returning * into q;
  return app_quote_row_json(q, false);
end $$;

-- ----------------------------------------------------- deactivate / archive --

-- p_active / p_archived: null keeps the current value. Archiving also deactivates and signs the account out;
-- quotes and history are kept. Restoring leaves the account inactive until reactivated.
create or replace function app_partner_set_state(p_token text, p_id uuid, p_active boolean, p_archived boolean default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; t app_accounts; v_archived boolean; v_active boolean;
begin
  a := app_auth(p_token);
  if a.role not in ('owner', 'admin') then raise exception 'forbidden'; end if;
  select * into t from app_accounts where id = p_id and role = 'partner';
  if not found then raise exception 'not_found'; end if;
  v_archived := coalesce(p_archived, t.archived_at is not null);
  v_active := case when v_archived then false else coalesce(p_active, t.active) end;
  update app_accounts set
    active = v_active,
    archived_at = case when v_archived then coalesce(archived_at, now()) else null end
  where id = p_id
  returning * into t;
  if not v_active then delete from app_sessions where account_id = p_id; end if;
  return app_account_json(t);
end $$;

-- ------------------------------------------------------------------- grants --

revoke execute on function app_quote_lead_days(jsonb) from public, anon, authenticated;
revoke execute on function app_account_json(app_accounts) from public, anon, authenticated;
revoke execute on function app_self_json(app_accounts) from public, anon, authenticated;
revoke execute on function app_quote_row_json(app_quotes, boolean) from public, anon, authenticated;

grant execute on function
  app_brand(),
  app_logo_save(text, text),
  app_account_update(text, text, text, numeric, text, text, text, text, text, text, text, text, text, text, text, text),
  client_quote_get(text),
  app_quote_save(text, uuid, text, text, text, text, numeric, jsonb, timestamptz, uuid),
  app_quote_progress_set(text, uuid, text),
  app_quote_payment_set(text, uuid, text, boolean),
  app_partner_set_state(text, uuid, boolean, boolean)
to anon, authenticated;
