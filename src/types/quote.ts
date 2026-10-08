export type UserRole = 'admin' | 'partner' | 'client';

export type PricingMode = 'forfait' | 'tjm';

export interface PageModule {
  id: string;
  name: string;
  category: 'core' | 'content' | 'interactive' | 'ecommerce' | 'compliance';
  description: string;
  includedDetails: string; // Descriptif modifiable de ce qui est inclus
  basePrice: number;       // Coût de production de base Suzali (€ HT)
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
  quoteNumber: string;
  issueDate: string;
  validityDays: number;
  depositPercentage: number;
  notes: string;
}

export interface PricingSettings {
  mode: PricingMode;
  tjmSuzali: number;          // TJM interne de référence (€/j)
  partnerMarginPercent: number; // Marge commerciale partenaire (%)
  managementDaysFixed: number;  // Gestion de projet & socle technique (j)
  vatRate: number;              // TVA standard (ex: 20%)
  discountPercent: number;      // Remise éventuelle (%)
}

export interface QuoteCalculations {
  activeModuleCount: number;
  totalDevDays: number;
  totalManagementDays: number;
  totalDays: number;
  baseSuzaliCostHT: number;
  partnerMarginAmount: number;
  sellingPriceHT: number;
  discountAmount: number;
  finalSellingPriceHT: number;
  vatAmount: number;
  totalTTC: number;
  depositAmount: number;
}

export type AccountRole = 'admin' | 'owner' | 'partner';
export type QuoteStatus = 'draft' | 'sent' | 'signed';

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
