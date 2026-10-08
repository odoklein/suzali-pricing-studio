import React, { useState } from 'react';
import type { UserRole, PricingSettings, ClientMetadata } from '../../types/quote';
import { 
  Building, 
  ChevronDown, 
  ChevronUp, 
  Tag 
} from 'lucide-react';

interface ConfigControlsProps {
  currentRole: UserRole;
  settings: PricingSettings;
  metadata: ClientMetadata;
  onUpdateSettings: (newSettings: Partial<PricingSettings>) => void;
  onUpdateMetadata: (newMetadata: Partial<ClientMetadata>) => void;
}

export const ConfigControls: React.FC<ConfigControlsProps> = ({
  currentRole,
  settings,
  metadata,
  onUpdateSettings,
  onUpdateMetadata,
}) => {
  const isClient = currentRole === 'client';
  const isAdmin = currentRole === 'admin';

  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 mb-6 shadow-xs">
      
      {/* Top Bar : Mode Switcher & Key Sliders */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        
        {/* Left: Mode Switcher (Forfait vs TJM) */}
        {!isClient ? (
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Modèle de Calcul :
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onUpdateSettings({ mode: 'forfait' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  settings.mode === 'forfait'
                    ? 'bg-white text-emerald-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Forfait par Page
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ mode: 'tjm' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  settings.mode === 'tjm'
                    ? 'bg-white text-emerald-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Temps Passé (TJM)
              </button>
            </div>
            <span className="hidden sm:inline-block text-[11px] text-slate-500">
              {settings.mode === 'forfait' 
                ? 'Coûts unitaires fermes par livrable' 
                : 'Charge jours × Taux Journalier Moyen'}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-sm font-semibold text-slate-800">
              Devis {metadata.quoteNumber} — {metadata.projectName}
            </span>
          </div>
        )}

        {/* Right: Quick Param Controls for Admin/Partner */}
        {!isClient && (
          <div className="flex flex-wrap items-center gap-3">
            
            {/* TJM (Visible/Editable by Admin) */}
            {isAdmin && settings.mode === 'tjm' && (
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-medium text-slate-600">TJM Suzali :</span>
                <input
                  type="number"
                  min="100"
                  max="1500"
                  step="25"
                  value={settings.tjmSuzali}
                  onChange={(e) => onUpdateSettings({ tjmSuzali: Number(e.target.value) || 0 })}
                  className="w-18 px-2 py-0.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-slate-900 text-right focus:outline-emerald-700"
                />
                <span className="text-xs text-slate-500 font-mono">€/j</span>
              </div>
            )}

            {isAdmin && (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-600">
                Marge Partenaire :
              </span>
              <input
                type="number"
                min="0"
                max="300"
                step="5"
                value={settings.partnerMarginPercent}
                onChange={(e) => onUpdateSettings({ partnerMarginPercent: Number(e.target.value) || 0 })}
                className="w-16 px-2 py-0.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-indigo-900 text-right focus:outline-indigo-700"
              />
              <span className="text-xs text-slate-500 font-mono">%</span>
            </div>

            )}

            {/* Socle Technique / Gestion (Admin only) */}
            {isAdmin && (
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-medium text-slate-600">Socle & Gestion :</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.25"
                  value={settings.managementDaysFixed}
                  onChange={(e) => onUpdateSettings({ managementDaysFixed: Number(e.target.value) || 0 })}
                  className="w-16 px-2 py-0.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-slate-900 text-right focus:outline-emerald-700"
                />
                <span className="text-xs text-slate-500 font-mono">j</span>
              </div>
            )}

            {/* Remise commerciale */}
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-600">Remise :</span>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                value={settings.discountPercent}
                onChange={(e) => onUpdateSettings({ discountPercent: Number(e.target.value) || 0 })}
                className="w-14 px-2 py-0.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-rose-900 text-right focus:outline-rose-700"
              />
              <span className="text-xs text-slate-500 font-mono">%</span>
            </div>

          </div>
        )}
      </div>

      {/* Metadata Collapsible Section */}
      <div className="pt-3">
        <button
          type="button"
          onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
          className="flex items-center justify-between w-full text-left text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span>Informations du Devis & Coordonnées</span>
            <span className="text-slate-400 font-normal">
              ({metadata.clientCompany} • {metadata.quoteNumber})
            </span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
            <span>{isMetadataExpanded ? 'Masquer' : 'Modifier les métadonnées'}</span>
            {isMetadataExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isMetadataExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Colonne 1: Projet & Référence */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-700" />
                <span>Identification du Dossier</span>
              </h4>
              <div>
                <label className="block text-slate-500 mb-1">Nom du Projet</label>
                <input
                  type="text"
                  value={metadata.projectName}
                  onChange={(e) => onUpdateMetadata({ projectName: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 font-medium focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">N° de Devis</label>
                  <input
                    type="text"
                    value={metadata.quoteNumber}
                    onChange={(e) => onUpdateMetadata({ quoteNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-900 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Validité (jours)</label>
                  <input
                    type="number"
                    value={metadata.validityDays}
                    onChange={(e) => onUpdateMetadata({ validityDays: Number(e.target.value) || 30 })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-900 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Colonne 2: Client Final */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 flex items-center space-x-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-700" />
                <span>Client Final</span>
              </h4>
              <div>
                <label className="block text-slate-500 mb-1">Société Client</label>
                <input
                  type="text"
                  value={metadata.clientCompany}
                  onChange={(e) => onUpdateMetadata({ clientCompany: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Contact</label>
                  <input
                    type="text"
                    value={metadata.clientContact}
                    onChange={(e) => onUpdateMetadata({ clientContact: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={metadata.clientEmail}
                    onChange={(e) => onUpdateMetadata({ clientEmail: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Adresse</label>
                <input
                  type="text"
                  value={metadata.clientAddress}
                  onChange={(e) => onUpdateMetadata({ clientAddress: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Colonne 3: Partenaire Commercial (Roeum Mak) */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 flex items-center space-x-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-700" />
                <span>Partenaire Commercial</span>
              </h4>
              <div>
                <label className="block text-slate-500 mb-1">Partenaire / Société</label>
                <input
                  type="text"
                  value={metadata.partnerCompany}
                  onChange={(e) => onUpdateMetadata({ partnerCompany: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-indigo-700 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Contact Partenaire</label>
                  <input
                    type="text"
                    value={metadata.partnerContact}
                    onChange={(e) => onUpdateMetadata({ partnerContact: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-indigo-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Email Partenaire</label>
                  <input
                    type="email"
                    value={metadata.partnerEmail}
                    onChange={(e) => onUpdateMetadata({ partnerEmail: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-indigo-700 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Téléphone commercial</label>
                <input
                  type="text"
                  value={metadata.partnerPhone}
                  onChange={(e) => onUpdateMetadata({ partnerPhone: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-indigo-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Adresse commerciale</label>
                <input
                  type="text"
                  value={metadata.partnerAddress}
                  onChange={(e) => onUpdateMetadata({ partnerAddress: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-indigo-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">SIRET</label>
                <input
                  type="text"
                  value={metadata.partnerSiret}
                  onChange={(e) => onUpdateMetadata({ partnerSiret: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 focus:ring-1 focus:ring-indigo-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Acompte demandé (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={metadata.depositPercentage}
                  onChange={(e) => onUpdateMetadata({ depositPercentage: Number(e.target.value) || 30 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-900 focus:ring-1 focus:ring-indigo-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
