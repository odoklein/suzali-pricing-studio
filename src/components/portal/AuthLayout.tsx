import React from 'react';
import { Monogram } from '../ui/display';
import { useBrand } from '../../lib/brand';

interface AuthLayoutProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Cadre commun des écrans d'accès : marque, carte centrée, pied discret. */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, description, children, footer }) => {
  const brand = useBrand();
  return (
  <main className="grid min-h-dvh place-items-center bg-chrome px-4 py-10">
    <div className="w-full max-w-[400px] animate-pop-in">
      <div className="mb-7 flex items-center justify-center gap-2.5">
        {brand?.logo ? (
          <img src={brand.logo} alt={brand.name} className="h-10 max-w-[220px] object-contain" />
        ) : (
          <>
            <Monogram label="RM" size={30} />
            <span className="text-body font-semibold tracking-title">{brand?.name ?? 'Roeum Mak'}</span>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-7 shadow-raised">
        <h1 className="text-h2 font-semibold tracking-title">{title}</h1>
        {description && <p className="mt-1.5 text-ui text-muted">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="mt-5 text-center text-xs text-muted">{footer}</div>}
    </div>
  </main>
  );
};
