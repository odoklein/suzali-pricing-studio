import type { PageModule, PricingSettings, QuoteCalculations } from '../types/quote';

/** Identifiant de la ligne « retouches supplémentaires », ajoutée au devis client */
export const EXTRA_RETOUCHES_ID = 'extra-retouches';

/** Option à la carte, activable par le client */
export const isOptionModule = (mod: PageModule): boolean => mod.id.startsWith('opt-');

/** Coût de revient unitaire HT (grille forfaitaire ou charge × TJM) */
export function getUnitCost(mod: PageModule, settings: PricingSettings): number {
  return settings.mode === 'forfait' ? mod.basePrice : mod.days * settings.tjmSuzali;
}

/** Prix unitaire HT facturé au client : prix saisi par le partenaire, sinon prix d'achat (+ marge des anciens devis) */
export function getClientUnitPrice(mod: PageModule, settings: PricingSettings): number {
  if (mod.clientPrice !== undefined) return mod.clientPrice;
  return getUnitCost(mod, settings) * (1 + settings.partnerMarginPercent / 100);
}

/** Total HT client et charge (jours) d'un groupe de livrables */
export function sumModules(mods: PageModule[], settings: PricingSettings): { price: number; days: number } {
  return mods.reduce(
    (acc, m) => ({
      price: acc.price + getClientUnitPrice(m, settings) * m.quantity,
      days: acc.days + m.days * m.quantity,
    }),
    { price: 0, days: 0 }
  );
}

/** Prix client d'une retouche supplémentaire : celui du partenaire, sinon le prix d'achat */
export const retouchClientPrice = (settings: PricingSettings): number => settings.retouchClientPrice ?? settings.retouchUnitPrice;

/** Retouches comprises dans le forfait et retouches facturables (demandées au-delà du forfait) */
export function retouchBilling(
  modules: PageModule[],
  settings: PricingSettings
): { pageCount: number; included: number; billable: number; cost: number; price: number } {
  const pageCount = modules.reduce(
    (n, m) => (m.quantity > 0 && !isOptionModule(m) && m.id !== EXTRA_RETOUCHES_ID ? n + m.quantity : n),
    0
  );
  const included = pageCount * settings.retouchesIncludedPerPage;
  const billable = Math.max(0, Math.round(settings.retouchesRequested) - included);
  return {
    pageCount,
    included,
    billable,
    cost: billable * settings.retouchUnitPrice,
    price: billable * retouchClientPrice(settings),
  };
}

export interface ScheduleStep {
  label: string;
  percent: number;
}

/** Échéancier acompte / maquettes (40 %) / solde, toujours égal à 100 % */
export function paymentSchedule(depositPercent: number): ScheduleStep[] {
  const deposit = Math.min(100, Math.max(0, depositPercent));
  const middle = Math.min(40, 100 - deposit);
  return [
    { label: 'À la commande', percent: deposit },
    { label: 'Validation des maquettes', percent: middle },
    { label: 'Mise en production', percent: 100 - deposit - middle },
  ].filter((s) => s.percent > 0);
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
 * Calcul rigoureux des montants, marges et charges.
 * Le délai applique la marge de sécurité à la charge brute ; les retouches facturables
 * s'achètent au tarif de la régie et se vendent au prix client du partenaire (sans jours).
 */
export function computeQuoteCalculations(
  modules: PageModule[],
  settings: PricingSettings,
  depositPercent: number = 30
): QuoteCalculations {
  let activeModuleCount = 0;
  let totalDevDays = 0;
  let purchaseHT = 0;
  let sellingHT = 0;

  modules.forEach((mod) => {
    if (mod.quantity > 0) {
      activeModuleCount += 1;
      totalDevDays += mod.days * mod.quantity;
      purchaseHT += getUnitCost(mod, settings) * mod.quantity;
      sellingHT += getClientUnitPrice(mod, settings) * mod.quantity;
    }
  });

  const retouches = retouchBilling(modules, settings);
  const baseSuzaliCostHT = purchaseHT + retouches.cost;
  const sellingPriceHT = sellingHT + retouches.price;

  const bufferDays = totalDevDays * (settings.bufferPercent / 100);
  const totalDays = totalDevDays + bufferDays;

  // TVA et TTC
  const vatAmount = sellingPriceHT * (settings.vatRate / 100);
  const totalTTC = sellingPriceHT + vatAmount;

  const partnerMarginAmount = sellingPriceHT - baseSuzaliCostHT;
  const depositAmount = totalTTC * (Math.min(100, Math.max(0, depositPercent)) / 100);

  return {
    activeModuleCount,
    totalDevDays: Number(totalDevDays.toFixed(2)),
    bufferDays: Number(bufferDays.toFixed(2)),
    totalDays: Number(totalDays.toFixed(2)),
    pageCount: retouches.pageCount,
    retouchesIncluded: retouches.included,
    retouchesBillable: retouches.billable,
    retouchesCost: Number(retouches.cost.toFixed(2)),
    retouchesPrice: Number(retouches.price.toFixed(2)),
    baseSuzaliCostHT: Number(baseSuzaliCostHT.toFixed(2)),
    partnerMarginAmount: Number(partnerMarginAmount.toFixed(2)),
    netMarginAmount: Number(partnerMarginAmount.toFixed(2)),
    sellingPriceHT: Number(sellingPriceHT.toFixed(2)),
    finalSellingPriceHT: Number(sellingPriceHT.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    totalTTC: Number(totalTTC.toFixed(2)),
    depositAmount: Number(depositAmount.toFixed(2)),
  };
}
