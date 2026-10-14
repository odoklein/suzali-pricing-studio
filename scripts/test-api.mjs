// Smoke test of the multi-partner API against the live Supabase project.
// Usage: node --env-file=.env scripts/test-api.mjs   (creates then deactivates its own test data)
// Requires TEST_EMAIL / TEST_PASSWORD in .env: an owner or admin account whose password was already changed.
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const { TEST_EMAIL, TEST_PASSWORD } = process.env;
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('TEST_EMAIL and TEST_PASSWORD are required (owner or admin account).');
  process.exit(1);
}

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const rpc = async (fn, args) => {
  const { data, error } = await sb.rpc(fn, args);
  return { data, error: error?.message };
};

// Raw tables must be closed to anon
for (const table of ['app_accounts', 'quotes', 'quote_modules', 'quote_shares']) {
  const raw = await sb.from(table).select('*');
  assert.ok(raw.error || (raw.data ?? []).length === 0, `${table} must not be readable by anon`);
}

// The PIN-era functions are gone (no PIN oracle, no PIN login)
assert.ok((await rpc('app_change_pin', { p_token: 'x', p_old: '0000', p_new: '0001' })).error, 'app_change_pin must not exist');
assert.ok((await rpc('app_login', { p_pin: '5678' })).error, 'app_login(p_pin) must not exist');

// Login: unknown account and wrong password give the same answer
const unknown = (await rpc('app_login', { p_email: 'nobody@example.invalid', p_password: 'whatever-long' })).data;
assert.deepEqual(unknown, { ok: false, error: 'invalid_credentials' });
const wrong = (await rpc('app_login', { p_email: TEST_EMAIL, p_password: 'definitely-wrong-1' })).data;
assert.deepEqual(wrong, { ok: false, error: 'invalid_credentials' });
const owner = (await rpc('app_login', { p_email: TEST_EMAIL, p_password: TEST_PASSWORD })).data;
assert.equal(owner.ok, true, 'TEST_EMAIL / TEST_PASSWORD must be valid');
assert.ok(['owner', 'admin'].includes(owner.account.role));
assert.ok(!owner.account.mustChangePassword, 'change the temporary password of the test account first');

// Partner creation: temporary password, forced change
const email = `test-${randomBytes(4).toString('hex')}@example.invalid`;
const temp = `Tmp-${randomBytes(6).toString('hex')}`;
const created = await rpc('app_partner_save', {
  p_token: owner.token, p_id: null, p_name: 'TEST Partner', p_tagline: '', p_daily_rate: 160,
  p_contact_name: 'T', p_email: email, p_phone: '', p_address: '', p_siret: '', p_password: temp, p_active: true,
});
assert.ok(!created.error, created.error);
const dup = await rpc('app_partner_save', {
  p_token: owner.token, p_id: null, p_name: 'TEST Dup', p_tagline: '', p_daily_rate: 160,
  p_contact_name: 'T', p_email: email.toUpperCase(), p_phone: '', p_address: '', p_siret: '', p_password: temp, p_active: true,
});
assert.equal(dup.error, 'email_taken');
const short = await rpc('app_partner_save', {
  p_token: owner.token, p_id: null, p_name: 'TEST Short', p_tagline: '', p_daily_rate: 160,
  p_contact_name: 'T', p_email: `x-${email}`, p_phone: '', p_address: '', p_siret: '', p_password: 'short', p_active: true,
});
assert.equal(short.error, 'invalid_password_format');

const first = (await rpc('app_login', { p_email: email, p_password: temp })).data;
assert.equal(first.ok, true);
assert.equal(first.account.mustChangePassword, true);
assert.ok((await rpc('app_quote_list', { p_token: first.token })).error?.includes('password_change_required'));

const password = `Pw-${randomBytes(8).toString('hex')}`;
assert.equal((await rpc('app_change_password', { p_token: first.token, p_old: temp, p_new: 'short' })).data.error, 'invalid_format');
assert.equal((await rpc('app_change_password', { p_token: first.token, p_old: 'nope-nope-nope', p_new: password })).data.error, 'wrong_password');
assert.equal((await rpc('app_change_password', { p_token: first.token, p_old: temp, p_new: password })).data.ok, true);
assert.equal((await rpc('app_login', { p_email: email, p_password: temp })).data.ok, false);
const partner = (await rpc('app_login', { p_email: email, p_password: password })).data;
assert.equal(partner.ok, true);
assert.equal(partner.account.role, 'partner');
assert.ok(!partner.account.mustChangePassword);

// Lockout is per e-mail: 5 failures lock that account only
for (let i = 0; i < 5; i++) await rpc('app_login', { p_email: email, p_password: `wrong-password-${i}` });
assert.equal((await rpc('app_login', { p_email: email, p_password: password })).data.error, 'too_many_attempts');
const stillOk = await rpc('app_login', { p_email: TEST_EMAIL, p_password: TEST_PASSWORD });
assert.equal(stillOk.data.ok, true, 'another account must not be locked out');

const snapshot = {
  modules: [
    { id: 'page-accueil', name: 'Home', basePrice: 100, days: 1, quantity: 1, optional: false },
    { id: 'opt-a', name: 'Opt', basePrice: 50, days: 1, quantity: 0, optional: true },
  ],
  settings: {
    mode: 'forfait', tjmSuzali: 0, partnerMarginPercent: 0, bufferPercent: 30, retouchesIncludedPerPage: 2,
    retouchUnitPrice: 45, retouchesRequested: 0, vatRate: 20, discountPercent: 0,
  },
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
assert.ok(!JSON.stringify(view).includes('discountPercent":10'));
const upd = await rpc('client_quote_update', { p_share_token: q.shareToken, p_quantities: { 'opt-a': 1, 'page-accueil': 0 } });
assert.equal(upd.data.totalHt, 150);
const view2 = (await rpc('client_quote_get', { p_share_token: q.shareToken })).data;
assert.equal(view2.snapshot.modules.find((m) => m.id === 'page-accueil').quantity, 1);

// Isolation: anonymous cannot read
const anon = await rpc('app_quote_get', { p_token: 'nope', p_id: q.id });
assert.ok(anon.error?.includes('unauthorized'));

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

// Cleanup (a signed quote cannot be deleted): deactivate the test partner
const partners = (await rpc('app_partners_list', { p_token: owner.token })).data;
const me = partners.find((p) => p.email === email);
await rpc('app_partner_save', {
  p_token: owner.token, p_id: me.id, p_name: 'TEST Partner (désactivé)', p_tagline: '', p_daily_rate: 160,
  p_contact_name: '', p_email: email, p_phone: '', p_address: '', p_siret: '', p_password: null, p_active: false,
});
await rpc('app_logout', { p_token: owner.token });
console.log('API smoke test passed');
