import type {
  Account,
  ClientMetadata,
  ClientSnapshot,
  PageModule,
  PricingSettings,
  QuoteData,
} from '../types/quote';
import { initialMetadata, initialModules, initialSettings } from '../data/initialModules';
import { computeQuoteCalculations, getClientUnitPrice } from './formatters';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Construit la version « client » du devis : prix de vente par ligne, sans coût de revient
 * ni marge. C'est la seule donnée que le serveur transmet à l'espace client.
 */
export function buildClientSnapshot(
  modules: PageModule[],
  settings: PricingSettings,
  metadata: ClientMetadata
): ClientSnapshot {
  return {
    modules: modules.map((m) => ({
      ...m,
      basePrice: round2(getClientUnitPrice(m, settings)),
      optional: m.id.startsWith('opt-'),
      minQuantity: undefined,
    })),
    settings: {
      mode: 'forfait',
      tjmSuzali: 0,
      partnerMarginPercent: 0,
      managementDaysFixed: settings.managementDaysFixed,
      vatRate: settings.vatRate,
      discountPercent: settings.discountPercent,
    },
    metadata,
  };
}

export function buildQuoteData(
  modules: PageModule[],
  settings: PricingSettings,
  metadata: ClientMetadata
): QuoteData {
  return { modules, settings, metadata, clientSnapshot: buildClientSnapshot(modules, settings, metadata) };
}

export function snapshotTotalHt(snapshot: ClientSnapshot): number {
  return computeQuoteCalculations(snapshot.modules, snapshot.settings).finalSellingPriceHT;
}

/** Coordonnées de l'émetteur imprimées sur le devis, issues du compte connecté */
export function issuerMetadata(account: Account): Partial<ClientMetadata> {
  return {
    partnerCompany: account.name,
    partnerTagline: account.tagline,
    partnerContact: account.contactName || account.name,
    partnerEmail: account.email,
    partnerPhone: account.phone,
    partnerAddress: account.address,
    partnerSiret: account.siret,
  };
}

/** Données initiales d'un nouveau devis, au tarif journalier du compte */
export function newQuoteData(account: Account): QuoteData {
  const modules = initialModules.map((m) => ({ ...m }));
  const settings: PricingSettings = {
    ...initialSettings,
    mode: 'tjm',
    tjmSuzali: account.dailyRate,
    partnerMarginPercent: 0,
  };
  const metadata: ClientMetadata = {
    ...initialMetadata,
    ...issuerMetadata(account),
    projectName: 'Nouveau projet',
    clientCompany: '',
    clientContact: '',
    clientEmail: '',
    clientAddress: '',
    issueDate: new Date().toISOString().split('T')[0],
  };
  return buildQuoteData(modules, settings, metadata);
}
