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
