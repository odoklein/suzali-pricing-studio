import React, { useState, useEffect, useMemo } from 'react';
import type { UserRole, PageModule, ClientMetadata, PricingSettings } from './types/quote';
import { initialModules, initialMetadata, initialSettings } from './data/initialModules';
import { computeQuoteCalculations } from './utils/formatters';
import { saveQuoteToSupabase, fetchQuoteFromSupabase } from './lib/supabase';

// Components
import { Header } from './components/layout/Header';
import { MetricCards } from './components/configurator/MetricCards';
import { ConfigControls } from './components/configurator/ConfigControls';
import { PageTable } from './components/configurator/PageTable';
import { DevisOfficialA4 } from './components/pdf/DevisOfficialA4';
import { ShareModal } from './components/share/ShareModal';
import { ArchitectureModal } from './components/architecture/ArchitectureModal';
import { BieresGeorgesExplainerModal } from './components/case-study/BieresGeorgesExplainerModal';
import { PortalSelectorModal } from './components/portal/PortalSelectorModal';
import { PortalGate } from './components/portal/PortalGate';

import { 
  Printer,
  ArrowRight,
  ShieldCheck,
  Handshake,
  UserCheck,
  Database,
  Check,
  RefreshCw,
  LogOut
} from 'lucide-react';

const STORAGE_KEY_MODULES = 'suzali_pricing_modules_v3';
const STORAGE_KEY_SETTINGS = 'suzali_pricing_settings_v3';
const STORAGE_KEY_METADATA = 'suzali_pricing_metadata_v3';
const STORAGE_KEY_ROLE = 'suzali_pricing_role_v3';
const STORAGE_KEY_AUTH = 'suzali_pricing_auth_v3';

export const App: React.FC = () => {
  // Authentication & PIN gate state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = sessionStorage.getItem(STORAGE_KEY_AUTH);
      if (savedAuth === 'true') return true;
    }
    return false;
  });
  // 1. Detect role from URL hash or localStorage
  const detectInitialRole = (): UserRole => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('client')) return 'client';
      if (hash.includes('partner')) return 'partner';
      if (hash.includes('admin')) return 'admin';
      
      const savedRole = localStorage.getItem(STORAGE_KEY_ROLE) as UserRole | null;
      if (savedRole && ['admin', 'partner', 'client'].includes(savedRole)) {
        return savedRole;
      }
    }
    return 'admin';
  };

  const [currentRole, setCurrentRole] = useState<UserRole>(detectInitialRole);

  // 2. State with localStorage persistence
  const [modules, setModules] = useState<PageModule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MODULES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return initialModules;
  });

  const [settings, setSettings] = useState<PricingSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return initialSettings;
  });

  const [metadata, setMetadata] = useState<ClientMetadata>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_METADATA);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return initialMetadata;
  });

  // Modal visibility states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [isCaseStudyModalOpen, setIsCaseStudyModalOpen] = useState(false);
  const [isPortalSelectorOpen, setIsPortalSelectorOpen] = useState(false);
  const [showFullA4View, setShowFullA4View] = useState(false);

  // Supabase live sync state
  const [isSyncingWithDb, setIsSyncingWithDb] = useState(false);
  const [dbSyncToast, setDbSyncToast] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODULES, JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(metadata));
  }, [metadata]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROLE, currentRole);
  }, [currentRole]);

  // Try to load initial quote data from Supabase if available
  useEffect(() => {
    async function initSupabaseData() {
      const remoteData = await fetchQuoteFromSupabase('SZ-2026-BG-642');
      if (remoteData?.quote && remoteData?.modules && remoteData.modules.length > 0) {
        // If remote has modules, we can map them
        console.log('Synchronisé avec la base Supabase PostgreSQL:', remoteData.quote.quote_number);
      }
    }
    initSupabaseData();
  }, []);

  // Listen for hashchange in URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('client')) setCurrentRole('client');
      else if (hash.includes('partner')) setCurrentRole('partner');
      else if (hash.includes('admin')) setCurrentRole('admin');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Centralized reactive calculations
  const calculations = useMemo(() => {
    return computeQuoteCalculations(modules, settings);
  }, [modules, settings]);

  // Handlers
  const handleUnlockPortal = (role: UserRole) => {
    setCurrentRole(role);
    setIsAuthenticated(true);
    sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
    if (role === 'client') {
      window.location.hash = 'client-view';
    } else if (role === 'partner') {
      window.location.hash = 'partner-view';
    } else {
      window.location.hash = 'admin-view';
    }
  };

  const handleLockPortal = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(STORAGE_KEY_AUTH);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === 'client') {
      window.location.hash = 'client-view';
    } else if (newRole === 'partner') {
      window.location.hash = 'partner-view';
    } else {
      window.location.hash = 'admin-view';
    }
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, quantity: newQuantity } : m))
    );
  };

  const handleUpdateIncluded = (id: string, newIncluded: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, includedDetails: newIncluded } : m))
    );
  };

  const handleUpdateBasePrice = (id: string, newPrice: number) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, basePrice: newPrice } : m))
    );
  };

  const handleUpdateDays = (id: string, newDays: number) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, days: newDays } : m))
    );
  };

  const handleAddCustomModule = (
    name: string,
    description: string,
    included: string,
    price: number,
    days: number
  ) => {
    const newMod: PageModule = {
      id: 'custom-' + Date.now(),
      name,
      category: 'interactive',
      description,
      includedDetails: included,
      basePrice: price,
      days,
      quantity: 1,
      isCustom: true,
    };
    setModules((prev) => [...prev, newMod]);
  };

  const handleDeleteModule = (id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateSettings = (newSettings: Partial<PricingSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleUpdateMetadata = (newMetadata: Partial<ClientMetadata>) => {
    setMetadata((prev) => ({ ...prev, ...newMetadata }));
  };

  // Sync state to live Supabase DB
  const handleSyncToSupabase = async () => {
    setIsSyncingWithDb(true);
    setDbSyncToast('Enregistrement sur Supabase PostgreSQL...');
    const result = await saveQuoteToSupabase(metadata, settings, modules);
    setIsSyncingWithDb(false);
    if (result.success) {
      setDbSyncToast('✅ Données enregistrées avec succès sur Supabase BDD !');
      setTimeout(() => setDbSyncToast(null), 3000);
    } else {
      setDbSyncToast('❌ Erreur: ' + result.error);
      setTimeout(() => setDbSyncToast(null), 4000);
    }
  };

  // Reset to initial baseline (Base 642 € HT Bières Georges)
  const handleReset = () => {
    if (window.confirm('Réinitialiser la configuration à la base Bières Georges (642 € HT / 5,15 j) ?')) {
      setModules(initialModules);
      setSettings(initialSettings);
      setMetadata(initialMetadata);
      localStorage.removeItem(STORAGE_KEY_MODULES);
      localStorage.removeItem(STORAGE_KEY_SETTINGS);
      localStorage.removeItem(STORAGE_KEY_METADATA);
    }
  };

  const handleApplyBase642 = () => {
    setModules(initialModules);
    setSettings(initialSettings);
    setMetadata(initialMetadata);
  };

  const handlePrint = () => {
    window.print();
  };

  // If not authenticated, display the PortalGate PIN screen
  if (!isAuthenticated) {
    return <PortalGate onUnlock={handleUnlockPortal} />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-emerald-100 selection:text-emerald-950 font-sans">
      
      {/* Printable Proforma A4 component: rendered during window.print() */}
      <div className="print-only">
        <DevisOfficialA4
          modules={modules}
          metadata={metadata}
          settings={settings}
          calculations={calculations}
        />
      </div>

      {/* Screen Interface */}
      {showFullA4View ? (
        <div className="no-print">
          <DevisOfficialA4
            modules={modules}
            metadata={metadata}
            settings={settings}
            calculations={calculations}
            onClose={() => setShowFullA4View(false)}
          />
        </div>
      ) : (
        <div className="no-print">
          {/* Header */}
          <Header
            currentRole={currentRole}
            onRoleChange={handleRoleChange}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            onOpenArchitectureModal={() => setIsArchitectureModalOpen(true)}
            onOpenCaseStudyModal={() => setIsCaseStudyModalOpen(true)}
            onOpenPortalSelector={() => setIsPortalSelectorOpen(true)}
            onReset={handleReset}
            onPrint={handlePrint}
            onLock={handleLockPortal}
            quoteNumber={metadata.quoteNumber}
          />

          {/* Main Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            
            {/* ROLE-SPECIFIC WELCOME & CONTEXT HERO BANNER */}
            {currentRole === 'client' ? (
              <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-yellow-950 text-white p-6 rounded-2xl mb-8 border border-amber-800/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                      PORTAIL CLIENT PRIVÉ
                    </span>
                    <span className="text-xs text-amber-200">
                      Réf: {metadata.quoteNumber} • {metadata.clientCompany}
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                    Bonjour Julien. Voici votre proposition de chiffrage par jalons.
                  </h2>
                  <p className="text-xs text-amber-200/90 max-w-2xl leading-relaxed">
                    Découvrez ci-dessous le socle de base de votre site (592 € HT), le module de géolocalisation Store Locator (total 642 € HT), et les options à la carte. Aucun frais masqué, les descriptifs inclus sont verrouillés et contractuels.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullA4View(true)}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center space-x-2 transition-all active:scale-95"
                >
                  <UserCheck className="w-4 h-4 text-slate-900" />
                  <span>Consulter & Signer le Devis</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
                </button>
              </div>
            ) : currentRole === 'partner' ? (
              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl mb-8 border border-indigo-800/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500 text-white font-mono">
                      ESPACE PARTENAIRE • ROEUM MAK
                    </span>
                    <span className="text-xs text-indigo-200">
                      Dossier Client : {metadata.clientCompany}
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                    Gouvernance Tarifaire & Marge Commerciale
                  </h2>
                  <p className="text-xs text-indigo-200/90 max-w-2xl leading-relaxed">
                    Suzali produit la prestation sur la base technique. Ajustez votre marge commerciale ci-dessous pour fixer votre prix de vente final à Julien, puis générez son lien d'accès sécurisé (#client-view).
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSyncToSupabase}
                    disabled={isSyncingWithDb}
                    className="px-3.5 py-2 bg-indigo-800 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center space-x-1.5 transition-all"
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-300" />
                    <span>{isSyncingWithDb ? 'Sauvegarde...' : 'Sauvegarder BDD'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center space-x-2 transition-all active:scale-95"
                  >
                    <Handshake className="w-4 h-4" />
                    <span>Transmettre au Client</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-emerald-950 via-slate-950 to-green-950 text-white p-6 rounded-2xl mb-8 border border-emerald-800/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 font-mono">
                      CONSOLE TECHNIQUE SUZALI
                    </span>
                    <span className="text-xs text-emerald-300">
                      Équipe : Odo, Anaïs, Hichem, Chahinez
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-900/80 text-emerald-300 rounded font-mono border border-emerald-700/60">
                      PostgreSQL 17 Connecté
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                    Matrice de Production & Verrouillage des Dérives
                  </h2>
                  <p className="text-xs text-emerald-200/90 max-w-2xl leading-relaxed">
                    Cas d'école Bières Georges : base ferme à 642 € HT (5,15 j avec gestion/socle). Spécifiez précisément les livrables inclus ci-dessous pour bloquer toute contestation ultérieure.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncToSupabase}
                    disabled={isSyncingWithDb}
                    className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center space-x-1.5 transition-all"
                  >
                    {isSyncingWithDb ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-300 animate-spin" />
                    ) : (
                      <Database className="w-3.5 h-3.5 text-emerald-300" />
                    )}
                    <span>{isSyncingWithDb ? 'Sauvegarde...' : 'Sauvegarder BDD'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCaseStudyModalOpen(true)}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center space-x-1.5 transition-all"
                  >
                    <span>Audit Dérives (14,75 j)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsArchitectureModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center space-x-1.5 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Schéma SQL & DNS</span>
                  </button>
                </div>
              </div>
            )}

            {/* Live DB Sync notification toast banner */}
            {dbSyncToast && (
              <div className="mb-4 p-3 bg-slate-900 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2 border border-slate-700 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{dbSyncToast}</span>
              </div>
            )}

            {/* 4 Metric Cards (Role-tailored) */}
            <MetricCards
              currentRole={currentRole}
              calculations={calculations}
              settings={settings}
            />

            {/* Config & Meta Controls (Adapted: Client never sees internal margins) */}
            <ConfigControls
              currentRole={currentRole}
              settings={settings}
              metadata={metadata}
              onUpdateSettings={handleUpdateSettings}
              onUpdateMetadata={handleUpdateMetadata}
            />

            {/* Main Interactive Modules Table (Phased into 3 steps) */}
            <PageTable
              modules={modules}
              currentRole={currentRole}
              settings={settings}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateIncluded={handleUpdateIncluded}
              onUpdateBasePrice={handleUpdateBasePrice}
              onUpdateDays={handleUpdateDays}
              onAddCustomModule={handleAddCustomModule}
              onDeleteModule={handleDeleteModule}
            />

            {/* Quick Actions Footer Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h4 className="font-bold text-slate-900 text-sm">
                  {currentRole === 'client' 
                    ? 'Prêt à lancer la réalisation de votre site ?' 
                    : 'Prêt pour la validation contractuelle tripartite ?'}
                </h4>
                <p className="text-xs text-slate-500">
                  {currentRole === 'client'
                    ? 'Téléchargez votre devis officiel A4 avec échéancier 30/40/30 et apposez votre signature.'
                    : 'Générez le devis proforma officiel conforme avec descriptifs inclus verrouillés et signature.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFullA4View(true)}
                  className="px-4 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  Aperçu Document A4
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2 bg-emerald-950 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow-xs flex items-center space-x-2 transition-all active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Télécharger / Imprimer en PDF</span>
                </button>
              </div>
            </div>

          </main>

          {/* Minimalist Professional Footer */}
          <footer className="border-t border-slate-100 py-6 mt-12 bg-white text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                  SZ
                </div>
                <span className="font-medium text-slate-700">
                  Suzali Conseil Pricing Studio
                </span>
                <span className="text-slate-300">|</span>
                <span>Odo • Anaïs • Hichem • Chahinez</span>
              </div>
              <div className="flex items-center space-x-4 text-[11px]">
                <button
                  onClick={() => setIsArchitectureModalOpen(true)}
                  className="hover:text-slate-900 transition-colors"
                >
                  Schéma SQL & Netlify
                </button>
                <button
                  onClick={() => setIsCaseStudyModalOpen(true)}
                  className="hover:text-slate-900 transition-colors font-semibold text-amber-800"
                >
                  Cas Bières Georges (642 €)
                </button>
                <button
                  onClick={() => setIsPortalSelectorOpen(true)}
                  className="hover:text-slate-900 transition-colors text-indigo-700 font-medium"
                >
                  Changer de portail
                </button>
                <button
                  onClick={handleLockPortal}
                  className="hover:text-rose-700 transition-colors text-slate-500 flex items-center space-x-1"
                  title="Verrouiller la session et revenir à l'écran de code"
                >
                  <LogOut className="w-3 h-3 text-slate-400" />
                  <span>Verrouiller</span>
                </button>
                <span className="text-slate-400">
                  Base Supabase connectée (eu-west-2)
                </span>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* MODALS */}
      {isShareModalOpen && (
        <ShareModal
          metadata={metadata}
          calculations={calculations}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {isArchitectureModalOpen && (
        <ArchitectureModal onClose={() => setIsArchitectureModalOpen(false)} />
      )}

      {isCaseStudyModalOpen && (
        <BieresGeorgesExplainerModal
          onClose={() => setIsCaseStudyModalOpen(false)}
          onApplyBase642={handleApplyBase642}
        />
      )}

      {isPortalSelectorOpen && (
        <PortalSelectorModal
          currentRole={currentRole}
          onSelectRole={handleRoleChange}
          onClose={() => setIsPortalSelectorOpen(false)}
        />
      )}

    </div>
  );
};

export default App;
