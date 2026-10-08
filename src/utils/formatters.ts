import type { PageModule, PricingSettings, QuoteCalculations } from '../types/quote';

export const CORE_MODULE_IDS = [
  'page-home', 'page-story', 'page-menu', 'page-events',
  'page-privatisation', 'page-gallery', 'page-practical', 'page-legal',
];
export const LOCATOR_MODULE_ID = 'module-store-locator';

/** Prix unitaire HT facturé au client (coût de production + marge commerciale) */
export function getClientUnitPrice(mod: PageModule, settings: PricingSettings): number {
  const base = settings.mode === 'forfait' ? mod.basePrice : mod.days * settings.tjmSuzali;
  return base * (1 + settings.partnerMarginPercent / 100);
}

/** Le n° de devis interne (SZ-…) est présenté côté client sous la marque Roeum Mak (RM-…) */
export function displayQuoteNumber(quoteNumber: string): string {
  return quoteNumber.replace(/^SZ-/i, 'RM-');
}

export function formatEuros(amount: number, showDecimals: boolean = true): string {
  if (isNaN(amount)) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

export function formatDays(days: number): string {
  if (isNaN(days)) return '0,00 j';
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(days)} j`;
}

export function formatPercent(percent: number): string {
  if (isNaN(percent)) return '0 %';
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(percent)} %`;
}

export function formatFrenchDate(dateInput?: string | Date): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function addDays(dateStr: string, daysToAdd: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split('T')[0];
}

/**
 * Calcul rigoureux des montants, marges et charges
 */
export function computeQuoteCalculations(
  modules: PageModule[],
  settings: PricingSettings
): QuoteCalculations {
  let activeModuleCount = 0;
  let totalDevDays = 0;
  let baseSuzaliCostHT = 0;

  modules.forEach((mod) => {
    if (mod.quantity > 0) {
      activeModuleCount += 1;
      totalDevDays += mod.days * mod.quantity;

      if (settings.mode === 'forfait') {
        baseSuzaliCostHT += mod.basePrice * mod.quantity;
      } else {
        baseSuzaliCostHT += mod.days * mod.quantity * settings.tjmSuzali;
      }
    }
  });

  const totalManagementDays = settings.managementDaysFixed;
  const totalDays = totalDevDays + totalManagementDays;

  // Calcul du prix de vente HT avant remise (majoration partenaire)
  const marginMultiplier = 1 + (settings.partnerMarginPercent / 100);
  const sellingPriceHT = baseSuzaliCostHT * marginMultiplier;
  const partnerMarginAmount = sellingPriceHT - baseSuzaliCostHT;

  // Application de la remise commerciale éventuelle
  const discountAmount = sellingPriceHT * (settings.discountPercent / 100);
  const finalSellingPriceHT = Math.max(0, sellingPriceHT - discountAmount);

  // TVA et TTC
  const vatAmount = finalSellingPriceHT * (settings.vatRate / 100);
  const totalTTC = finalSellingPriceHT + vatAmount;

  // Acompte indicatif (30% par défaut)
  const depositAmount = totalTTC * 0.30;

  return {
    activeModuleCount,
    totalDevDays: Number(totalDevDays.toFixed(2)),
    totalManagementDays: Number(totalManagementDays.toFixed(2)),
    totalDays: Number(totalDays.toFixed(2)),
    baseSuzaliCostHT: Number(baseSuzaliCostHT.toFixed(2)),
    partnerMarginAmount: Number(partnerMarginAmount.toFixed(2)),
    sellingPriceHT: Number(sellingPriceHT.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    finalSellingPriceHT: Number(finalSellingPriceHT.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    totalTTC: Number(totalTTC.toFixed(2)),
    depositAmount: Number(depositAmount.toFixed(2)),
  };
}
