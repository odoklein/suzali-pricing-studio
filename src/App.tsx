import React, { useState, useEffect, useMemo } from 'react';
import type { UserRole, PageModule, ClientMetadata, PricingSettings } from './types/quote';
import { initialModules, initialMetadata, initialSettings } from './data/initialModules';
import { computeQuoteCalculations, displayQuoteNumber } from './utils/formatters';
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
import { ClientQuoteView } from './components/client/ClientQuoteView';
import { PartnerPricingPanel } from './components/partner/PartnerPricingPanel';

import { 
  Printer,
  ShieldCheck,
  Handshake,
  Database,
  Check,
  RefreshCw,
  LogOut
} from 'lucide-react';

const STORAGE_KEY_MODULES = 'suzali_pricing_modules_v3';
const STORAGE_KEY_SETTINGS = 'suzali_pricing_settings_v3';
const STORAGE_KEY_METADATA = 'suzali_pricing_metadata_v3';
const STORAGE_KEY_AUTH = 'suzali_pricing_auth_v3';

export const App: React.FC = () => {
  // Authentication & PIN gate state: the session remembers WHICH portal was unlocked,
  // so editing the URL hash can never open another portal.
  const [authRole, setAuthRole] = useState<UserRole | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_AUTH);
      if (saved === 'client' || saved === 'partner' || saved === 'admin') return saved;
    } catch {
      // ignore
    }
    return null;
  });
  const isAuthenticated = authRole !== null;
  const [currentRole, setCurrentRole] = useState<UserRole>(authRole ?? 'client');

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
      if (saved) {
        const parsed = { ...initialMetadata, ...JSON.parse(saved) } as ClientMetadata;
        // Anciennes données : aucune trace de la marque interne côté devis
        if (/suzali/i.test(parsed.partnerEmail)) parsed.partnerEmail = initialMetadata.partnerEmail;
        if (/Partenaire Commercial/i.test(parsed.partnerCompany)) parsed.partnerCompany = initialMetadata.partnerCompany;
        return parsed;
      }
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

  // Centralized reactive calculations
  const calculations = useMemo(() => {
    return computeQuoteCalculations(modules, settings);
  }, [modules, settings]);

  // Handlers
  const grantRole = (role: UserRole) => {
    setCurrentRole(role);
    setAuthRole(role);
    try {
      sessionStorage.setItem(STORAGE_KEY_AUTH, role);
    } catch {
      // ignore
    }
    window.location.hash = role === 'client' ? 'client-view' : role === 'partner' ? 'partner-view' : 'admin-view';
  };

  const handleUnlockPortal = grantRole;
  const handleRoleChange = grantRole;

  const handleLockPortal = () => {
    setAuthRole(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {
      // ignore
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

  const isClient = currentRole === 'client';
  const isPartner = currentRole === 'partner';
  const isAdmin = currentRole === 'admin';

  const heroCard = 'bg-white border border-slate-100 shadow-sm rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4';
  const secondaryBtn = 'px-3.5 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-100 shadow-sm hover:bg-slate-50 font-medium text-xs rounded-xl shrink-0 flex items-center space-x-1.5 transition-all';

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-200 font-sans">

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
            quoteNumber={isAdmin ? metadata.quoteNumber : displayQuoteNumber(metadata.quoteNumber)}
          />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

            {/* ---------- CLIENT : panier / devis interactif ---------- */}
            {isClient && (
              <ClientQuoteView
                modules={modules}
                metadata={metadata}
                settings={settings}
                calculations={calculations}
                onToggleOption={(id, active) => handleUpdateQuantity(id, active ? 1 : 0)}
                onOpenQuote={() => setShowFullA4View(true)}
              />
            )}

            {/* ---------- PARTENAIRE : marge + lien sécurisé ---------- */}
            {isPartner && (
              <>
                <PartnerPricingPanel
                  settings={settings}
                  calculations={calculations}
                  metadata={metadata}
                  onUpdateSettings={handleUpdateSettings}
                />
                <div className="flex justify-end mb-6 -mt-2 space-x-2">
                  <button type="button" onClick={handleSyncToSupabase} disabled={isSyncingWithDb} className={secondaryBtn}>
                    <Database className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isSyncingWithDb ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                  </button>
                  <button type="button" onClick={() => setIsShareModalOpen(true)} className={secondaryBtn}>
                    <Handshake className="w-3.5 h-3.5 text-slate-500" />
                    <span>Envoyer par e-mail</span>
                  </button>
                </div>
              </>
            )}

            {/* ---------- ADMIN : console technique interne ---------- */}
            {isAdmin && (
              <div className={heroCard}>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-white font-mono">
                      CONSOLE TECHNIQUE SUZALI
                    </span>
                    <span className="text-xs text-slate-500">Équipe : Odo, Anaïs, Hichem, Chahinez</span>
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    Matrice de Production & Verrouillage des Dérives
                  </h2>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Cas d'école Bières Georges : base ferme à 642 € HT (5,15 j avec gestion/socle). Spécifiez précisément les livrables inclus ci-dessous pour bloquer toute contestation ultérieure.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handleSyncToSupabase} disabled={isSyncingWithDb} className={secondaryBtn}>
                    {isSyncingWithDb ? (
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                    ) : (
                      <Database className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{isSyncingWithDb ? 'Sauvegarde...' : 'Sauvegarder BDD'}</span>
                  </button>
                  <button type="button" onClick={() => setIsCaseStudyModalOpen(true)} className={secondaryBtn}>
                    <span>Audit Dérives (14,75 j)</span>
                  </button>
                  <button type="button" onClick={() => setIsArchitectureModalOpen(true)} className={secondaryBtn}>
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                    <span>Schéma SQL & DNS</span>
                  </button>
                </div>
              </div>
            )}

            {/* Live DB Sync notification toast banner */}
            {dbSyncToast && !isClient && (
              <div className="mb-4 p-3 bg-slate-900 text-white rounded-xl text-xs font-medium flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{dbSyncToast}</span>
              </div>
            )}

            {!isClient && (
              <>
                <MetricCards
                  currentRole={currentRole}
                  calculations={calculations}
                  settings={settings}
                />

                <ConfigControls
                  currentRole={currentRole}
                  settings={settings}
                  metadata={metadata}
                  onUpdateSettings={handleUpdateSettings}
                  onUpdateMetadata={handleUpdateMetadata}
                />

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

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Prêt pour la validation contractuelle ?
                    </h4>
                    <p className="text-xs text-slate-500">
                      Générez le devis officiel avec descriptifs inclus verrouillés et signature.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setShowFullA4View(true)} className={secondaryBtn}>
                      Aperçu Document A4
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 flex items-center space-x-2 transition-all active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Télécharger / Imprimer en PDF</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>

          <footer className="border-t border-slate-100 py-6 mt-12 bg-white text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-medium text-slate-700">
                {isAdmin ? 'Suzali Conseil Pricing Studio' : 'Roeum Mak - Conseil & Développement Web'}
              </span>
              <div className="flex items-center space-x-4 text-[11px]">
                {isAdmin && (
                  <>
                    <button onClick={() => setIsArchitectureModalOpen(true)} className="hover:text-slate-900 transition-colors">
                      Schéma SQL & Netlify
                    </button>
                    <button onClick={() => setIsCaseStudyModalOpen(true)} className="hover:text-slate-900 transition-colors">
                      Cas Bières Georges (642 €)
                    </button>
                  </>
                )}
                {!isClient && (
                  <button onClick={() => setIsPortalSelectorOpen(true)} className="hover:text-slate-900 transition-colors">
                    Changer de portail
                  </button>
                )}
                <button
                  onClick={handleLockPortal}
                  className="hover:text-rose-700 transition-colors flex items-center space-x-1"
                  title="Verrouiller la session et revenir à l'écran de code"
                >
                  <LogOut className="w-3 h-3 text-slate-400" />
                  <span>Verrouiller</span>
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* MODALS */}
      {isShareModalOpen && !isClient && (
        <ShareModal
          metadata={metadata}
          calculations={calculations}
          currentRole={currentRole}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {isArchitectureModalOpen && isAdmin && (
        <ArchitectureModal onClose={() => setIsArchitectureModalOpen(false)} />
      )}

      {isCaseStudyModalOpen && isAdmin && (
        <BieresGeorgesExplainerModal
          onClose={() => setIsCaseStudyModalOpen(false)}
          onApplyBase642={handleApplyBase642}
        />
      )}

      {isPortalSelectorOpen && !isClient && (
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
