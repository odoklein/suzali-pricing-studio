import React from 'react';
import type { UserRole } from '../../types/quote';
import { 
  Share2, 
  Printer, 
  Server, 
  RotateCcw,
  Sparkles,
  Lock,
  ArrowLeftRight
} from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenShareModal: () => void;
  onOpenArchitectureModal: () => void;
  onOpenCaseStudyModal: () => void;
  onOpenPortalSelector: () => void;
  onReset: () => void;
  onPrint: () => void;
  onLock?: () => void;
  quoteNumber: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onOpenShareModal,
  onOpenArchitectureModal,
  onOpenCaseStudyModal,
  onOpenPortalSelector,
  onReset,
  onPrint,
  onLock,
  quoteNumber,
}) => {
  const isClient = currentRole === 'client';
  const isPartner = currentRole === 'partner';
  const isAdmin = currentRole === 'admin';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          
          {/* Logo & Identity (Hermetically isolated per role) */}
          <div className="flex items-center space-x-3.5">
            {isClient ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-900 to-amber-950 flex items-center justify-center shadow-xs border border-amber-800/40 text-amber-200 font-bold">
                <span className="text-sm font-mono tracking-tight">BG</span>
              </div>
            ) : isPartner ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900 to-indigo-950 flex items-center justify-center shadow-xs border border-indigo-800/40 text-indigo-200 font-bold">
                <span className="text-sm font-mono tracking-tight">RM</span>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 flex items-center justify-center shadow-xs border border-emerald-800/40 text-emerald-300 font-bold">
                <span className="text-lg tracking-tighter">SZ</span>
              </div>
            )}

            <div>
              <div className="flex items-center space-x-2">
                {isClient ? (
                  <>
                    <span className="font-bold text-base md:text-lg text-slate-900 tracking-tight">
                      BIÈRES GEORGES
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                      Portail Client Sécurisé
                    </span>
                  </>
                ) : isPartner ? (
                  <>
                    <span className="font-bold text-base md:text-lg text-slate-900 tracking-tight">
                      ROEUM MAK
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      Espace Partenaire Commercial
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-base md:text-lg text-slate-900 tracking-tight">
                      SUZALI CONSEIL
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                      Studio Régie Technique
                    </span>
                  </>
                )}
                
                <span className="hidden md:inline-flex text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {quoteNumber}
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium tracking-tight">
                {isClient
                  ? 'Consultation de votre devis officiel, personnalisation des livrables et validation'
                  : isPartner
                  ? 'Gestion du coefficient de marge commerciale et transmission sécurisée client'
                  : 'Gouvernance des coûts de production, charge en jours et matrice tripartite'}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2">
            
            {/* Cas Réel Bières Georges (Admin/Partner only) */}
            {!isClient && (
              <button
                onClick={onOpenCaseStudyModal}
                title="Audit & Rétrospective du Cas Bières Georges (592€ / 642€ vs 14.75j réels)"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Cas Bières Georges</span>
                <span className="font-mono text-[11px] bg-amber-200/60 px-1 py-0.5 rounded font-bold">642 €</span>
              </button>
            )}

            {/* Architecture Modal (Admin only) */}
            {isAdmin && (
              <button
                onClick={onOpenArchitectureModal}
                title="Consulter l'architecture technique, RBAC & schéma SQL BDD"
                className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>Architecture</span>
              </button>
            )}

            {/* Share link modal (Admin/Partner) */}
            {!isClient ? (
              <button
                onClick={onOpenShareModal}
                title="Générer un lien de partage sécurisé client / partenaire"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Partager</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1 text-slate-400 text-xs px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200/80">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium text-slate-600">Lien Privé Sécurisé</span>
              </div>
            )}

            {/* PDF print button */}
            <button
              onClick={onPrint}
              title="Télécharger ou imprimer le devis proforma officiel A4"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-900 hover:bg-emerald-800 text-white shadow-xs transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-200" />
              <span>Devis A4</span>
            </button>

            {/* Portal Switcher Button */}
            <button
              onClick={onOpenPortalSelector}
              title="Changer de portail / Espace de travail"
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Espaces</span>
            </button>

            {/* Lock/Logout button */}
            {onLock && (
              <button
                onClick={onLock}
                title="Verrouiller la session (Code PIN requis)"
                className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Reset button (Admin only) */}
            {isAdmin && (
              <button
                onClick={onReset}
                title="Réinitialiser aux valeurs d'origine (Base 642 € HT)"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

          </div>
        </div>

      </div>
    </header>
  );
};
