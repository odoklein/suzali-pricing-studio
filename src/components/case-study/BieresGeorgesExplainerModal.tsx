import React from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck
} from 'lucide-react';

interface BieresGeorgesExplainerModalProps {
  onClose: () => void;
  onApplyBase642: () => void;
}

export const BieresGeorgesExplainerModal: React.FC<BieresGeorgesExplainerModalProps> = ({
  onClose,
  onApplyBase642,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-amber-200 bg-amber-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-900 text-amber-200 flex items-center justify-center font-bold">
              BG
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Rétrospective & Audit : Cas Réel Bières Georges
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 font-mono">
                  Base 642 € vs Dérive 1 991 €
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Pourquoi 5,15 jours théoriques se sont transformés en 14,75 jours réels
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Comparative Cards: 3 States */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Étape 1 : 592 € Initial Odo */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                1. Devis Initial (Tableau 1 Odo)
              </span>
              <div className="text-xl font-bold font-mono text-slate-800">
                592,00 € HT
              </div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">
                3,65 jours de développement pur
              </div>
              <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                Périmètre strict de 8 pages simples sans module de géolocalisation.
              </p>
            </div>

            {/* Étape 2 : 642 € Base Officielle */}
            <div className="bg-emerald-50/70 p-4 rounded-xl border-2 border-emerald-700 relative shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                2. Base Officielle Validée
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-950">
                642,00 € HT
              </div>
              <div className="text-xs font-mono text-emerald-800 font-semibold mt-0.5">
                5,15 jours (3,65j dev + 1,5j socle)
              </div>
              <p className="text-[11px] text-emerald-900 mt-2.5 leading-relaxed">
                Ajout du <strong>Store Locator</strong> (qté 1 à 50 €) + socle technique, CDN Netlify et coordination.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    onApplyBase642();
                    onClose();
                  }}
                  className="w-full py-1.5 px-2.5 bg-emerald-800 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Charger cette configuration (642 €)</span>
                </button>
              </div>
            </div>

            {/* Étape 3 : Dérive 14.75j Réels */}
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                3. Réalité Terrain Constatée
              </span>
              <div className="text-xl font-bold font-mono text-rose-950">
                1 991,00 € HT
              </div>
              <div className="text-xs font-mono text-rose-700 font-bold mt-0.5">
                14,75 jours réels cumulés
              </div>
              <p className="text-[11px] text-rose-900 mt-2.5 leading-relaxed">
                Devis contesté par le client car l'écart de charge n'a pas été verrouillé au fur et à mesure.
              </p>
            </div>

          </div>

          {/* Detailed Audit of the 14.75 Days Drift */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 p-3 font-bold text-slate-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Autopsie de la Dérive : Décomposition des +9,60 jours d'excédent</span>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="p-3.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">4 vagues successives d'allers-retours client</div>
                  <p className="text-[11px] text-slate-500">
                    Modifications itératives hors jauge sans validation groupée : changements d’avis sur les polices, les espacements et les intitulés de cartes après intégration.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-amber-700 text-xs">+3,50 jours</span>
                  <span className="block text-[10px] text-slate-400">~470 €</span>
                </div>
              </div>

              <div className="p-3.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">Refonte intégrale V2 de la Carte Taproom / Bar</div>
                  <p className="text-[11px] text-slate-500">
                    Le client a changé la nomenclature de ses bières et exigé un système de badges de dégustation avec filtrage avancé non initialement chiffré.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-amber-700 text-xs">+2,80 jours</span>
                  <span className="block text-[10px] text-slate-400">~380 €</span>
                </div>
              </div>

              <div className="p-3.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">Gestion des Assets & Compression Vidéo 4K lourde</div>
                  <p className="text-[11px] text-slate-500">
                    Fourniture de rushs vidéos de 800 Mo bruts devant être transcodés en WebM/MP4, optimisés pour le mobile et hébergés sans ralentir le First Contentful Paint.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-amber-700 text-xs">+1,80 jour</span>
                  <span className="block text-[10px] text-slate-400">~245 €</span>
                </div>
              </div>

              <div className="p-3.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">Silences du client, ruptures de sprint et réouvertures</div>
                  <p className="text-[11px] text-slate-500">
                    Délais de réponse de plusieurs semaines entraînant la perte de contexte des développeurs (Odo, Anaïs) et des coûts de re-démarrage technique.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-amber-700 text-xs">+1,50 jour</span>
                  <span className="block text-[10px] text-slate-400">~200 €</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 flex justify-between font-mono font-bold text-slate-900 text-xs border-t border-slate-200">
              <span>Total Réel Constaté :</span>
              <span className="text-rose-700">14,75 jours réels (1 991,00 € HT)</span>
            </div>
          </div>

          {/* Solutions & Safeguards adopted in Suzali Pricing Studio */}
          <div className="bg-emerald-950 text-white p-5 rounded-xl space-y-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-sm text-emerald-100">
                La Solution de Gouvernance Adoptée dans cette Application
              </h4>
            </div>
            <p className="text-emerald-200 text-xs leading-relaxed">
              Pour éviter toute contestation future avec Roeum Mak ou les clients finaux :
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="bg-emerald-900/60 p-3 rounded-lg border border-emerald-800">
                <strong className="text-white block mb-1">1. Champ "Inclus" Contractuel Verrouillé</strong>
                Chaque ligne du devis liste exactement ce qui est couvert (ex: 2 filtres bières max, 1 vidéo optimisée).
              </div>
              <div className="bg-emerald-900/60 p-3 rounded-lg border border-emerald-800">
                <strong className="text-white block mb-1">2. Plafond Strict de 2 Vagues de Retours</strong>
                Toute révision au-delà de la 2ème vague déclenche automatiquement un avenant facturé au TJM de référence.
              </div>
              <div className="bg-emerald-900/60 p-3 rounded-lg border border-emerald-800">
                <strong className="text-white block mb-1">3. Transparence Tripartite</strong>
                Le partenaire (Roeum Mak) règle sa marge en direct sans frottement et le client signe sur un montant garanti.
              </div>
              <div className="bg-emerald-900/60 p-3 rounded-lg border border-emerald-800">
                <strong className="text-white block mb-1">4. Signature Numérique Horodatée</strong>
                Le devis A4 proforma fige la charge et les conditions générales opposables juridiquement.
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Projet Référent : Brasserie Bières Georges SAS
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
          >
            Compris & Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
