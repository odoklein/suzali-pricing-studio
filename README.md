# Suzali Conseil — Pricing Studio

Application web de chiffrage et de génération de devis, avec trois espaces : régie (admin), partenaires (revendeurs) et client final.

Déployable sur **Netlify** (`pricing.suzali-conseil.com`). Toute la logique métier côté serveur passe par des fonctions Postgres (`SECURITY DEFINER`) appelées via Supabase ; les tables sont fermées à la clé publique.

---

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Supabase (Postgres + fonctions RPC)

---

## Grille tarifaire

La grille de référence se trouve dans `src/data/initialModules.ts` (tableau Clémentine) : un prix d'achat par type de page, la charge en jours étant déduite du prix (prix ÷ 75 €/j).

| Livrable | Prix d'achat HT |
| :--- | :---: |
| Page d'accueil | 120 € |
| Page service modèle | 100 € |
| Déclinaison service | 50 € |
| Page statique simple | 60 € |
| Page semi-dynamique | 80 € |
| Blog complet | 100 € |

Règles (cadre Amine) :

- **Délai** = charge totale en jours + 30 % de marge de sécurité.
- **Retouches** : 2 incluses par page ; chaque retouche supplémentaire demandée est facturée 45 €, sans délai en plus.
- Le **partenaire** voit son prix d'achat et saisit son prix client pour chaque ligne. Il n'y a ni marge ni remise à régler.
- Le **client** ne voit que les prix de vente, le nombre de jours et le délai (jamais le prix d'achat ni la marge).

### Clients du revendeur (Roeum)

Un compte partenaire peut être un **client du revendeur** (`managed_by` = compte revendeur) :

- Le revendeur fixe, **pour chaque client**, une grille de prix HT par livrable et par retouche en plus (écran *Clients* → *Tarifs*). Une nouvelle grille part du modèle du devis RM-2026-0013 (`src/data/priceModel.ts`).
- Le client ne voit **jamais le prix d'achat** ni le tarif journalier, et **ne fixe aucun prix** : son devis applique sa grille, une seule colonne « Prix HT », lecture seule.
- C'est le serveur qui l'impose : à chaque enregistrement, les prix, la TVA, les retouches incluses et le total sont recalculés depuis la grille (`app_quote_enforce`), et à la lecture les anciens prix d'achat sont masqués (`app_quote_mask`).
- Les comptes créés par le revendeur sont toujours des clients ; la régie choisit, compte par compte, entre *Partenaire* (fixe ses prix, voit son prix d'achat) et *Client du revendeur*.
- Une modification de grille s'applique aux prochains enregistrements de devis non signés du client.

### Mot de passe oublié

- « Mot de passe oublié ? » sur l'écran de connexion envoie un lien (`#/reset/<jeton>`) par e-mail. Le lien est valable 1 heure, ne sert qu'une fois, et 3 demandes par compte et par heure au maximum.
- La réponse est identique que l'adresse existe ou non. Seule une empreinte du jeton est stockée ; changer le mot de passe déconnecte tous les appareils et débloque le compte.
- L'envoi passe par la fonction Netlify `netlify/functions/request-reset.mjs` (e-mail via [Resend](https://resend.com)). Variables à définir dans Netlify : `DATABASE_URL`, `RESEND_API_KEY`, `MAIL_FROM` (expéditeur vérifié chez Resend) et, si besoin, `SITE_URL`.
- En local (`npm run dev`) la fonction n'existe pas : utiliser `netlify dev` pour tester l'envoi.

### Devis pour un client

« Nouveau devis » (revendeur et régie) demande d'abord le client : un client existant (le devis est créé dans son espace, avec sa grille de prix et ses coordonnées), un nouveau client (compte créé avec un mot de passe provisoire) ou aucun client. Pour un client du revendeur, l'émetteur affiché au client final est le revendeur.

### Mes informations

Chaque compte renseigne sa société, ses mentions légales (forme juridique, capital, SIRET, RCS, TVA intracommunautaire) et ses contacts : ils sont imprimés sur ses devis suivants.

### Pilotage (revendeur et régie)

- **Pilotage** : CA signé par mois, devis à relancer (envoyés depuis plus de 7 jours), encaissements restants, devis en réalisation, taux de signature par client. Exports CSV (devis, clients) au format Excel français.
- **Suivi après signature** (dans le devis signé) : réalisation (à démarrer, en cours, livré) avec la date de livraison prévue = début + délai du devis en jours ouvrés ; échéances (à la commande, maquettes, mise en production) marquées reçues. Le client du revendeur peut les consulter, sans les modifier.
- **Clients** : désactiver (accès coupé, historique conservé) ou archiver (masqué, restaurable).
- **Logo** (Mes informations) : sur les devis, l'espace client et l'écran de connexion (celui du revendeur). Image PNG, JPEG ou WebP, réduite à 480 × 160 px.
- **Conditions de paiement, pénalités de retard et mentions complémentaires** : valeurs par défaut par compte (Mes informations), modifiables devis par devis ; à défaut, les textes légaux standard.

---

## Accès

- Les comptes (admin, owner, partenaires) se connectent avec **e-mail + mot de passe** (10 caractères minimum).
- Les échecs de connexion sont limités par e-mail (5 échecs en 15 minutes) et par un plafond global.
- Un compte créé ou migré doit changer son mot de passe à la première connexion.
- Le client accède à son devis par un lien privé (`#/devis/<jeton>`) de 128 bits, sans mot de passe.

---

## Base de données

Les migrations sont dans `scripts/migrations/` et s'appliquent dans l'ordre :

1. `001_multi_partner.sql` : comptes, sessions, devis, espace client.
2. `002_account_update.sql` : mise à jour du profil.
3. `003_email_password_auth.sql` : connexion e-mail + mot de passe, suppression de l’ancienne connexion par code, fermeture des tables héritées (sans suppression de données). Le nouveau front doit être déployé juste après.
4. `004_reseller_price_lists.sql` : clients du revendeur et grille de prix par client (voir ci-dessous). À appliquer en même temps que le nouveau front.
5. `005_reset_client_quote_legal_profile.sql` : réinitialisation du mot de passe par e-mail, devis créé au nom d'un client, mentions légales du compte. Le nouveau front doit être déployé en même temps.
6. `006_pilotage_logo_terms_archive.sql` : date d'envoi, suivi de réalisation et d'encaissement, logo, conditions de paiement, archivage des clients. À appliquer en même temps que le nouveau front.

---

## Commandes

```bash
npm install      # dépendances
npm run dev      # développement (Vite)
npm run build    # typage + build de production
npm run lint     # linter
node --env-file=.env scripts/test-api.mjs   # test de bout en bout des fonctions RPC
```

Variables d'environnement : voir `.env.example` (`TEST_EMAIL` et `TEST_PASSWORD` pour le test de bout en bout).
