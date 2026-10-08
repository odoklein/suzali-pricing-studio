import React, { useState } from 'react';
import type { PageModule, UserRole, PricingSettings } from '../../types/quote';
import { formatEuros, formatDays } from '../../utils/formatters';
import { 
  Plus, 
  Minus, 
  Edit3, 
  Check, 
  Layers, 
  Sparkles, 
  Info, 
  Trash2,
  FileCheck,
  MapPin,
  Box
} from 'lucide-react';

interface PageTableProps {
  modules: PageModule[];
  currentRole: UserRole;
  settings: PricingSettings;
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onUpdateIncluded: (id: string, newIncluded: string) => void;
  onUpdateBasePrice: (id: string, newPrice: number) => void;
  onUpdateDays: (id: string, newDays: number) => void;
  onAddCustomModule: (name: string, description: string, included: string, price: number, days: number) => void;
  onDeleteModule: (id: string) => void;
}

export const PageTable: React.FC<PageTableProps> = ({
  modules,
  currentRole,
  settings,
  onUpdateQuantity,
  onUpdateIncluded,
  onUpdateBasePrice,
  onUpdateDays,
  onAddCustomModule,
  onDeleteModule,
}) => {
  const isClient = currentRole === 'client';
  const isAdmin = currentRole === 'admin';

  // Step filter : 'phase-core' (default: 8 pages 592€) | 'phase-locator' | 'phase-options' | 'all'
  const [activePhase, setActivePhase] = useState<'all' | 'phase-core' | 'phase-locator' | 'phase-options'>('phase-core');
  const [editingIncludedId, setEditingIncludedId] = useState<string | null>(null);
  const [tempIncludedText, setTempIncludedText] = useState<string>('');

  // New module modal / inline state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIncluded, setNewIncluded] = useState('');
  const [newPrice, setNewPrice] = useState(60);
  const [newDays, setNewDays] = useState(0.35);

  // Group modules into the 3 historical phases
  const coreModules = modules.filter(
    (m) => ['page-home', 'page-story', 'page-menu', 'page-events', 'page-privatisation', 'page-gallery', 'page-practical', 'page-legal'].includes(m.id)
  );

  const locatorModule = modules.filter((m) => m.id === 'module-store-locator');

  const optionModules = modules.filter(
    (m) => !['page-home', 'page-story', 'page-menu', 'page-events', 'page-privatisation', 'page-gallery', 'page-practical', 'page-legal', 'module-store-locator'].includes(m.id)
  );

  const displayedModules = activePhase === 'phase-core' 
    ? coreModules 
    : activePhase === 'phase-locator' 
    ? locatorModule 
    : activePhase === 'phase-options' 
    ? optionModules 
    : modules;

  const handleStartEditIncluded = (mod: PageModule) => {
    setEditingIncludedId(mod.id);
    setTempIncludedText(mod.includedDetails);
  };

  const handleSaveIncluded = (id: string) => {
    onUpdateIncluded(id, tempIncludedText);
    setEditingIncludedId(null);
  };

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddCustomModule(newName, newDesc, newIncluded || newDesc, newPrice, newDays);
    setNewName('');
    setNewDesc('');
    setNewIncluded('');
    setIsAddingNew(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mb-8">
      
      {/* Table Header with Structured Phase Stepper */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-800" />
              <h3 className="font-bold text-slate-900 text-base">
                Décomposition du Périmètre par Jalons
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                {modules.filter(m => m.quantity > 0).length} livrable(s) retenu(s)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isClient
                ? 'Naviguez entre le socle de base (8 pages), le store locator et les options facultatives.'
                : 'Structure ordonnée : Socle 592 € HT (3,65 j) + Store Locator 50 € HT = Base officielle 642 € HT.'}
            </p>
          </div>

          {!isClient && (
            <button
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors inline-flex items-center space-x-1.5 self-start md:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter un Livrable</span>
            </button>
          )}
        </div>

        {/* Phase Stepper Tabs (Linear sequence to avoid cognitive overload) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          
          <button
            type="button"
            onClick={() => setActivePhase('phase-core')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activePhase === 'phase-core'
                ? 'border-emerald-800 bg-emerald-50/90 text-emerald-950 shadow-xs font-bold'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center space-x-1">
                <Box className="w-3.5 h-3.5 text-emerald-700" />
                <span>1. Socle (8 Pages)</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                592 €
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Cœur de site (3,65 j)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePhase('phase-locator')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activePhase === 'phase-locator'
                ? 'border-emerald-800 bg-emerald-50/90 text-emerald-950 shadow-xs font-bold'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>2. Store Locator</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                +50 €
              </span>
            </div>
            <span className="text-[11px] text-emerald-800 block mt-0.5 font-medium">
              = Base ferme 642 € HT
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePhase('phase-options')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activePhase === 'phase-options'
                ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 shadow-xs font-bold'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>3. Options</span>
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                À la carte
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Réservation, Vente, etc.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePhase('all')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activePhase === 'all'
                ? 'border-slate-900 bg-slate-900 text-white shadow-xs font-bold'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">4. Récap Global</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${activePhase === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'}`}>
                {modules.length}
              </span>
            </div>
            <span className={`text-[11px] block mt-0.5 ${activePhase === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Tous les modules réunis
            </span>
          </button>

        </div>
      </div>

      {/* Add Custom Module Form */}
      {isAddingNew && (
        <form onSubmit={handleCreateModule} className="p-4 bg-emerald-50/50 border-b border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ajouter un module ou livrable sur-mesure</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Annuler
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1">Nom du module</label>
              <input
                type="text"
                placeholder="ex: Page Carte Cadeau Taproom"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-700"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Description courte</label>
              <input
                type="text"
                placeholder="ex: Vente de bons cadeaux bières"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-700"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Inclus contractuel</label>
              <input
                type="text"
                placeholder="ex: Paiement Stripe, envoi PDF automatique"
                value={newIncluded}
                onChange={(e) => setNewIncluded(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-700"
              />
            </div>
            <div className="flex items-end space-x-2">
              <div className="w-1/2">
                <label className="block text-slate-600 mb-1">Prix Base (€)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-slate-600 mb-1">Délai (j)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.05"
                  value={newDays}
                  onChange={(e) => setNewDays(Number(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-800 text-white rounded-lg font-semibold hover:bg-emerald-700 shrink-0"
              >
                Créer
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
              <th className="py-3 px-4 w-12 text-center">Qté</th>
              <th className="py-3 px-4 min-w-[260px]">Livrable & Spécification Inclus</th>
              {isAdmin && <th className="py-3 px-4 w-24 text-right">Délai (j)</th>}
              {!isClient && <th className="py-3 px-4 w-28 text-right">Coût Suzali</th>}
              <th className="py-3 px-4 w-32 text-right">Prix Client HT</th>
              <th className="py-3 px-4 w-32 text-right">Total Ligne HT</th>
              {!isClient && <th className="py-3 px-2 w-10 text-center"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedModules.map((mod) => {
              const isIncludedActive = mod.quantity > 0;
              const unitClientPrice = settings.mode === 'forfait'
                ? mod.basePrice * (1 + settings.partnerMarginPercent / 100)
                : (mod.days * settings.tjmSuzali) * (1 + settings.partnerMarginPercent / 100);

              const lineSuzaliTotal = settings.mode === 'forfait'
                ? mod.basePrice * mod.quantity
                : (mod.days * settings.tjmSuzali) * mod.quantity;

              const lineClientTotal = unitClientPrice * mod.quantity;

              return (
                <tr
                  key={mod.id}
                  className={`transition-colors ${
                    isIncludedActive ? 'hover:bg-slate-50/60' : 'bg-slate-50/40 opacity-60 hover:opacity-90'
                  }`}
                >
                  {/* Stepper Quantité */}
                  <td className="py-3.5 px-3 text-center align-top">
                    <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(mod.id, Math.max(0, mod.quantity - 1))}
                        disabled={mod.minQuantity !== undefined && mod.quantity <= mod.minQuantity}
                        className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100"
                        title="Diminuer ou retirer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-mono font-bold text-slate-900 text-xs">
                        {mod.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(mod.id, mod.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                        title="Ajouter ou incrémenter"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {/* Module Name & Editable Inclus */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-[13px]">{mod.name}</span>
                        {mod.id === 'module-store-locator' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Base officielle 642 €
                          </span>
                        )}
                        {mod.isCustom && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                            Sur-mesure
                          </span>
                        )}
                      </div>
                      
                      <p className="text-slate-600 text-xs leading-relaxed">
                        {mod.description}
                      </p>

                      {/* Section 'Inclus' Éditable pour verrouillage contractuel */}
                      <div className="mt-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-emerald-900 flex items-center space-x-1">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Inclus au devis (Périmètre verrouillé) :</span>
                          </span>
                          {editingIncludedId !== mod.id ? (
                            <button
                              type="button"
                              onClick={() => handleStartEditIncluded(mod)}
                              className="text-[11px] text-slate-500 hover:text-emerald-800 flex items-center space-x-1 transition-colors"
                              title="Personnaliser les livrables inclus"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Modifier</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSaveIncluded(mod.id)}
                              className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center space-x-1 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              <span>Enregistrer</span>
                            </button>
                          )}
                        </div>

                        {editingIncludedId === mod.id ? (
                          <textarea
                            value={tempIncludedText}
                            onChange={(e) => setTempIncludedText(e.target.value)}
                            rows={2}
                            className="w-full p-2 text-xs bg-white border border-emerald-300 rounded-lg text-slate-900 focus:outline-emerald-700 font-sans"
                            placeholder="Détaillez précisément ce qui est inclus..."
                          />
                        ) : (
                          <p className="text-slate-700 text-xs italic">
                            {mod.includedDetails || 'Aucune restriction spécifiée.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Délai (jours) - Admin only */}
                  {isAdmin && (
                    <td className="py-3.5 px-4 text-right align-top font-mono">
                      <div className="inline-flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={mod.days}
                          onChange={(e) => onUpdateDays(mod.id, Number(e.target.value) || 0)}
                          className="w-14 text-right font-mono font-medium py-1 px-1.5 rounded border border-slate-200 focus:outline-emerald-700"
                        />
                        <span className="text-slate-500 text-xs">j</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Total : {formatDays(mod.days * mod.quantity)}
                      </div>
                    </td>
                  )}

                  {/* Coût Suzali - Admin & Partenaire */}
                  {!isClient && (
                    <td className="py-3.5 px-4 text-right align-top font-mono">
                      {isAdmin ? (
                        <div className="inline-flex items-center space-x-1">
                          <input
                            type="number"
                            step="5"
                            min="0"
                            value={mod.basePrice}
                            onChange={(e) => onUpdateBasePrice(mod.id, Number(e.target.value) || 0)}
                            className="w-16 text-right font-mono font-medium py-1 px-1.5 rounded border border-slate-200 focus:outline-emerald-700"
                          />
                          <span className="text-slate-500 text-xs">€</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {formatEuros(mod.basePrice)}
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400 mt-1">
                        Ligne : {formatEuros(lineSuzaliTotal)}
                      </div>
                    </td>
                  )}

                  {/* Prix Unitaire Client HT */}
                  <td className="py-3.5 px-4 text-right align-top font-mono">
                    <span className="font-bold text-slate-900 text-xs">
                      {formatEuros(unitClientPrice)}
                    </span>
                    <span className="block text-[10px] text-slate-400">HT / u</span>
                  </td>

                  {/* Total Ligne Client HT */}
                  <td className="py-3.5 px-4 text-right align-top font-mono">
                    <span className={`text-[13px] font-bold ${isIncludedActive ? 'text-emerald-950 font-bold' : 'text-slate-400'}`}>
                      {formatEuros(lineClientTotal)}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      TTC : {formatEuros(lineClientTotal * (1 + settings.vatRate / 100))}
                    </span>
                  </td>

                  {/* Actions (Admin delete custom) */}
                  {!isClient && (
                    <td className="py-3.5 px-2 text-center align-top">
                      {mod.isCustom && (
                        <button
                          type="button"
                          onClick={() => onDeleteModule(mod.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Supprimer ce module sur-mesure"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {isClient
              ? 'Toutes les pages incluses ci-dessus sont couvertes par la garantie de livraison et le recettage.'
              : 'Toute modification de périmètre hors devis validé fera l’objet d’un avenant de facturation selon la grille TJM.'}
          </span>
        </div>
        <div className="font-mono text-slate-700 font-medium">
          Taux TVA applicable : 20,0 % (France métropolitaine)
        </div>
      </div>

    </div>
  );
};
