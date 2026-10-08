import React, { useEffect, useRef, useState } from 'react';
import type { UserRole } from '../../types/quote';
import { Delete, Lock } from 'lucide-react';
import { PORTAL_CODES } from '../../data/portalCodes';

interface PortalGateProps {
  onUnlock: (role: UserRole) => void;
}

interface PortalConfig {
  role: UserRole;
  tab: string;
  title: string;
  subtitle: string;
  allowedCodes: string[];
}

const PIN_LENGTH = 4;

const PORTALS: PortalConfig[] = [
  {
    role: 'client',
    tab: 'Client',
    title: 'Espace Client',
    subtitle: 'Présenté par Roeum Mak',
    allowedCodes: PORTAL_CODES.client,
  },
  {
    role: 'partner',
    tab: 'Partenaire',
    title: 'Espace Partenaire',
    subtitle: 'Roeum Mak — Vente & marge',
    allowedCodes: PORTAL_CODES.partner,
  },
  {
    role: 'admin',
    tab: 'Interne',
    title: 'Accès interne',
    subtitle: 'Régie technique',
    allowedCodes: PORTAL_CODES.admin,
  },
];

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const detectHashRole = (): UserRole => {
  const hash = window.location.hash.toLowerCase();
  if (hash.includes('partner')) return 'partner';
  if (hash.includes('admin')) return 'admin';
  return 'client';
};

export const PortalGate: React.FC<PortalGateProps> = ({ onUnlock }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(detectHashRole);
  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activePortal = PORTALS.find((p) => p.role === selectedRole)!;

  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedRole]);

  const submit = (code: string) => {
    if (activePortal.allowedCodes.includes(code)) {
      onUnlock(selectedRole);
    } else {
      setHasError(true);
      setTimeout(() => {
        setPin('');
        setHasError(false);
        inputRef.current?.focus();
      }, 600);
    }
  };

  const updatePin = (next: string) => {
    if (hasError) return;
    const clean = next.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(clean);
    if (clean.length === PIN_LENGTH) submit(clean);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12 text-slate-900">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-10">
          <div className="mx-auto w-11 h-11 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center mb-6">
            <Lock className="w-4 h-4 text-slate-700" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{activePortal.title}</h1>
          <p className="text-sm text-slate-500 mt-1.5">{activePortal.subtitle}</p>
        </div>

        {/* Profile tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl border border-slate-100 bg-slate-50 mb-8">
          {PORTALS.map((portal) => (
            <button
              key={portal.role}
              type="button"
              onClick={() => {
                setSelectedRole(portal.role);
                setPin('');
                setHasError(false);
              }}
              className={`py-2 rounded-lg text-xs font-medium transition-all ${
                selectedRole === portal.role
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {portal.tab}
            </button>
          ))}
        </div>

        {/* PIN boxes (single hidden input keeps keyboard + mobile entry simple) */}
        <div className="relative mb-2">
          <input
            ref={inputRef}
            autoFocus
            type="password"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Code d'accès à 4 chiffres"
            value={pin}
            onChange={(e) => updatePin(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-default"
          />
          <div
            className={`grid grid-cols-4 gap-3 ${hasError ? 'animate-pulse' : ''}`}
            onClick={() => inputRef.current?.focus()}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => {
              const filled = i < pin.length;
              const isCurrent = i === pin.length && !hasError;
              return (
                <div
                  key={i}
                  className={`h-16 rounded-xl border flex items-center justify-center transition-all shadow-sm ${
                    hasError
                      ? 'border-rose-300 bg-rose-50'
                      : isCurrent
                      ? 'border-slate-900'
                      : 'border-slate-100'
                  }`}
                >
                  {filled && <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />}
                </div>
              );
            })}
          </div>
        </div>

        <p className={`h-5 text-center text-xs mb-6 ${hasError ? 'text-rose-600' : 'text-transparent'}`}>
          Code incorrect
        </p>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {NUMPAD_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => updatePin(pin + key)}
              className="h-14 rounded-xl border border-slate-100 bg-white shadow-sm font-mono text-lg font-medium text-slate-800 hover:bg-slate-50 active:scale-95 transition-all"
            >
              {key}
            </button>
          ))}
          <span />
          <button
            type="button"
            onClick={() => updatePin(pin + '0')}
            className="h-14 rounded-xl border border-slate-100 bg-white shadow-sm font-mono text-lg font-medium text-slate-800 hover:bg-slate-50 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => updatePin(pin.slice(0, -1))}
            aria-label="Effacer"
            className="h-14 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 active:scale-95 transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-10">
          Accès confidentiel et sécurisé
        </p>
      </div>
    </div>
  );
};
