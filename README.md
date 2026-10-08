# 🌿 Suzali Conseil — Pricing Studio & Gouvernance Tarifaire

Application web modulaire de chiffrage haute précision, de gouvernance des coûts et de génération de devis ("de vie") contractuels tripartites (Suzali Conseil ↔ Agence Partenaire 33 Degrés ↔ Client Final Bières Georges).

Déployable instantanément sur **Netlify** (`pricing.suzali-conseil.com`).

---

## 🚀 Stack Technique & Performance
- **Framework** : React 19 + TypeScript + Vite 8
- **Styles** : Tailwind CSS v4 (`@tailwindcss/vite`)
- **Typographie** : Google Font **Sora** (`letter-spacing: -0.038em`) pour les titrages et interfaces épurées, **JetBrains Mono** pour les valeurs monétaires, charges en jours et tokens de session.
- **Thème Visuel** : **White Minimalist Épuré (Anti-AI Slop)** — Fond blanc `#FFFFFF`, micro-bordures subtiles `#E2E8F0`, texte ardoise `#0F172A`, et vert forêt signature Suzali `#14532D` / `#166534`.
- **Rôles & RBAC** : Isolation stricte de l'information entre prestataire technique, agence revendeuse et client final.
- **Export PDF / Impression** : Moteur `@media print` A4 proforma conforme aux normes françaises de facturation (échéancier 30/40/30, mentions légales Loi Évin/Code de commerce, signature électronique tactile/souris).

---

## 📊 Le Cas d'École Réel (Projet Bières Georges)
| Jalon / Version | Montant HT | Charge (Jours) | Détail & Explication |
| :--- | :---: | :---: | :--- |
| **Tableau 1 Odo (Initial)** | **592,00 € HT** | **3,65 j** | 8 pages de base sans module Store Locator |
| **Base Validée Suzali** | **642,00 € HT** | **5,15 j** | 8 pages (592 €) + Store Locator (50 €) + 1,5 j de socle/gestion |
| **Réalité Terrain Constatée** | **1 991,00 € HT** | **14,75 j** | Dérive due aux 4 vagues d'allers-retours, refonte V2 de la carte, vidéos 4K et silences client |

### Dispositif de Verrouillage Contractuel
1. **Champ "Inclus au devis" éditable et opposable** : description précise des limites fonctionnelles de chaque page.
2. **Plafond strict de 2 vagues de retours** : toute demande ultérieure déclenche un avenant chiffré au TJM.
3. **Transparence tripartite sans fuite de marge** : le sous-traitant (33 Degrés) ajuste son taux de marge (+35%) sans que le client ne voie les coûts de revient internes Suzali.

---

## 🛡️ Modèle RBAC & Vues Hash d'URL
- **`#admin-view` (👑 Suzali Admin - Odo, Anaïs, Hichem, Chahinez)** :
  - Pilotage des coûts unitaires de production, des TJM (€/j) et des jours estimés.
  - Accès au modal d'architecture technique (Schéma PostgreSQL, DNS Netlify).
- **`#partner-view` (🤝 Agence Partenaire - 33 Degrés)** :
  - Visualisation du coût d'achat Suzali.
  - Réglage de la marge commerciale d'agence (% ou montant).
  - Génération de liens de partage tokenisés pour ses clients.
- **`#client-view` (👤 Client Final - Julien / Bières Georges)** :
  - Vue épurée sans aucune mention de marge ou de coût de revient.
  - Sélection des modules et pages avec steppers de quantité.
  - Édition des notes et spécifications.
  - Signature électronique du devis A4 proforma.

---

## 🗄️ Schéma SQL Relationnel (PostgreSQL / Supabase)
Le script SQL complet est accessible directement depuis le modal **Architecture** de l'application et comprend :
- `organizations` : Suzali, Partenaires et Clients
- `users` : Utilisateurs typés avec rôles RBAC
- `quotes` : Devis maîtres avec statuts (`draft`, `sent_to_client`, `approved`)
- `quote_modules` : Livrables, prix de base, jours et descriptif "Inclus"
- `quote_audit_logs` : Journal d'audit et suivi des dérives de temps réels
- `quote_shares` : Tokens d'accès sécurisés avec expiration
- Politiques **Row Level Security (RLS)** actives

---

## 🌐 Déploiement Netlify (`pricing.suzali-conseil.com`)
1. **Configuration DNS** :
   ```text
   Type   : CNAME
   Hôte   : pricing
   Valeur : suzali-pricing-studio.netlify.app
   TTL    : 3600 (Auto)
   SSL    : Let's Encrypt TLS 1.3
   ```
2. **Fichiers inclus** :
   - `public/_redirects` : Redirection SPA `/*  /index.html  200`
   - `netlify.toml` : Build command `npm run build`, headers de sécurité (CSP, nosniff, frame-options).

---

## 🛠️ Commandes Locales
```bash
# Installation des dépendances
npm install

# Lancement en développement (Vite HMR)
npm run dev

# Vérification du typage et build de production
npm run build

# Prévisualisation du bundle de production
npm run preview

# Linter ultra-rapide
npm run lint
```
