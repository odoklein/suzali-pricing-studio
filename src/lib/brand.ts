import { useEffect, useState } from 'react';
import { getBrand } from './api';

export interface Brand {
  name: string;
  logo: string | null;
}

let cached: Promise<Brand | null> | null = null;

/** Nom et logo du revendeur, chargés une fois ; null si indisponibles (l'écran garde alors sa marque par défaut) */
function loadBrand(): Promise<Brand | null> {
  cached ??= getBrand()
    .then((b) => (b.name ? { name: b.name, logo: b.logo ?? null } : null))
    .catch(() => null);
  return cached;
}

export function useBrand(): Brand | null {
  const [brand, setBrand] = useState<Brand | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadBrand().then((b) => {
      if (!cancelled) setBrand(b);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return brand;
}
