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
