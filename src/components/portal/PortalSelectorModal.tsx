import React from 'react';
import type { UserRole } from '../../types/quote';
import { 
  X, 
  ShieldCheck, 
  Handshake, 
  User, 
  Lock, 
  KeyRound
} from 'lucide-react';

interface PortalSelectorModalProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onClose: () => void;
}

export const PortalSelectorModal: React.FC<PortalSelectorModalProps> = ({
  currentRole,
  onSelectRole,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                Sélecteur d'Espace de Travail & Portail d'Accès
              </h3>
              <p className="text-xs text-slate-500">
                Chaque acteur dispose d'un espace hermétique et adapté à son rôle métier
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
        <div className="p-6 space-y-4">
          
          {/* PORTAL 1 : SUZALI CONSEIL */}
          <div
            onClick={() => {
              onSelectRole('admin');
              onClose();
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start space-x-4 ${
              currentRole === 'admin'
                ? 'border-emerald-700 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  1. Suzali Conseil — Régie Technique & Direction
                </span>
                {currentRole === 'admin' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                    Actif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Équipe : <strong>Odo, Anaïs, Hichem, Chahinez</strong>. Contrôle total des coûts de base de fabrication, charge en jours ouvrés (3,65 j + 1,5 j = 5,15 j), TJM et architecture technique.
              </p>
              <div className="mt-2 flex items-center space-x-3 text-[11px] text-emerald-800 font-medium">
                <span>• Coûts de revient réels</span>
                <span>• Schéma PostgreSQL & DNS</span>
                <span>• Suivi des dérives</span>
              </div>
            </div>
          </div>

          {/* PORTAL 2 : 33 DEGRÉS */}
          <div
            onClick={() => {
              onSelectRole('partner');
              onClose();
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start space-x-4 ${
              currentRole === 'partner'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-300 flex items-center justify-center shrink-0">
              <Handshake className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  2. Agence 33 Degrés — Espace Partenaire Revendeur
                </span>
                {currentRole === 'partner' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
                    Actif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Interlocuteurs : <strong>Maxime / Thomas</strong>. Visualisation du prix d'achat Suzali, ajustement de votre coefficient de marge commerciale (+35%) et génération du lien client sécurisé.
              </p>
              <div className="mt-2 flex items-center space-x-3 text-[11px] text-indigo-800 font-medium">
                <span>• Marge commerciale d'agence</span>
                <span>• Pipeline de vente</span>
                <span>• Lien tokenisé client</span>
              </div>
            </div>
          </div>

          {/* PORTAL 3 : BIÈRES GEORGES */}
          <div
            onClick={() => {
              onSelectRole('client');
              onClose();
            }}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start space-x-4 ${
              currentRole === 'client'
                ? 'border-amber-700 bg-amber-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-300 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  3. Brasserie Bières Georges — Portail Client Final
                </span>
                {currentRole === 'client' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    Actif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Destinataire : <strong>Julien & Équipe Direction</strong>. Présentation épurée et transparente de l'offre. Aucune fuite de marge d'agence ou de coût interne. Sélection des modules et signature du devis officiel A4.
              </p>
              <div className="mt-2 flex items-center space-x-3 text-[11px] text-amber-900 font-medium">
                <span>• Zéro mention de marge</span>
                <span>• Descriptif 'Inclus' verrouillé</span>
                <span>• Signature électronique</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Chiffrement TLS 1.3 & Cloisonnement RBAC strict</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-slate-900 text-white hover:bg-slate-800"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
