import React, { useState } from 'react';
import type { UserRole } from '../../types/quote';
import { PORTAL_CODES } from '../../data/portalCodes';
import { 
  X, 
  ShieldCheck, 
  Handshake, 
  User, 
  Lock, 
  KeyRound,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface PortalSelectorModalProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onClose: () => void;
}

interface PortalConfig {
  role: UserRole;
  title: string;
  subtitle: string;
  desc: string;
  allowedCodes: string[];
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderActive: string;
}

const PORTALS: PortalConfig[] = [
  {
    role: 'client',
    title: '3. Espace Client — Présenté par Roeum Mak',
    subtitle: 'Bières Georges',
    desc: 'Consultation transparente du devis (642 € HT), options à la carte et signature électronique officielle sans fuite de coûts ou marges.',
    allowedCodes: PORTAL_CODES.client,
    icon: User,
    accentColor: 'from-amber-950 to-amber-900',
    borderActive: 'border-amber-600 bg-amber-50/50',
  },
  {
    role: 'partner',
    title: '2. Espace Partenaire Commercial — Roeum Mak',
    subtitle: 'Vente & Apport d\'Affaires : Roeum Mak',
    desc: 'Visualisation du prix d’achat, réglage de votre marge commerciale (+35%) et génération du lien client sécurisé.',
    allowedCodes: PORTAL_CODES.partner,
    icon: Handshake,
    accentColor: 'from-indigo-950 to-indigo-900',
    borderActive: 'border-indigo-600 bg-indigo-50/50',
  },
  {
    role: 'admin',
    title: '1. Accès interne — Régie technique',
    subtitle: 'Équipe technique',
    desc: 'Contrôle total des coûts de fabrication, charge en jours (3,65 j + 1,5 j = 5,15 j), TJM, PostgreSQL et audits des dérives.',
    allowedCodes: PORTAL_CODES.admin,
    icon: ShieldCheck,
    accentColor: 'from-emerald-950 to-emerald-900',
    borderActive: 'border-emerald-700 bg-emerald-50/50',
  },
];

export const PortalSelectorModal: React.FC<PortalSelectorModalProps> = ({
  currentRole,
  onSelectRole,
  onClose,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [pinCode, setPinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeTarget = PORTALS.find((p) => p.role === selectedRole)!;

  const handleSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === currentRole) {
      onClose();
      return;
    }

    const cleanCode = pinCode.trim().toUpperCase();
    const isValid = activeTarget.allowedCodes.some((c) => c.toUpperCase() === cleanCode);

    if (isValid) {
      setError(null);
      onSelectRole(selectedRole);
      onClose();
    } else {
      setError('Code incorrect.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                Changement d'Espace de Travail Sécurisé
              </h3>
              <p className="text-xs text-slate-500">
                Chaque espace nécessite la confirmation de son code d'accès PIN
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

        {/* Portals list */}
        <div className="p-6 space-y-3">
          {PORTALS.map((portal) => {
            const Icon = portal.icon;
            const isSelected = selectedRole === portal.role;
            const isCurrent = currentRole === portal.role;

            return (
              <div
                key={portal.role}
                onClick={() => {
                  setSelectedRole(portal.role);
                  setError(null);
                  if (portal.role === currentRole) setPinCode('');
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-4 ${
                  isSelected
                    ? portal.borderActive
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${portal.accentColor} text-white flex items-center justify-center shrink-0 shadow-xs`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {portal.title}
                    </span>
                    {isCurrent ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                        Espace Actuel
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                        Sélectionné
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {portal.subtitle}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {portal.desc}
                  </p>
                </div>
              </div>
            );
          })}

          {/* PIN confirmation form if changing to another role */}
          {selectedRole !== currentRole && (
            <form onSubmit={handleSwitch} className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Saisissez le code PIN pour basculer :</span>
                </label>

              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="password"
                  autoFocus
                  placeholder="Code PIN"
                  value={pinCode}
                  onChange={(e) => {
                    setPinCode(e.target.value);
                    if (error) setError(null);
                  }}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <span>Confirmer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {error && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sécurité & Cloisonnement RBAC strict</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
