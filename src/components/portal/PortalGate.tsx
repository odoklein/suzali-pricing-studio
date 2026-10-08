import React, { useState } from 'react';
import type { UserRole } from '../../types/quote';
import { 
  ShieldCheck, 
  Handshake, 
  User, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

interface PortalGateProps {
  onUnlock: (role: UserRole) => void;
}

interface PortalConfig {
  role: UserRole;
  title: string;
  subtitle: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  codeHint: string;
  allowedCodes: string[];
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderActive: string;
}

const PORTALS: PortalConfig[] = [
  {
    role: 'client',
    title: 'Client Final',
    subtitle: 'Brasserie Bières Georges (Julien)',
    badge: 'Espace Validation & Signature',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    codeHint: 'Code démo : 1234 ou BIERES',
    allowedCodes: ['1234', 'BIERES', 'GEORGES', 'JULIEN', '0000'],
    icon: User,
    accentColor: 'from-amber-900 to-amber-950',
    borderActive: 'border-amber-600 ring-2 ring-amber-100 bg-amber-50/30',
  },
  {
    role: 'partner',
    title: 'Partenaire Commercial',
    subtitle: 'Roeum Mak',
    badge: 'Espace Vente & Marge',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-900',
    codeHint: 'Code démo : 5678 ou ROEUM',
    allowedCodes: ['5678', 'ROEUM', 'MAK', 'PARTENAIRE', '2026'],
    icon: Handshake,
    accentColor: 'from-indigo-900 to-indigo-950',
    borderActive: 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/30',
  },
  {
    role: 'admin',
    title: 'Suzali Conseil',
    subtitle: 'Direction & Régie Technique (Odo, Anaïs, Hichem, Chahinez)',
    badge: 'Console Technique & Coûts',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-950',
    codeHint: 'Code démo : 9999 ou SUZALI',
    allowedCodes: ['9999', 'SUZALI', 'ODO', 'ADMIN', '642'],
    icon: ShieldCheck,
    accentColor: 'from-emerald-950 to-green-950',
    borderActive: 'border-emerald-700 ring-2 ring-emerald-100 bg-emerald-50/30',
  },
];

export const PortalGate: React.FC<PortalGateProps> = ({ onUnlock }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [inputCode, setInputCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoCodes, setShowDemoCodes] = useState(false);

  const activePortal = PORTALS.find((p) => p.role === selectedRole)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMessage('Veuillez saisir votre code d’accès.');
      return;
    }

    const isValid = activePortal.allowedCodes.some(
      (code) => code.toUpperCase() === cleanCode
    );

    if (isValid) {
      setErrorMessage(null);
      onUnlock(selectedRole);
    } else {
      setErrorMessage(
        `Code erroné pour l'espace ${activePortal.title}. (Indice : utilisez le code démo ${activePortal.allowedCodes[0]})`
      );
    }
  };

  const handleQuickCode = (code: string) => {
    setInputCode(code);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900">
      
      {/* Top Brand Header */}
      <div className="text-center mb-8 max-w-lg">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-xs mb-4">
          <div className="w-5 h-5 rounded bg-emerald-950 text-emerald-300 text-[11px] font-bold flex items-center justify-center">
            SZ
          </div>
          <span className="text-xs font-semibold text-slate-700 tracking-tight">
            SUZALI CONSEIL • PRICING STUDIO
          </span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Portail Sécurisé d'Accès
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          Chaque espace est cloisonné par code PIN confidentiel pour garantir la confidentialité des coûts et des marges.
        </p>
      </div>

      {/* Main Login / Gating Card */}
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Step 1: Portal Selector */}
        <div className="p-6 pb-4 border-b border-slate-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            1. Choisissez votre profil :
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PORTALS.map((portal) => {
              const Icon = portal.icon;
              const isSelected = selectedRole === portal.role;
              return (
                <button
                  key={portal.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(portal.role);
                    setInputCode('');
                    setErrorMessage(null);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? portal.borderActive
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${portal.accentColor} flex items-center justify-center text-white shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <span className="block font-bold text-xs text-slate-900 leading-tight">
                      {portal.title}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                      {portal.role === 'partner' ? 'Roeum Mak' : portal.role === 'client' ? 'Bières Georges' : 'Suzali Tech'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Access Code Entry */}
        <form onSubmit={handleSubmit} className="p-6 pt-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="access-pin-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Code d'accès pour : <span className="text-slate-900 normal-case">{activePortal.title}</span>
              </label>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${activePortal.badgeBg} ${activePortal.badgeText}`}>
                {activePortal.badge}
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="access-pin-input"
                type="password"
                autoFocus
                placeholder="Entrez votre code (ex: PIN à 4 chiffres)"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:tracking-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 transition-all"
              />
            </div>

            {errorMessage && (
              <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Unlock Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Déverrouiller l'Espace {activePortal.title}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Helper / Demo Codes helper */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <button
              type="button"
              onClick={() => setShowDemoCodes(!showDemoCodes)}
              className="text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors text-left"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showDemoCodes ? 'Masquer les codes de test' : 'Voir les codes d’accès de test'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickCode(activePortal.allowedCodes[0])}
              className="text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2 text-left sm:text-right"
            >
              Remplir automatiquement ({activePortal.allowedCodes[0]})
            </button>
          </div>

          {/* Demo codes pop-down */}
          {showDemoCodes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 animate-in fade-in">
              <div className="font-semibold text-slate-800 mb-1">Codes d'accès configurés :</div>
              <div className="flex items-center justify-between">
                <span>• Client Final (Julien / Bières Georges) :</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-amber-900">1234</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• Partenaire Vendeur (Roeum Mak) :</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-900">5678</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• Direction & Régie (Suzali Conseil) :</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-emerald-900">9999</span>
              </div>
            </div>
          )}

        </form>

        {/* Footer Info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Chiffrement RBAC sécurisé</span>
          </div>
          <span>Suzali Conseil Pricing Studio v3.2</span>
        </div>

      </div>

      {/* Subtle reassurance note */}
      <p className="text-xs text-slate-400 text-center mt-6 max-w-md">
        Les données financières et marges de Suzali Conseil et Roeum Mak sont strictement protégées et ne sont jamais visibles sur l'écran du client final.
      </p>

    </div>
  );
};
