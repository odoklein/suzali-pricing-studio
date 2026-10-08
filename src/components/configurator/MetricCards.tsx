import React from 'react';
import type { UserRole, QuoteCalculations, PricingSettings } from '../../types/quote';
import { formatEuros, formatDays, formatPercent } from '../../utils/formatters';
import { Clock, TrendingUp, DollarSign, Wallet, CheckCircle2 } from 'lucide-react';

interface MetricCardsProps {
  currentRole: UserRole;
  calculations: QuoteCalculations;
  settings: PricingSettings;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  currentRole,
  calculations,
  settings,
}) => {
  const isClient = currentRole === 'client';
  const isPartner = currentRole === 'partner';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* CARD 1: Délai estimé */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Délai Estimé
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {formatDays(calculations.totalDays)}
          </span>
          <span className="text-xs text-slate-500 font-medium">ouvrés</span>
        </div>
        <div className="mt-2 text-xs text-slate-600 flex items-center space-x-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>
            {calculations.totalDevDays}j dév + {calculations.totalManagementDays}j socle/gestion
          </span>
        </div>
      </div>

      {/* CARD 2: Coût Suzali (ou Investissement HT en mode client) */}
      {!isClient ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Coût Suzali Base
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100/60 text-emerald-800 font-medium">
                Interne
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-950 tracking-tight">
              {formatEuros(calculations.baseSuzaliCostHT)}
            </span>
            <span className="text-xs text-slate-500 font-medium">HT</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Charge {settings.mode === 'forfait' ? 'grille forfaitaire' : `au TJM (${settings.tjmSuzali} €/j)`}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sous-Total HT
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {formatEuros(calculations.finalSellingPriceHT)}
            </span>
            <span className="text-xs text-slate-500 font-medium">HT</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{calculations.activeModuleCount} modules & pages inclus</span>
          </div>
        </div>
      )}

      {/* CARD 3: Prix Vente Client HT (ou TVA 20% en mode client) */}
      {!isClient ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Prix Vente Client
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-indigo-950 tracking-tight">
              {formatEuros(calculations.finalSellingPriceHT)}
            </span>
            <span className="text-xs text-slate-500 font-medium">HT</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Total TTC : <span className="font-mono font-semibold text-slate-800">{formatEuros(calculations.totalTTC)}</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              TVA (20%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {formatEuros(calculations.vatAmount)}
            </span>
            <span className="text-xs text-slate-500 font-medium">TVA</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            TVA standard déductible en France
          </div>
        </div>
      )}

      {/* CARD 4: Marge Commerciale (ou Total TTC Client) */}
      {!isClient ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Marge Partenaire
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100/70 text-indigo-800 font-bold font-mono">
                +{formatPercent(settings.partnerMarginPercent)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-800 tracking-tight">
              +{formatEuros(calculations.partnerMarginAmount)}
            </span>
            <span className="text-xs text-slate-500 font-medium">gain</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            {isPartner ? 'Votre marge d’agence brute' : 'Marge commerciale concédée'}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950 text-white rounded-2xl p-5 border border-emerald-900 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Total Net TTC
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-800/80 flex items-center justify-center text-emerald-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-100 tracking-tight">
              {formatEuros(calculations.totalTTC)}
            </span>
            <span className="text-xs text-emerald-300 font-medium">TTC</span>
          </div>
          <div className="mt-2 text-xs text-emerald-300">
            Acompte 30% : <span className="font-mono font-bold text-white">{formatEuros(calculations.depositAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
