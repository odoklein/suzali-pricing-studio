import type {
  Account,
  ClientMetadata,
  ClientSnapshot,
  PageModule,
  PriceList,
  PricingSettings,
  QuoteData,
} from '../types/quote';
import { initialMetadata, initialModules, initialSettings } from '../data/initialModules';
import {
  computeQuoteCalculations,
  getClientUnitPrice,
  retouchBilling,
  retouchClientPrice,
  isOptionModule,
  EXTRA_RETOUCHES_ID,
} from './formatters';

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
  const snapshotModules: PageModule[] = modules.map((m) => ({
    ...m,
    basePrice: round2(getClientUnitPrice(m, settings)),
    clientPrice: undefined,
    optional: isOptionModule(m),
    minQuantity: undefined,
  }));

  // Les retouches facturables deviennent une ligne du devis client (non optionnelle : le client ne la modifie pas)
  const retouches = retouchBilling(modules, settings);
  if (retouches.billable > 0) {
    snapshotModules.push({
      id: EXTRA_RETOUCHES_ID,
      name: 'Retouches supplémentaires',
      category: 'content',
      description: `Retouches demandées au-delà des ${retouches.included} incluses (${settings.retouchesIncludedPerPage} par page).`,
      includedDetails: '',
      basePrice: retouchClientPrice(settings),
      days: 0,
      quantity: retouches.billable,
      optional: false,
    });
  }

  return {
    modules: snapshotModules,
    settings: {
      mode: 'forfait',
      clientMode: 'forfait',
      tjmSuzali: 0,
      partnerMarginPercent: 0,
      bufferPercent: settings.bufferPercent,
      retouchesIncludedPerPage: settings.retouchesIncludedPerPage,
      // le client ne connaît que le prix client : jamais le prix d'achat
      retouchUnitPrice: retouchClientPrice(settings),
      retouchClientPrice: retouchClientPrice(settings),
      retouchesRequested: 0,
      vatRate: settings.vatRate,
      discountPercent: 0,
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
    partnerLegalForm: account.legalForm ?? '',
    partnerShareCapital: account.shareCapital ?? '',
    partnerRcs: account.rcs ?? '',
    partnerVat: account.vatNumber ?? '',
    partnerWebsite: account.website ?? '',
  };
}

/**
 * Devis d'un client du revendeur : un seul prix par ligne (basePrice), celui de la grille du revendeur.
 * Même règle que le serveur (app_quote_mask) : ni prix d'achat, ni prix client distinct, ni TJM.
 */
export function toListedPricing(
  modules: PageModule[],
  settings: PricingSettings
): { modules: PageModule[]; settings: PricingSettings } {
  return {
    modules: modules.map((m) => {
      const { clientPrice: _clientPrice, ...rest } = m;
      return { ...rest, basePrice: round2(getClientUnitPrice(m, settings)) };
    }),
    settings: {
      ...settings,
      mode: 'forfait',
      clientMode: 'forfait',
      clientTjm: undefined,
      tjmSuzali: 0,
      partnerMarginPercent: 0,
      discountPercent: 0,
      retouchUnitPrice: retouchClientPrice(settings),
      retouchClientPrice: undefined,
    },
  };
}

/** Livrables de la grille, au prix de la grille du revendeur ; une ligne sans prix dans la grille n'est pas proposée */
export function modulesFromPriceList(list: PriceList): PageModule[] {
  return initialModules
    .filter((m) => list.prices[m.id] !== undefined)
    .map((m) => ({ ...m, basePrice: list.prices[m.id] }));
}

/** Données initiales d'un nouveau devis : grille de référence en forfait, tarif journalier du compte conservé pour le mode TJM */
export function newQuoteData(account: Account, client?: Account | null): QuoteData {
  // les prix suivent la grille du client choisi (ou celle du compte connecté s'il est lui-même un client du revendeur)
  const priced = client ?? account;
  const listed = priced.managed && priced.priceList ? priced.priceList : null;
  const modules = listed ? modulesFromPriceList(listed) : initialModules.map((m) => ({ ...m }));
  const settings: PricingSettings = listed
    ? { ...initialSettings, tjmSuzali: 0, retouchUnitPrice: listed.retouchPrice }
    : { ...initialSettings, tjmSuzali: account.dailyRate };
  const metadata: ClientMetadata = {
    ...initialMetadata,
    ...issuerMetadata(account),
    projectName: 'Nouveau projet',
    quoteNumber: '',
    notes: '',
    clientCompany: client?.name ?? '',
    clientContact: client?.contactName ?? '',
    clientEmail: client?.email ?? '',
    clientAddress: client?.address ?? '',
    issueDate: new Date().toISOString().split('T')[0],
  };
  return buildQuoteData(modules, settings, metadata);
}
