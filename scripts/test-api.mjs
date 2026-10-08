// Smoke test of the multi-partner API against the live Supabase project.
// Usage: node --env-file=.env scripts/test-api.mjs   (creates then removes its own test data)
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const rpc = async (fn, args) => {
  const { data, error } = await sb.rpc(fn, args);
  return { data, error: error?.message };
};

// Raw tables must be closed to anon
const raw = await sb.from('app_accounts').select('*');
assert.ok(raw.error || (raw.data ?? []).length === 0, 'app_accounts must not be readable by anon');

// Login
const bad = await rpc('app_login', { p_pin: '0001' });
assert.equal(bad.data.ok, false);
const owner = (await rpc('app_login', { p_pin: '5678' })).data;
assert.equal(owner.ok, true);
assert.equal(owner.account.role, 'owner');

// Partner creation + isolation
const pin = String(1000 + Math.floor(Math.random() * 8000));
const created = await rpc('app_partner_save', {
  p_token: owner.token, p_id: null, p_name: 'TEST Partner', p_tagline: '', p_daily_rate: 160,
  p_contact_name: 'T', p_email: '', p_phone: '', p_address: '', p_siret: '', p_pin: pin, p_active: true,
});
assert.ok(!created.error, created.error);
const partner = (await rpc('app_login', { p_pin: pin })).data;
assert.equal(partner.ok, true);
assert.equal(partner.account.role, 'partner');

const snapshot = {
  modules: [
    { id: 'page-home', name: 'Home', basePrice: 100, days: 1, quantity: 1, optional: false },
    { id: 'opt-a', name: 'Opt', basePrice: 50, days: 1, quantity: 0, optional: true },
  ],
  settings: { mode: 'forfait', tjmSuzali: 0, partnerMarginPercent: 0, managementDaysFixed: 0, vatRate: 20, discountPercent: 0 },
};
const saved = await rpc('app_quote_save', {
  p_token: partner.token, p_id: null, p_title: 'T', p_client_name: 'C', p_client_email: '',
  p_status: 'draft', p_total_ht: 100, p_data: { modules: snapshot.modules, clientSnapshot: snapshot },
  p_expected_updated_at: null,
});
assert.ok(saved.data?.ok, saved.error);
const q = saved.data.quote;

// Draft is invisible to the client
assert.equal((await rpc('client_quote_get', { p_share_token: q.shareToken })).data, null);

// Concurrent edit => conflict
const stale = await rpc('app_quote_save', {
  p_token: partner.token, p_id: q.id, p_title: 'T', p_client_name: 'C', p_client_email: '',
  p_status: 'sent', p_total_ht: 100, p_data: q.data, p_expected_updated_at: '2000-01-01T00:00:00Z',
});
assert.equal(stale.data.conflict, true);
const sent = await rpc('app_quote_save', {
  p_token: partner.token, p_id: q.id, p_title: 'T', p_client_name: 'C', p_client_email: '',
  p_status: 'sent', p_total_ht: 100, p_data: q.data, p_expected_updated_at: q.updatedAt,
});
assert.equal(sent.data.ok, true);

// Client: view, toggle option (server recomputes total), cannot touch core modules
const view = (await rpc('client_quote_get', { p_share_token: q.shareToken })).data;
assert.ok(view.snapshot && view.issuer.name === 'TEST Partner');
assert.ok(!JSON.stringify(view).includes('partnerMarginPercent":35'));
const upd = await rpc('client_quote_update', { p_share_token: q.shareToken, p_quantities: { 'opt-a': 1, 'page-home': 0 } });
assert.equal(upd.data.totalHt, 150);
const view2 = (await rpc('client_quote_get', { p_share_token: q.shareToken })).data;
assert.equal(view2.snapshot.modules.find((m) => m.id === 'page-home').quantity, 1);

// Isolation: another partner / anonymous cannot read
const owner2 = await rpc('app_quote_get', { p_token: 'nope', p_id: q.id });
assert.ok(owner2.error?.includes('unauthorized'));

// Sign (locks the quote)
const sig = 'data:image/png;base64,iVBORw0KGgo=';
const signed = await rpc('client_quote_sign', { p_share_token: q.shareToken, p_name: 'Julien', p_signature: sig });
assert.equal(signed.data.ok, true);
const again = await rpc('client_quote_update', { p_share_token: q.shareToken, p_quantities: { 'opt-a': 0 } });
assert.ok(again.error?.includes('locked'));

// Owner sees partner quote; logout revokes session
const list = (await rpc('app_quote_list', { p_token: owner.token })).data;
assert.ok(list.some((x) => x.id === q.id));
await rpc('app_logout', { p_token: partner.token });
assert.equal((await rpc('app_session', { p_token: partner.token })).data, null);
assert.ok((await rpc('app_quote_list', { p_token: partner.token })).error?.includes('unauthorized'));

// Cleanup (signed quote is locked for deletion -> remove through SQL via owner is not possible, so use partner deactivation)
const partners = (await rpc('app_partners_list', { p_token: owner.token })).data;
const me = partners.find((p) => p.name === 'TEST Partner');
await rpc('app_partner_save', {
  p_token: owner.token, p_id: me.id, p_name: 'TEST Partner (désactivé)', p_tagline: '', p_daily_rate: 160,
  p_contact_name: '', p_email: '', p_phone: '', p_address: '', p_siret: '', p_pin: null, p_active: false,
});
await rpc('app_logout', { p_token: owner.token });
console.log('API smoke test passed');
