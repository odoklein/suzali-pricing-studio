-- 002 - Self-service profile update (coordinates printed on quotes; daily rate for owner/admin only)

create or replace function app_account_update(
  p_token text, p_name text, p_tagline text, p_daily_rate numeric,
  p_contact_name text, p_email text, p_phone text, p_address text, p_siret text
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare a app_accounts;
begin
  a := app_auth(p_token);
  if coalesce(trim(p_name), '') = '' then raise exception 'name_required'; end if;
  update app_accounts set
    name = trim(p_name),
    tagline = coalesce(p_tagline, ''),
    contact_name = coalesce(p_contact_name, ''),
    email = coalesce(p_email, ''),
    phone = coalesce(p_phone, ''),
    address = coalesce(p_address, ''),
    siret = coalesce(p_siret, ''),
    daily_rate = case
      when a.role in ('owner', 'admin') and p_daily_rate between 0 and 5000 then p_daily_rate
      else daily_rate end
  where id = a.id
  returning * into a;
  return app_account_json(a);
end $$;

grant execute on function app_account_update(text, text, text, numeric, text, text, text, text, text) to anon, authenticated;
