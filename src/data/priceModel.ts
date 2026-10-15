import { initialModules } from './initialModules';
import type { PriceList } from '../types/quote';

/**
 * Modèle de grille proposé pour un nouveau client du revendeur : les prix du devis de référence RM-2026-0013
 * (prix client par ligne, 65 € la retouche en plus). Une ligne laissée sans prix client dans ce devis suit
 * la règle de l'application et reprend son tarif de base.
 */
export const PRICE_MODEL: PriceList = {
  prices: {
    'page-contenu': 150,
    'page-homepage': 300,
    'page-liste-dynamique': 150,
    'page-detail-dynamique': 150,
    'page-duplication': 50,
    'opt-store-locator': 150,
    'opt-reservation-simple': 75,
    'opt-reservation-paiement': 150,
    'inc-traduction': 0,
    'inc-seo-technique': 0,
  },
  retouchPrice: 65,
};

/** Grille complète : chaque livrable de la grille a un prix (modèle si connu, sinon 0), pour que rien ne manque dans le devis du client */
export function completePriceList(list: PriceList | null | undefined): PriceList {
  const base = list && Object.keys(list.prices).length > 0 ? list : PRICE_MODEL;
  return {
    prices: Object.fromEntries(initialModules.map((m) => [m.id, base.prices[m.id] ?? PRICE_MODEL.prices[m.id] ?? 0])),
    retouchPrice: base.retouchPrice,
  };
}
