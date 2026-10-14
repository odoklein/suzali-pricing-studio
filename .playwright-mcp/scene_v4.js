async (page) => {
  const OUT = 'C:/Users/dell/Desktop/pricing/.playwright-mcp/';
  const mk = (id, name, desc, price, days, qty, extra = {}) => ({ id, name, category: 'core', description: desc, includedDetails: desc, basePrice: price, days, quantity: qty, ...extra });
  const modules = [
    mk('page-accueil', "Page d'accueil", "Page d'accueil complète avec sections clés et CTA.", 120, 1.6, 1, { clientPrice: 180 }),
    mk('page-service-modele', 'Page service modèle', 'Création d’un modèle réutilisable pour les pages services.', 100, 1.33, 1),
    mk('page-declinaison-service', 'Déclinaison service', 'Adaptation du modèle pour un service supplémentaire.', 50, 0.67, 1),
    mk('page-statique-simple', 'Page statique simple', 'Page fixe avec texte, images et mise en page simple.', 60, 0.8, 2),
    mk('page-semi-dynamique', 'Page semi-dynamique', 'Page fixe avec blocs administrables ou liens vers pages détail.', 80, 1.07, 2),
    mk('blog-complet', 'Blog complet', 'Page liste du blog + modèle d’article, regroupant les articles ou parutions.', 100, 1.33, 1),
  ];
  const account = { id: 'acc-1', role: 'partner', name: 'Registre 33', tagline: 'Agence web', dailyRate: 200, contactName: 'Jeff Test', email: 'jeff@registre33.test', phone: '', address: 'Lyon', siret: '', active: true, mustChangePassword: false };
  const owner = { ...account, id: 'acc-0', role: 'owner', name: 'Roeum Mak', contactName: 'Roeum Mak', email: 'contact@roeum-mak.fr', tagline: 'Conseil & Développement Web' };
  const data = {
    modules,
    settings: { mode: 'forfait', tjmSuzali: 200, partnerMarginPercent: 0, bufferPercent: 30, retouchesIncludedPerPage: 2, retouchUnitPrice: 45, retouchesRequested: 20, vatRate: 20, discountPercent: 0 },
    metadata: { projectName: 'Refonte site Clémentine', clientCompany: 'Clémentine SAS', clientContact: 'Julien Martin', clientEmail: 'j@clementine.test', clientAddress: 'Paris', partnerCompany: 'Registre 33', partnerTagline: 'Agence web', partnerContact: 'Jeff Test', partnerEmail: 'jeff@registre33.test', partnerPhone: '', partnerAddress: 'Lyon', partnerSiret: '', quoteNumber: '', issueDate: '2026-10-14', validityDays: 30, depositPercentage: 30, notes: '' },
  };
  const sum = (id, ref, title, client, status, total, when) => ({ id, reference: ref, title, clientName: client, clientEmail: '', status, totalHt: total, accountId: 'acc-1', accountName: 'Registre 33', updatedAt: when, createdAt: when, signedAt: status === 'signed' ? when : null, signedBy: status === 'signed' ? client : null });
  const list = [
    sum('q-1', 'RM-2026-0003', 'Refonte site Clémentine', 'Clémentine SAS', 'draft', 930, '2026-10-14T09:00:00Z'),
    sum('q-2', 'RM-2026-0002', 'Site vitrine Atelier Nord', 'Atelier Nord', 'sent', 1480, '2026-10-12T15:00:00Z'),
    sum('q-3', 'RM-2026-0001', 'Blog & pages services', 'Cabinet Aubry', 'signed', 2120, '2026-10-03T11:00:00Z'),
  ];
  const rec = { ...list[0], data, shareToken: 'abcdef0123456789abcdef0123456789', signature: null };
  const partners = [
    { ...account, quoteCount: 6, signedCount: 2 },
    { ...account, id: 'acc-2', name: 'Studio Delta', contactName: 'Mina Roy', email: 'mina@delta.test', dailyRate: 180, quoteCount: 1, signedCount: 0 },
    { ...account, id: 'acc-3', name: 'Nord Digital', contactName: '', email: 'hello@nord.test', dailyRate: 160, quoteCount: 0, signedCount: 0, active: false },
  ];
  const cmod = (id, name, desc, price, days, qty, extra = {}) => ({ id, name, category: 'core', description: desc, includedDetails: desc, basePrice: price, days, quantity: qty, optional: false, ...extra });
  const clientView = { reference: 'RM-2026-0003', title: 'Refonte site Clémentine', status: 'sent', snapshot: {
    modules: [
      cmod('page-accueil', "Page d'accueil", "Page d'accueil complète avec sections clés et CTA.", 180, 1.6, 1),
      cmod('page-service-modele', 'Page service modèle', 'Création d’un modèle réutilisable pour les pages services.', 100, 1.33, 1),
      cmod('page-statique-simple', 'Page statique simple', 'Page fixe avec texte, images et mise en page simple.', 60, 0.8, 2),
      cmod('opt-multilangue', 'Option : version bilingue', 'Déclinaison FR/EN de toutes les pages du site.', 240, 1.5, 0, { optional: true }),
      cmod('opt-blog', 'Option : blog complet', 'Page liste du blog + modèle d’article.', 100, 1.33, 1, { optional: true }),
      cmod('extra-retouches', 'Retouches supplémentaires', 'Retouches demandées au-delà des 8 incluses.', 45, 0, 4),
    ],
    settings: { mode: 'forfait', tjmSuzali: 0, partnerMarginPercent: 0, bufferPercent: 30, retouchesIncludedPerPage: 2, retouchUnitPrice: 45, retouchesRequested: 0, vatRate: 20, discountPercent: 0 },
    metadata: data.metadata },
    issuer: { name: 'Registre 33', tagline: 'Agence web', contactName: 'Jeff Test', email: 'jeff@registre33.test', phone: '', address: 'Lyon', siret: '' },
    signedBy: null, signedAt: null, signature: null, updatedAt: '2026-10-14T10:00:00Z' };
  let acct = owner;
  await page.unroute('**/rest/v1/rpc/*').catch(() => {});
  await page.route('**/rest/v1/rpc/*', async (route) => {
    const fn = route.request().url().split('/rpc/')[1];
    let body = null;
    if (fn === 'app_login') body = { ok: true, token: 'tok', expiresAt: '2030-01-01T00:00:00Z', account: acct };
    else if (fn === 'app_session') body = { expiresAt: '2030-01-01T00:00:00Z', account: acct };
    else if (fn === 'app_quote_list') body = list;
    else if (fn === 'app_quote_get') body = rec;
    else if (fn === 'app_quote_save') body = { ok: true, quote: rec };
    else if (fn === 'app_partners_list') body = partners;
    else if (fn === 'client_quote_get') body = clientView;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const login = async (email) => {
    await page.goto('http://localhost:5199/');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill('un-mot-de-passe-long');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForTimeout(800);
  };
  // 1. forced password change
  acct = { ...account, mustChangePassword: true };
  await page.setViewportSize({ width: 1440, height: 900 });
  await login('jeff@registre33.test');
  await page.screenshot({ path: OUT + 'v4-pwgate.png' });
  // 2. wrong credentials (shake + notice) on mobile dark
  await page.goto('http://localhost:5199/');
  await page.evaluate(() => sessionStorage.clear());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + 'v4-login-mobile-dark.png' });
  await page.emulateMedia({ colorScheme: 'light' });
  // 3. admin editor
  acct = { ...owner, role: 'admin', name: 'Suzali Conseil' };
  await page.setViewportSize({ width: 1440, height: 900 });
  await login('admin@suzali.test');
  await page.getByText('RM-2026-0003').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: OUT + 'v4-admin-editor.png' });
  // 4. partner editor on mobile
  acct = account;
  await page.setViewportSize({ width: 390, height: 844 });
  await login('jeff@registre33.test');
  await page.getByText('RM-2026-0003').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: OUT + 'v4-editor-mobile.png' });
  // 5. client sign overlay
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5199/#/devis/abcdef0123456789abcdef0123456789');
  await page.reload();
  await page.waitForTimeout(900);
  await page.screenshot({ path: OUT + 'v4-client.png' });
  await page.getByRole('button', { name: 'Consulter et signer le devis' }).click();
  await page.waitForTimeout(700);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + 'v4-sign.png' });
  return 'ok';
}