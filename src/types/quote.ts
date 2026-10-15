export type UserRole = 'admin' | 'partner' | 'client';

export type PricingMode = 'forfait' | 'tjm';

export interface PageModule {
  id: string;
  name: string;
  category: 'core' | 'content' | 'interactive' | 'ecommerce' | 'compliance';
  description: string;
  includedDetails: string; // Descriptif modifiable de ce qui est inclus
  basePrice: number;       // Prix d'achat unitaire (€ HT)
  clientPrice?: number;    // Prix client unitaire saisi par le partenaire (défaut : prix d'achat)
  days: number;            // Charge estimée en jours ouvrés ( Suzali dev )
  quantity: number;        // Stepper quantité (0 si désactivé, >= 1 si actif)
  minQuantity?: number;
  maxQuantity?: number;
  isCustom?: boolean;
  optional?: boolean;      // Option à la carte (activable par le client) — renseigné dans le devis client
}

export interface ClientMetadata {
  projectName: string;
  clientCompany: string;
  clientContact: string;
  clientEmail: string;
  clientAddress: string;
  partnerCompany: string;
  partnerContact: string;
  partnerEmail: string;
  partnerTagline: string;
  partnerPhone: string;
  partnerAddress: string;
  partnerSiret: string;
  /** Mentions légales de l'émetteur (absentes des anciens devis) */
  partnerLegalForm?: string;
  partnerShareCapital?: string;
  partnerRcs?: string;
  partnerVat?: string;
  partnerWebsite?: string;
  quoteNumber: string;
  issueDate: string;
  validityDays: number;
  depositPercentage: number;
  notes: string;
}

export interface PricingSettings {
  mode: PricingMode;
  tjmSuzali: number;          // TJM interne de référence (€/j)
  /** Modèle de prix facturé au client par le partenaire (défaut : forfait, prix saisi par ligne) */
  clientMode?: PricingMode;
  /** TJM facturé au client en mode « Temps passé » (défaut : tarif d'achat) */
  clientTjm?: number;
  partnerMarginPercent: number; // Marge commerciale partenaire (%)
  bufferPercent: number;        // Marge de sécurité appliquée au délai (%)
  retouchesIncludedPerPage: number; // Retouches comprises dans le forfait, par page
  retouchUnitPrice: number;     // Prix d'achat d'une retouche supplémentaire (€ HT)
  retouchClientPrice?: number;  // Prix client d'une retouche supplémentaire (défaut : prix d'achat)
  retouchesRequested: number;   // Retouches demandées au total (globales)
  vatRate: number;              // TVA standard (ex: 20%)
  /** Hérité des anciens devis : plus exposé ni appliqué */
  discountPercent: number;
}

export interface QuoteCalculations {
  activeModuleCount: number;
  /** Charge brute en jours, avant marge de sécurité */
  totalDevDays: number;
  /** Jours de marge de sécurité */
  bufferDays: number;
  /** Délai total en jours (charge + marge de sécurité) */
  totalDays: number;
  pageCount: number;
  retouchesIncluded: number;
  retouchesBillable: number;
  /** Retouches facturables au prix d'achat */
  retouchesCost: number;
  /** Retouches facturables au prix client */
  retouchesPrice: number;
  baseSuzaliCostHT: number;
  partnerMarginAmount: number;
  /** Marge après remise : ce que le partenaire gagne réellement */
  netMarginAmount: number;
  sellingPriceHT: number;
  finalSellingPriceHT: number;
  vatAmount: number;
  totalTTC: number;
  depositAmount: number;
}

/**
 * Lecture des prix d'un devis :
 * - resale : prix d'achat de la régie + prix client saisi par le partenaire
 * - listed : devis d'un client du revendeur, vu par le revendeur ou la régie (un prix par ligne, modifiable)
 * - fixed  : même devis vu par le client du revendeur (un prix par ligne, en lecture seule)
 */
export type PricingView = 'resale' | 'listed' | 'fixed';

export type AccountRole = 'admin' | 'owner' | 'partner';
export type QuoteStatus = 'draft' | 'sent' | 'signed';

/** Tarifs fixés par le revendeur pour l'un de ses clients : prix HT unitaire par livrable (id de la grille) et par retouche en plus */
export interface PriceList {
  prices: Record<string, number>;
  retouchPrice: number;
}

export interface Account {
  id: string;
  role: AccountRole;
  name: string;
  tagline: string;
  dailyRate: number;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  siret: string;
  active: boolean;
  /** Mot de passe provisoire : à remplacer avant toute autre action */
  mustChangePassword?: boolean;
  /** Mentions légales imprimées sur les devis */
  legalForm?: string;
  shareCapital?: string;
  rcs?: string;
  vatNumber?: string;
  website?: string;
  /** Client du revendeur : ne voit jamais le prix d'achat et ne fixe aucun prix, il applique la grille du revendeur */
  managed?: boolean;
  /** Grille de prix d'un client du revendeur (absente pour les autres comptes) */
  priceList?: PriceList | null;
}

export interface PartnerAccount extends Account {
  quoteCount: number;
  signedCount: number;
}

export interface QuoteSummary {
  id: string;
  reference: string;
  title: string;
  clientName: string;
  clientEmail: string;
  status: QuoteStatus;
  totalHt: number;
  accountId: string;
  accountName: string;
  /** Devis d'un client du revendeur : un seul prix par ligne, fixé par la grille du revendeur */
  accountManaged: boolean;
  updatedAt: string;
  createdAt: string;
  signedAt: string | null;
  signedBy: string | null;
}

/** Version du devis exposée au client : prix de vente uniquement, jamais les coûts ni la marge. */
export interface ClientSnapshot {
  modules: PageModule[];
  settings: PricingSettings;
  metadata: ClientMetadata;
}

export interface QuoteData {
  modules: PageModule[];
  settings: PricingSettings;
  metadata: ClientMetadata;
  clientSnapshot: ClientSnapshot;
}

export interface QuoteRecord extends QuoteSummary {
  data: QuoteData;
  shareToken: string;
  signature: string | null;
}

export interface Issuer {
  name: string;
  tagline: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  siret: string;
  legalForm?: string;
  shareCapital?: string;
  rcs?: string;
  vatNumber?: string;
  website?: string;
}

export interface ClientQuoteView {
  reference: string;
  title: string;
  status: QuoteStatus;
  snapshot: ClientSnapshot;
  issuer: Issuer;
  signedBy: string | null;
  signedAt: string | null;
  signature: string | null;
  updatedAt: string;
}
