// Netlify Function : envoie le lien de réinitialisation du mot de passe.
// POST /.netlify/functions/request-reset  { "email": "..." }
//
// Variables d'environnement (Netlify) :
//   DATABASE_URL    connexion Postgres (même valeur que pour scripts/migrate-v4.js)
//   RESEND_API_KEY  clé API Resend (https://resend.com)
//   MAIL_FROM       expéditeur vérifié chez Resend, ex. "Roeum Mak <no-reply@votre-domaine.fr>"
//   SITE_URL        (facultatif) adresse publique du site ; à défaut, l'URL principale Netlify
//
// La réponse est toujours la même, que l'adresse existe ou non : on ne révèle jamais quels comptes existent.

import pg from 'pg';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function buildMail({ name, link }) {
  const subject = 'Réinitialisation de votre mot de passe';
  const text =
    `Bonjour ${name},\n\n` +
    `Vous avez demandé à réinitialiser votre mot de passe. Ouvrez ce lien pour en choisir un nouveau (valable 1 heure, une seule utilisation) :\n\n${link}\n\n` +
    `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.`;
  const html =
    `<p>Bonjour ${escapeHtml(name)},</p>` +
    `<p>Vous avez demandé à réinitialiser votre mot de passe. Le lien ci-dessous est valable 1 heure et ne sert qu'une fois.</p>` +
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Choisir un nouveau mot de passe</a></p>` +
    `<p style="color:#666;font-size:13px">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>${escapeHtml(link)}</p>` +
    `<p style="color:#666;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.</p>`;
  return { subject, text, html };
}

/** Dépendances injectées pour pouvoir tester sans base ni service d'e-mail */
export function createHandler({ issue, sendMail, siteUrl }) {
  return async (req) => {
    if (req.method !== 'POST') return json(405, { ok: false });
    let email;
    try {
      ({ email } = await req.json());
    } catch {
      return json(400, { ok: false });
    }
    if (typeof email !== 'string' || email.length > 254 || !email.includes('@')) return json(400, { ok: false });

    try {
      const res = await issue(email);
      if (res?.found && !res.throttled && res.token) {
        const link = `${siteUrl().replace(/\/+$/, '')}/#/reset/${res.token}`;
        await sendMail({ to: res.email, ...buildMail({ name: res.name, link }) });
      }
    } catch (err) {
      // le détail reste dans les journaux Netlify ; l'appelant ne voit jamais la différence
      console.error('request-reset failed:', err instanceof Error ? err.message : err);
      return json(500, { ok: false });
    }
    return json(200, { ok: true });
  };
}

async function issueFromDatabase(email) {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  try {
    const { rows } = await client.query('select app_reset_issue($1) as r', [email]);
    return rows[0].r;
  } finally {
    await client.end();
  }
}

async function sendWithResend({ to, subject, text, html }) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) throw new Error('RESEND_API_KEY / MAIL_FROM manquants');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}

export default createHandler({
  issue: issueFromDatabase,
  sendMail: sendWithResend,
  siteUrl: () => process.env.SITE_URL || process.env.URL || '',
});
