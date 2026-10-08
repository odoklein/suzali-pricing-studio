import React, { useState } from 'react';
import { 
  X, 
  Database, 
  ShieldCheck, 
  Globe, 
  Server, 
  CheckCircle,
  Copy,
  Terminal
} from 'lucide-react';

interface ArchitectureModalProps {
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'rbac' | 'sql' | 'dns'>('rbac');
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlSchema = `-- ==============================================================================
-- SUZALI CONSEIL - PRICING STUDIO POSTGRESQL SCHEMA (SUPABASE / AWS RDS)
-- Multi-Tenant RBAC Architecture: Suzali Conseil <-> Agences <-> Clients Finaux
-- ==============================================================================

-- 1. EXTENSIONS & TYPES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role_enum AS ENUM ('suzali_admin', 'partner_agency', 'end_client');
CREATE TYPE pricing_mode_enum AS ENUM ('forfait', 'tjm');
CREATE TYPE quote_status_enum AS ENUM ('draft', 'sent_to_partner', 'sent_to_client', 'approved', 'rejected');

-- 2. ORGANIZATIONS (Suzali, Partenaires ex: 33 Degrés, Clients ex: Bières Georges)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'provider', 'agency', 'client'
    siret VARCHAR(14),
    vat_number VARCHAR(20),
    contact_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USERS & PROFILES WITH RBAC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role_enum NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MASTER QUOTES ("DE VIE")
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number VARCHAR(50) UNIQUE NOT NULL, -- ex: SZ-2026-BG-642
    provider_org_id UUID REFERENCES organizations(id) NOT NULL, -- Suzali
    partner_org_id UUID REFERENCES organizations(id),          -- 33 Degrés
    client_org_id UUID REFERENCES organizations(id) NOT NULL,   -- Bières Georges
    project_name VARCHAR(255) NOT NULL,
    pricing_mode pricing_mode_enum DEFAULT 'forfait',
    tjm_suzali NUMERIC(10, 2) DEFAULT 175.00,
    partner_margin_percent NUMERIC(5, 2) DEFAULT 35.00,
    management_days_fixed NUMERIC(5, 2) DEFAULT 1.50,
    vat_rate NUMERIC(5, 2) DEFAULT 20.00,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    status quote_status_enum DEFAULT 'draft',
    validity_days INT DEFAULT 30,
    deposit_percentage INT DEFAULT 30,
    signed_by VARCHAR(255),
    signed_at TIMESTAMP WITH TIME ZONE,
    signature_data_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. QUOTE LINE ITEMS / MODULES (Pages, Store Locator, Custom Modules)
CREATE TABLE quote_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    module_code VARCHAR(100) NOT NULL,
    module_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    included_details TEXT NOT NULL, -- Verrouillage contractuel du périmètre
    base_price_ht NUMERIC(10, 2) NOT NULL, -- Coût de base Suzali (ex: 50.00 pour Store locator)
    days_estimate NUMERIC(5, 2) NOT NULL,  -- Charge en jours (ex: 0.35j)
    quantity INT DEFAULT 1,
    is_custom BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0
);

-- 6. AUDIT LOGS & TIME-TRACKING (Governance contre les dérives réelles)
CREATE TABLE quote_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'INITIAL_ESTIMATE_642', 'SCOPE_EXPANSION_MENU_V2', 'APPROVAL'
    drift_reason TEXT,            -- Ex: '4 vagues de retours, refonte V2 carte de bar'
    logged_days_real NUMERIC(5, 2), -- Ex: 14.75j réels
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. SECURE TOKENIZED SHARES
CREATE TABLE quote_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    recipient_role user_role_enum NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    access_count INT DEFAULT 0
);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_modules ENABLE ROW LEVEL SECURITY;

-- Les clients finaux ne peuvent voir que les devis qui leur sont assignés
CREATE POLICY client_view_quote ON quotes
    FOR SELECT TO authenticated
    USING (client_org_id = auth.jwt()->>'org_id');

-- Règle stricte: masquer les colonnes de marge et coût interne aux clients
-- Géré via les vues sécurisées SQL ou les fonctions edge API`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                Architecture Système, RBAC & Déploiement Netlify
              </h3>
              <p className="text-xs text-slate-500">
                Spécifications techniques du Suzali Conseil Pricing Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('rbac')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'rbac'
                ? 'border-emerald-800 text-emerald-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Matrice de Rôles RBAC</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'sql'
                ? 'border-emerald-800 text-emerald-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Schéma SQL BDD (PostgreSQL)</span>
          </button>

          <button
            onClick={() => setActiveTab('dns')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'dns'
                ? 'border-emerald-800 text-emerald-950 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>DNS & Déploiement Netlify</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          
          {/* TAB 1: RBAC */}
          {activeTab === 'rbac' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  Matrice de Contrôle d'Accès Basée sur les Rôles (RBAC)
                </h4>
                <p className="text-slate-500 leading-relaxed">
                  L'application cloisonne strictement les informations financières et stratégiques entre les 3 intervenants du cycle de vente.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold">
                      <th className="py-2.5 px-3">Fonctionnalité / Donnée</th>
                      <th className="py-2.5 px-3 text-center">Suzali Admin</th>
                      <th className="py-2.5 px-3 text-center">Agence Partenaire (33°)</th>
                      <th className="py-2.5 px-3 text-center">Client Final (Bières Georges)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Coûts de production internes Suzali (€ HT)</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">Lecture / Écriture</td>
                      <td className="py-2.5 px-3 text-center text-indigo-700 font-semibold">Lecture seule (Prix d'achat)</td>
                      <td className="py-2.5 px-3 text-center text-rose-600 font-bold">Masqué (Strictement confidentiel)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Charge en jours ouvrés de dév (jours)</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">Lecture / Écriture</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">Lecture (Délai global)</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">Lecture (Délai global estimé)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Marge commerciale partenaire (%)</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">Lecture seule</td>
                      <td className="py-2.5 px-3 text-center text-indigo-700 font-bold">Éditable librement</td>
                      <td className="py-2.5 px-3 text-center text-rose-600 font-bold">Masqué (Total consolidé)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Sélection des pages & steppers quantité</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700">Oui</td>
                      <td className="py-2.5 px-3 text-center text-indigo-700">Oui</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">Oui (Configuration directe)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Édition du descriptif 'Inclus au devis'</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700">Oui</td>
                      <td className="py-2.5 px-3 text-center text-indigo-700">Oui</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">Oui (Personnalisation accordée)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium">Signature électronique du devis A4</td>
                      <td className="py-2.5 px-3 text-center text-slate-400">Consultation</td>
                      <td className="py-2.5 px-3 text-center text-slate-400">Consultation</td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">Signature officielle client</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 leading-relaxed">
                <span className="font-bold block mb-1">Gouvernance Suzali Conseil :</span>
                Le passage en vue client (`#client-view`) supprime toute fuite de marge d'agence ou de coût de fabrication Suzali, garantissant la confiance tripartite et la fluidité des négociations.
              </div>
            </div>
          )}

          {/* TAB 2: SQL SCHEMA */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Schéma de Base de Données Relationnelle PostgreSQL
                  </h4>
                  <p className="text-slate-500">
                    Tables, types énumérés, clés étrangères et politiques RLS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center space-x-1.5 font-semibold"
                >
                  {copiedSql ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copié !' : 'Copier le script SQL'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 max-h-96">
                  {sqlSchema}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: DNS & NETLIFY */}
          {activeTab === 'dns' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  Déploiement Continu sur Netlify & DNS Custom Domain
                </h4>
                <p className="text-slate-500">
                  Configuration requise pour pointer le sous-domaine officiel <code className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">pricing.suzali-conseil.com</code>
                </p>
              </div>

              {/* DNS Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold">
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Nom d'Hôte</th>
                      <th className="py-2 px-3">Valeur Cible (Target)</th>
                      <th className="py-2 px-3">TTL</th>
                      <th className="py-2 px-3">Statut SSL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="divide-y divide-slate-100 font-mono">
                      <td className="py-2.5 px-3 font-bold text-emerald-700">CNAME</td>
                      <td className="py-2.5 px-3 text-slate-900 font-bold">pricing</td>
                      <td className="py-2.5 px-3 text-slate-700">suzali-pricing-studio.netlify.app</td>
                      <td className="py-2.5 px-3 text-slate-500">3600 (Auto)</td>
                      <td className="py-2.5 px-3 text-emerald-700 font-sans font-semibold">Let's Encrypt Auto (TLS 1.3)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Netlify Config snippet */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Fichier netlify.toml (Inclus à la racine du projet) :</span>
                </span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800">
{`[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"`}
                </pre>
              </div>

              <div className="flex items-center space-x-2 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Le projet dispose déjà du fichier <code>_redirects</code> et de la configuration pour un déploiement 0-downtime à chaque commit Git.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
