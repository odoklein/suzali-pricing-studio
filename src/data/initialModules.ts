import type { PageModule, ClientMetadata, PricingSettings } from '../types/quote';

/**
 * Grille tarifaire initiale Suzali Conseil
 * Cas d'école réel : Projet Bières Georges
 * - 8 pages de base = 592 € HT (3,65 jours ouvrés de développement pur)
 * - Module Store Locator (qté 1 = +50 € HT) => Total base = EXACTEMENT 642 € HT
 * - Socle technique & gestion = 1,50 j => 5,15 jours ouvrés au total
 */
export const initialModules: PageModule[] = [
  {
    id: 'page-home',
    name: 'Page Accueil / Landing Interactive',
    category: 'core',
    description: 'Vitrine immersive de la brasserie avec hero vidéo, teaser carte et ambiance Georges.',
    includedDetails: 'Hero vidéo plein écran optimisé, accroche de marque, aperçu des bières phares à la pression, agenda des 2 prochains concerts, bouton de réservation rapide.',
    basePrice: 140,
    days: 0.80,
    quantity: 1,
    minQuantity: 1,
  },
  {
    id: 'page-story',
    name: "Page L'Histoire & La Brasserie",
    category: 'content',
    description: 'Storytelling patrimonial, savoir-faire brassicole et engagements bio/locaux.',
    includedDetails: 'Frise chronologique interactive, présentation des maîtres brasseurs, charte des ingrédients 100% bio et terroir, visite visuelle des cuves de brassage.',
    basePrice: 65,
    days: 0.40,
    quantity: 1,
  },
  {
    id: 'page-menu',
    name: 'Page La Carte & Taproom',
    category: 'interactive',
    description: 'Carte des bières permanentes et éphémères, planches de dégustation et food.',
    includedDetails: 'Filtres dynamiques par style (IPA, Stout, Blonde, Sour), degré IBU/alcool, notes de dégustation, accord mets & bières, tarifs au galopin et à la pinte.',
    basePrice: 95,
    days: 0.60,
    quantity: 1,
  },
  {
    id: 'page-events',
    name: 'Page Événements & Programmation',
    category: 'content',
    description: 'Agenda des concerts live, retransmissions sportives, quiz et soirées taproom.',
    includedDetails: 'Calendrier mensuel interactif, fiches artistes avec liens audio/vidéo, bouton "Ajouter à mon Google Agenda / iCal", module alertes soirées.',
    basePrice: 68,
    days: 0.40,
    quantity: 1,
  },
  {
    id: 'page-privatisation',
    name: 'Page Privatisation & Groupes',
    category: 'interactive',
    description: 'Offres pour afterworks d’entreprises, anniversaires et séminaires.',
    includedDetails: 'Formulaire de demande de devis sur-mesure (jauge, date, formule buffet/fûts), présentation des 3 espaces privatisables avec capacités d’accueil.',
    basePrice: 68,
    days: 0.40,
    quantity: 1,
  },
  {
    id: 'page-gallery',
    name: 'Page Galerie Photos & Ambiance',
    category: 'content',
    description: 'Immersion photographique dans le lieu, la terrasse et la fabrication.',
    includedDetails: 'Grille responsive type masonry, visualiseur plein écran (lightbox ultra-léger), optimisation webp haute performance pour les clichés haute résolution.',
    basePrice: 52,
    days: 0.35,
    quantity: 1,
  },
  {
    id: 'page-practical',
    name: 'Page Infos Pratiques, Accès & Contact',
    category: 'core',
    description: 'Localisation, transports, horaires en temps réel et coordonnées directes.',
    includedDetails: 'Plan d’accès vectoriel, stationnements vélos/voitures et TCL, indicateur d’ouverture en direct, formulaire de contact général sécurisé antispam.',
    basePrice: 64,
    days: 0.40,
    quantity: 1,
  },
  {
    id: 'page-legal',
    name: 'Page Mentions Légales & RGPD',
    category: 'compliance',
    description: 'Conformité légale française obligatoire et politique de confidentialité.',
    includedDetails: 'Mentions éditeur & hébergeur, avertissement Loi Évin obligatoire sur l’alcool ("À consommer avec modération"), politique de gestion des cookies sans traceurs intrusifs.',
    basePrice: 40,
    days: 0.30,
    quantity: 1,
  },
  {
    id: 'module-store-locator',
    name: 'Module Store Locator / Points de Vente',
    category: 'interactive',
    description: 'Carte interactive des cavistes, bars et restaurants distribuant Bières Georges.',
    includedDetails: 'Moteur de recherche par code postal / ville, géolocalisation navigateur, géocodage OpenStreetMap sans surcoût API Google, fiche détail par revendeur.',
    basePrice: 50,
    days: 0.35,
    quantity: 1, // Activé par défaut pour atteindre les 642 € HT réels
  },
  {
    id: 'opt-booking',
    name: 'Option : Module Réservation Taproom',
    category: 'interactive',
    description: 'Intégration d’un module de réservation de table en direct (Zenchef ou sur-mesure).',
    includedDetails: 'Widget de réservation temps réel, confirmation par SMS/email, synchronisation avec le carnet de salle du barman, gestion des créneaux de rush.',
    basePrice: 65,
    days: 0.40,
    quantity: 0,
  },
  {
    id: 'opt-ecommerce',
    name: 'Option : Boutique Click & Collect Bières & Merch',
    category: 'ecommerce',
    description: 'Vente en ligne de cartons de bières, verres sérigraphiés et t-shirts.',
    includedDetails: 'Catalogue produits avec gestion du stock, paiement sécurisé Stripe / Apple Pay, sélection du créneau de retrait au bar, génération automatique de facture.',
    basePrice: 120,
    days: 0.75,
    quantity: 0,
  },
  {
    id: 'opt-multilang',
    name: 'Option : Déclinaison Bilingue (Français / Anglais)',
    category: 'content',
    description: 'Traduction intégrale pour la clientèle touristique et internationale de Lyon.',
    includedDetails: 'Sélecteur de langue persistant, routage sous-répertoires /en/, balises hreflang SEO internationales, intégration des textes traduits fournis.',
    basePrice: 75,
    days: 0.45,
    quantity: 0,
  },
  {
    id: 'opt-age-gate',
    name: 'Option : Pop-up Âge Légal (+18 ans)',
    category: 'compliance',
    description: 'Vérification d’âge obligatoire conforme aux recommandations sanitaires.',
    includedDetails: 'Modal de confirmation avec mémorisation de cookie de session, redirection en cas de refus vers page de prévention, non-blocage des robots de référencement.',
    basePrice: 35,
    days: 0.20,
    quantity: 0,
  }
];

export const initialMetadata: ClientMetadata = {
  projectName: 'Refonte Site Web & Taproom Bières Georges',
  clientCompany: 'Brasserie Bières Georges SAS',
  clientContact: 'Julien & Équipe Direction',
  clientEmail: 'contact@bieres-georges.fr',
  clientAddress: '30 Cours de Verdun Gensoul, 69002 Lyon, France',
  partnerCompany: '33 Degrés (Agence Partenaire)',
  partnerContact: 'Maxime / Thomas',
  partnerEmail: 'contact@33degres.com',
  quoteNumber: 'SZ-2026-BG-642',
  issueDate: new Date().toISOString().split('T')[0],
  validityDays: 30,
  depositPercentage: 30,
  notes: 'Proposition technique d’architecture modulaire haute performance (React + Vite + Tailwind). Livrables hébergés sur CDN mondial Netlify avec certificat SSL Let’s Encrypt et nom de domaine client.'
};

export const initialSettings: PricingSettings = {
  mode: 'forfait',
  tjmSuzali: 175,
  partnerMarginPercent: 35,
  managementDaysFixed: 1.50,
  vatRate: 20,
  discountPercent: 0,
};
