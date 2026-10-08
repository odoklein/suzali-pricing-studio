-- ==============================================================================
-- 001 - Multi-partner platform: accounts, server-side sessions, shared quotes
-- Additive only (legacy tables quotes / quote_modules are untouched).
-- All access goes through SECURITY DEFINER functions: tables are closed to anon.
-- ==============================================================================

create extension if not exists pgcrypto with schema extensions;

create sequence if not exists app_quote_seq;

create table if not exists app_accounts (
  id            uuid primary key default gen_random_uuid(),
  role          text not null check (role in ('admin', 'owner', 'partner')),
  name          text not null,
  tagline       text not null default '',
  pin_hash      text not null,
  daily_rate    numeric(8, 2) not null default 175,
  contact_name  text not null default '',
  email         text not null default '',
  phone         text not null default '',
  address       text not null default '',
  siret         text not null default '',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists app_sessions (
  token       text primary key,
  account_id  uuid not null references app_accounts(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create table if not exists app_login_attempts (
  id  bigserial primary key,
  at  timestamptz not null default now()
);

create table if not exists app_quotes (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references app_accounts(id),
  reference     text not null unique,
  title         text not null default '',
  client_name   text not null default '',
  client_email  text not null default '',
  status        text not null default 'draft' check (status in ('draft', 'sent', 'signed')),
  total_ht      numeric(12, 2) not null default 0,
  data          jsonb not null,
  share_token   text not null unique,
  signed_by     text,
  signed_at     timestamptz,
  signature     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists app_quotes_account_idx on app_quotes(account_id);

alter table app_accounts       enable row level security;
alter table app_sessions       enable row level security;
alter table app_login_attempts enable row level security;
alter table app_quotes         enable row level security;
revoke all on app_accounts, app_sessions, app_login_attempts, app_quotes from anon, authenticated;

-- ------------------------------------------------------------------ helpers --

create or replace function app_account_json(a app_accounts) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', a.id, 'role', a.role, 'name', a.name, 'tagline', a.tagline,
    'dailyRate', a.daily_rate, 'contactName', a.contact_name, 'email', a.email,
    'phone', a.phone, 'address', a.address, 'siret', a.siret, 'active', a.active
  )
$$;

create or replace function app_auth(p_token text) returns app_accounts
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts;
begin
  select ac.* into a
    from app_sessions s join app_accounts ac on ac.id = s.account_id
   where s.token = p_token and s.expires_at > now() and ac.active;
  if not found then
    raise exception 'unauthorized';
  end if;
  return a;
end $$;

create or replace function app_quote_row_json(q app_quotes, with_data boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ac app_accounts; r jsonb;
begin
  select * into ac from app_accounts where id = q.account_id;
  r := jsonb_build_object(
    'id', q.id, 'reference', q.reference, 'title', q.title,
    'clientName', q.client_name, 'clientEmail', q.client_email,
    'status', q.status, 'totalHt', q.total_ht,
    'accountId', q.account_id, 'accountName', ac.name,
    'updatedAt', q.updated_at, 'createdAt', q.created_at,
    'signedAt', q.signed_at, 'signedBy', q.signed_by
  );
  if with_data then
    r := r || jsonb_build_object('data', q.data, 'shareToken', q.share_token, 'signature', q.signature);
  end if;
  return r;
end $$;

-- ------------------------------------------------------------------ session --

create or replace function app_login(p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; v_token text; v_exp timestamptz;
begin
  delete from app_login_attempts where at < now() - interval '1 day';
  delete from app_sessions where expires_at < now();

  if (select count(*) from app_login_attempts where at > now() - interval '5 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  select * into a from app_accounts
   where active and pin_hash = crypt(coalesce(p_pin, ''), pin_hash)
   limit 1;
  if not found then
    insert into app_login_attempts default values;
    return jsonb_build_object('ok', false, 'error', 'invalid_pin');
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_exp := now() + interval '12 hours';
  insert into app_sessions (token, account_id, expires_at) values (v_token, a.id, v_exp);
  return jsonb_build_object('ok', true, 'token', v_token, 'expiresAt', v_exp, 'account', app_account_json(a));
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
  return jsonb_build_object('expiresAt', v_exp, 'account', app_account_json(a));
end $$;

create or replace function app_logout(p_token text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from app_sessions where token = p_token;
  return true;
end $$;

create or replace function app_change_pin(p_token text, p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts;
begin
  a := app_auth(p_token);
  if p_new is null or p_new !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_format');
  end if;
  if a.pin_hash <> crypt(coalesce(p_old, ''), a.pin_hash) then
    insert into app_login_attempts default values;
    return jsonb_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  if exists (select 1 from app_accounts where id <> a.id and pin_hash = crypt(p_new, pin_hash)) then
    insert into app_login_attempts default values;
    return jsonb_build_object('ok', false, 'error', 'pin_unavailable');
  end if;
  update app_accounts set pin_hash = crypt(p_new, gen_salt('bf')) where id = a.id;
  return jsonb_build_object('ok', true);
end $$;

-- ----------------------------------------------------------------- partners --

create or replace function app_partners_list(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts;
begin
  a := app_auth(p_token);
  if a.role not in ('owner', 'admin') then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(
      app_account_json(ac) || jsonb_build_object(
        'quoteCount', (select count(*) from app_quotes q where q.account_id = ac.id),
        'signedCount', (select count(*) from app_quotes q where q.account_id = ac.id and q.status = 'signed')
      ) order by ac.created_at)
    from app_accounts ac where ac.role = 'partner'
  ), '[]'::jsonb);
end $$;

create or replace function app_partner_save(
  p_token text, p_id uuid, p_name text, p_tagline text, p_daily_rate numeric,
  p_contact_name text, p_email text, p_phone text, p_address text, p_siret text,
  p_pin text, p_active boolean
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; t app_accounts;
begin
  a := app_auth(p_token);
  if a.role not in ('owner', 'admin') then raise exception 'forbidden'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name_required'; end if;
  if p_daily_rate is null or p_daily_rate < 0 or p_daily_rate > 5000 then raise exception 'invalid_rate'; end if;
  if p_pin is not null and p_pin !~ '^[0-9]{4}$' then raise exception 'invalid_pin_format'; end if;
  if p_pin is not null and exists (
       select 1 from app_accounts where id is distinct from p_id and pin_hash = crypt(p_pin, pin_hash)
     ) then
    raise exception 'pin_unavailable';
  end if;

  if p_id is null then
    if p_pin is null then raise exception 'pin_required'; end if;
    insert into app_accounts (role, name, tagline, pin_hash, daily_rate, contact_name, email, phone, address, siret, active)
    values ('partner', trim(p_name), coalesce(p_tagline, ''), crypt(p_pin, gen_salt('bf')), p_daily_rate,
            coalesce(p_contact_name, ''), coalesce(p_email, ''), coalesce(p_phone, ''),
            coalesce(p_address, ''), coalesce(p_siret, ''), coalesce(p_active, true))
    returning * into t;
  else
    update app_accounts set
      name = trim(p_name), tagline = coalesce(p_tagline, ''), daily_rate = p_daily_rate,
      contact_name = coalesce(p_contact_name, ''), email = coalesce(p_email, ''),
      phone = coalesce(p_phone, ''), address = coalesce(p_address, ''), siret = coalesce(p_siret, ''),
      active = coalesce(p_active, active),
      pin_hash = case when p_pin is null then pin_hash else crypt(p_pin, gen_salt('bf')) end
    where id = p_id and role = 'partner'
    returning * into t;
    if not found then raise exception 'not_found'; end if;
    if p_active is false then delete from app_sessions where account_id = p_id; end if;
  end if;
  return app_account_json(t);
end $$;

-- ------------------------------------------------------------------- quotes --

create or replace function app_quote_list(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts;
begin
  a := app_auth(p_token);
  return coalesce((
    select jsonb_agg(app_quote_row_json(q, false) order by q.updated_at desc)
      from app_quotes q
     where a.role in ('owner', 'admin') or q.account_id = a.id
  ), '[]'::jsonb);
end $$;

create or replace function app_quote_get(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; q app_quotes;
begin
  a := app_auth(p_token);
  select * into q from app_quotes where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if not (a.role in ('owner', 'admin') or q.account_id = a.id) then raise exception 'forbidden'; end if;
  return app_quote_row_json(q, true);
end $$;

create or replace function app_quote_save(
  p_token text, p_id uuid, p_title text, p_client_name text, p_client_email text,
  p_status text, p_total_ht numeric, p_data jsonb, p_expected_updated_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; q app_quotes;
begin
  a := app_auth(p_token);
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'invalid_data'; end if;

  if p_id is null then
    insert into app_quotes (account_id, reference, title, client_name, client_email, status, total_ht, data, share_token)
    values (
      a.id,
      'RM-' || extract(year from now())::int || '-' || lpad(nextval('app_quote_seq')::text, 4, '0'),
      coalesce(p_title, ''), coalesce(p_client_name, ''), coalesce(p_client_email, ''),
      case when p_status = 'sent' then 'sent' else 'draft' end,
      coalesce(p_total_ht, 0), p_data, encode(gen_random_bytes(16), 'hex')
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

  update app_quotes set
    title = coalesce(p_title, title),
    client_name = coalesce(p_client_name, client_name),
    client_email = coalesce(p_client_email, client_email),
    status = case when p_status in ('draft', 'sent') then p_status else status end,
    total_ht = coalesce(p_total_ht, total_ht),
    data = p_data,
    updated_at = clock_timestamp()
  where id = p_id
  returning * into q;
  return jsonb_build_object('ok', true, 'quote', app_quote_row_json(q, true));
end $$;

create or replace function app_quote_delete(p_token text, p_id uuid) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts; q app_quotes;
begin
  a := app_auth(p_token);
  select * into q from app_quotes where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if q.status = 'signed' then raise exception 'locked'; end if;
  if not (a.role in ('owner', 'admin') or (q.account_id = a.id and q.status = 'draft')) then
    raise exception 'forbidden';
  end if;
  delete from app_quotes where id = p_id;
  return true;
end $$;

-- ------------------------------------------- client (share token, no login) --

create or replace function client_quote_get(p_share_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare q app_quotes; ac app_accounts;
begin
  select * into q from app_quotes where share_token = p_share_token and status in ('sent', 'signed');
  if not found then return null; end if;
  select * into ac from app_accounts where id = q.account_id;
  return jsonb_build_object(
    'reference', q.reference, 'title', q.title, 'status', q.status,
    'snapshot', q.data -> 'clientSnapshot',
    'issuer', jsonb_build_object(
      'name', ac.name, 'tagline', ac.tagline, 'contactName', ac.contact_name,
      'email', ac.email, 'phone', ac.phone, 'address', ac.address, 'siret', ac.siret),
    'signedBy', q.signed_by, 'signedAt', q.signed_at, 'signature', q.signature,
    'updatedAt', q.updated_at
  );
end $$;

create or replace function client_quote_update(p_share_token text, p_quantities jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  q app_quotes; snap jsonb; allowed jsonb; snap_mods jsonb; data_mods jsonb;
  v_sum numeric; v_total numeric;
begin
  select * into q from app_quotes where share_token = p_share_token and status in ('sent', 'signed') for update;
  if not found then raise exception 'not_found'; end if;
  if q.status = 'signed' then raise exception 'locked'; end if;
  if p_quantities is null or jsonb_typeof(p_quantities) <> 'object' then raise exception 'invalid_data'; end if;

  snap := q.data -> 'clientSnapshot';

  -- only optional modules, quantity clamped to 0/1
  select coalesce(jsonb_object_agg(m ->> 'id', least(1, greatest(0, (p_quantities ->> (m ->> 'id'))::int))), '{}'::jsonb)
    into allowed
    from jsonb_array_elements(snap -> 'modules') m
   where coalesce((m ->> 'optional')::boolean, false) and p_quantities ? (m ->> 'id');

  select jsonb_agg(case when allowed ? (m ->> 'id') then jsonb_set(m, '{quantity}', allowed -> (m ->> 'id')) else m end order by ord)
    into snap_mods from jsonb_array_elements(snap -> 'modules') with ordinality as t(m, ord);
  select jsonb_agg(case when allowed ? (m ->> 'id') then jsonb_set(m, '{quantity}', allowed -> (m ->> 'id')) else m end order by ord)
    into data_mods from jsonb_array_elements(q.data -> 'modules') with ordinality as t(m, ord);

  select coalesce(sum((m ->> 'basePrice')::numeric * (m ->> 'quantity')::numeric), 0)
    into v_sum from jsonb_array_elements(snap_mods) m;
  v_total := round(v_sum * (1 - coalesce((snap -> 'settings' ->> 'discountPercent')::numeric, 0) / 100), 2);

  update app_quotes set
    data = jsonb_set(jsonb_set(q.data, '{clientSnapshot,modules}', snap_mods), '{modules}', coalesce(data_mods, q.data -> 'modules')),
    total_ht = v_total,
    updated_at = clock_timestamp()
  where id = q.id
  returning * into q;
  return jsonb_build_object('ok', true, 'totalHt', q.total_ht, 'updatedAt', q.updated_at);
end $$;

create or replace function client_quote_sign(p_share_token text, p_name text, p_signature text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare q app_quotes;
begin
  select * into q from app_quotes where share_token = p_share_token and status in ('sent', 'signed') for update;
  if not found then raise exception 'not_found'; end if;
  if q.status = 'signed' then raise exception 'locked'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name_required'; end if;
  if p_signature is null or p_signature not like 'data:image/png;base64,%' or length(p_signature) > 400000 then
    raise exception 'invalid_signature';
  end if;
  update app_quotes set
    status = 'signed', signed_by = trim(p_name), signed_at = now(), signature = p_signature,
    updated_at = clock_timestamp()
  where id = q.id
  returning * into q;
  return jsonb_build_object('ok', true, 'signedAt', q.signed_at);
end $$;

-- ------------------------------------------------------------------- grants --

revoke execute on function app_account_json(app_accounts) from public, anon, authenticated;
revoke execute on function app_auth(text) from public, anon, authenticated;
revoke execute on function app_quote_row_json(app_quotes, boolean) from public, anon, authenticated;

grant execute on function
  app_login(text), app_session(text), app_logout(text), app_change_pin(text, text, text),
  app_partners_list(text),
  app_partner_save(text, uuid, text, text, numeric, text, text, text, text, text, text, boolean),
  app_quote_list(text), app_quote_get(text, uuid),
  app_quote_save(text, uuid, text, text, text, text, numeric, jsonb, timestamptz),
  app_quote_delete(text, uuid),
  client_quote_get(text), client_quote_update(text, jsonb), client_quote_sign(text, text, text)
to anon, authenticated;

-- -------------------------------------------------------------------- seeds --
-- Initial PINs are the ones already in use: change them from the app (Mon compte).

insert into app_accounts (role, name, tagline, pin_hash, daily_rate, contact_name, email)
select 'owner', 'Roeum Mak', 'Conseil & Développement Web', crypt('5678', gen_salt('bf')), 200, 'Roeum Mak', 'contact@roeum-mak.fr'
where not exists (select 1 from app_accounts where role = 'owner');

insert into app_accounts (role, name, tagline, pin_hash, daily_rate, contact_name, email)
select 'admin', 'Suzali Conseil', 'Régie technique', crypt('9999', gen_salt('bf')), 175, 'Odo', 'contact@suzali-conseil.com'
where not exists (select 1 from app_accounts where role = 'admin');
