-- ==============================================================================
-- 005 - Password reset by e-mail link, quotes created on behalf of a client, legal profile
--
-- Password reset
-- * app_reset_issue(email) is SERVER-SIDE ONLY (not executable by the public API key):
--   the Netlify function that sends the e-mail calls it with the database connection.
--   It stores only a SHA-256 hash of the token; the clear token exists in the e-mail only.
-- * A token lives 1 hour, works once, and at most 3 are issued per account per hour.
-- * Resetting also signs the account out everywhere and clears its login lockout.
--
-- Quote for a client
-- * The reseller (owner) or the admin can create a quote inside a partner account, so the
--   client finds it in its own space. A client of the reseller gets its price list applied.
--
-- Legal profile
-- * Accounts get legal form, share capital, RCS, VAT number and website, printed on quotes.
-- * The issuer shown to the end client of a client-of-the-reseller quote is the reseller.
--
-- Safe to re-run.
-- ==============================================================================

-- --------------------------------------------------------------- reset tokens --

create table if not exists app_password_resets (
  token_hash  text primary key,
  account_id  uuid not null references app_accounts(id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists app_password_resets_account_idx on app_password_resets (account_id, created_at);

alter table app_password_resets enable row level security;
revoke all on app_password_resets from anon, authenticated;

-- Server side only. Returns { found, throttled, token, name, email }.
create or replace function app_reset_issue(p_email text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; v_email text; v_token text;
begin
  v_email := lower(trim(coalesce(p_email, '')));
  delete from app_password_resets where expires_at < now() - interval '1 day';

  select * into a from app_accounts where active and v_email <> '' and lower(email) = v_email;
  if not found then
    return jsonb_build_object('found', false);
  end if;
  if (select count(*) from app_password_resets where account_id = a.id and created_at > now() - interval '1 hour') >= 3 then
    return jsonb_build_object('found', true, 'throttled', true);
  end if;

  update app_password_resets set used_at = now() where account_id = a.id and used_at is null;
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into app_password_resets (token_hash, account_id, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), a.id, now() + interval '1 hour');
  return jsonb_build_object('found', true, 'throttled', false, 'token', v_token, 'name', a.name, 'email', a.email);
end $$;

-- Is this link still usable? (lets the page say so before asking for a password)
create or replace function app_reset_check(p_token text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select exists (
    select 1 from app_password_resets r join app_accounts a on a.id = r.account_id
     where r.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
       and r.used_at is null and r.expires_at > now() and a.active)
$$;

create or replace function app_reset_password(p_token text, p_new text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r app_password_resets; a app_accounts;
begin
  if p_new is null or length(p_new) < 10 or length(p_new) > 200 then
    return jsonb_build_object('ok', false, 'error', 'invalid_format');
  end if;
  select * into r from app_password_resets
   where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and used_at is null and expires_at > now()
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  select * into a from app_accounts where id = r.account_id and active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  update app_accounts set pin_hash = crypt(p_new, gen_salt('bf')), must_change_password = false where id = a.id;
  update app_password_resets set used_at = now() where account_id = a.id and used_at is null;
  delete from app_sessions where account_id = a.id;
  delete from app_login_attempts where email = lower(a.email);
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function app_reset_issue(text) from public, anon, authenticated;
grant execute on function app_reset_check(text), app_reset_password(text, text) to anon, authenticated;

-- ------------------------------------------------------ quote for a client --

drop function if exists app_quote_save(text, uuid, text, text, text, text, numeric, jsonb, timestamptz);

create or replace function app_quote_save(
  p_token text, p_id uuid, p_title text, p_client_name text, p_client_email text,
  p_status text, p_total_ht numeric, p_data jsonb, p_expected_updated_at timestamptz,
  p_account_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; t app_accounts; q app_quotes; v_data jsonb; v_total numeric; v_enf record;
begin
  a := app_auth(p_token);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'invalid_data'; end if;

  v_data := p_data;
  v_total := p_total_ht;

  if p_id is null then
    -- the quote belongs to the account it is created for: the owner / admin may create it for a partner account
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
    insert into app_quotes (account_id, reference, title, client_name, client_email, status, total_ht, data, share_token)
    values (
      t.id,
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

grant execute on function
  app_quote_save(text, uuid, text, text, text, text, numeric, jsonb, timestamptz, uuid)
to anon, authenticated;

-- ------------------------------------------------------------ legal profile --

alter table app_accounts add column if not exists legal_form    text not null default '';
alter table app_accounts add column if not exists share_capital text not null default '';
alter table app_accounts add column if not exists rcs           text not null default '';
alter table app_accounts add column if not exists vat_number    text not null default '';
alter table app_accounts add column if not exists website       text not null default '';

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
    'vatNumber', a.vat_number, 'website', a.website
  )
$$;

drop function if exists app_account_update(text, text, text, numeric, text, text, text, text, text);

create or replace function app_account_update(
  p_token text, p_name text, p_tagline text, p_daily_rate numeric,
  p_contact_name text, p_email text, p_phone text, p_address text, p_siret text,
  p_legal_form text default '', p_share_capital text default '', p_rcs text default '',
  p_vat_number text default '', p_website text default ''
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
    daily_rate = case
      when a.role in ('owner', 'admin') and p_daily_rate between 0 and 5000 then p_daily_rate
      else daily_rate end
  where id = a.id
  returning * into a;
  return app_self_json(a);
end $$;

grant execute on function
  app_account_update(text, text, text, numeric, text, text, text, text, text, text, text, text, text, text)
to anon, authenticated;

-- Quote seen by the end client. The issuer of a client-of-the-reseller quote is the reseller.
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
      'vatNumber', iss.vat_number, 'website', iss.website),
    'signedBy', q.signed_by, 'signedAt', q.signed_at, 'signature', q.signature,
    'updatedAt', q.updated_at
  );
end $$;
