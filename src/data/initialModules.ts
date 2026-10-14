import type { PageModule, ClientMetadata, PricingSettings } from '../types/quote';

/** Prix d'une journée de référence (€ HT) : sert à convertir le prix d'achat d'un livrable en charge. */
export const REFERENCE_DAY_RATE = 75;

const daysFor = (price: number) => Math.round((price / REFERENCE_DAY_RATE) * 100) / 100;

/**
 * Grille tarifaire de référence (tableau Clémentine).
 * `basePrice` est le prix d'achat unitaire ; la charge en jours en est déduite (prix ÷ 75 €/j).
 */
export const initialModules: PageModule[] = [
  {
    id: 'page-accueil',
    name: "Page d'accueil",
    category: 'core',
    description: "Page d'accueil complète avec sections clés et CTA.",
    includedDetails: "Page d'accueil complète avec sections clés et CTA.",
    basePrice: 120,
    days: daysFor(120),
    quantity: 1,
  },
  {
    id: 'page-service-modele',
    name: 'Page service modèle',
    category: 'core',
    description: 'Création d’un modèle réutilisable pour les pages services.',
    includedDetails: 'Création d’un modèle réutilisable pour les pages services.',
    basePrice: 100,
    days: daysFor(100),
    quantity: 1,
  },
  {
    id: 'page-declinaison-service',
    name: 'Déclinaison service',
    category: 'core',
    description: 'Adaptation du modèle pour un service supplémentaire.',
    includedDetails: 'Adaptation du modèle pour un service supplémentaire.',
    basePrice: 50,
    days: daysFor(50),
    quantity: 1,
  },
  {
    id: 'page-statique-simple',
    name: 'Page statique simple',
    category: 'content',
    description: 'Page fixe avec texte, images et mise en page simple.',
    includedDetails: 'Page fixe avec texte, images et mise en page simple.',
    basePrice: 60,
    days: daysFor(60),
    quantity: 2,
  },
  {
    id: 'page-semi-dynamique',
    name: 'Page semi-dynamique',
    category: 'content',
    description: 'Page fixe avec blocs administrables ou liens vers pages détail.',
    includedDetails: 'Page fixe avec blocs administrables ou liens vers pages détail.',
    basePrice: 80,
    days: daysFor(80),
    quantity: 2,
  },
  {
    id: 'blog-complet',
    name: 'Blog complet',
    category: 'interactive',
    description: 'Page liste du blog + modèle d’article, regroupant les articles ou parutions.',
    includedDetails: 'Page liste du blog + modèle d’article, regroupant les articles ou parutions.',
    basePrice: 100,
    days: daysFor(100),
    quantity: 1,
  },
];

export const initialMetadata: ClientMetadata = {
  projectName: 'Nouveau projet',
  clientCompany: '',
  clientContact: '',
  clientEmail: '',
  clientAddress: '',
  partnerCompany: '',
  partnerTagline: '',
  partnerContact: '',
  partnerEmail: '',
  partnerPhone: '',
  partnerAddress: '',
  partnerSiret: '',
  quoteNumber: '',
  issueDate: new Date().toISOString().split('T')[0],
  validityDays: 30,
  depositPercentage: 30,
  notes: '',
};

export const initialSettings: PricingSettings = {
  mode: 'forfait',
  tjmSuzali: REFERENCE_DAY_RATE,
  partnerMarginPercent: 0,
  bufferPercent: 30,
  retouchesIncludedPerPage: 2,
  retouchUnitPrice: 45,
  retouchesRequested: 0,
  vatRate: 20,
  discountPercent: 0,
};
