import React, { useEffect, useRef, useState } from 'react';
import { Delete, Lock } from 'lucide-react';

interface PortalGateProps {
  /** Retourne null si la connexion a réussi, sinon le code d'erreur */
  onSubmit: (pin: string) => Promise<'invalid_pin' | 'too_many_attempts' | 'network' | null>;
  notice?: string | null;
}

const PIN_LENGTH = 4;
const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const MESSAGES: Record<string, string> = {
  invalid_pin: 'Code incorrect',
  too_many_attempts: 'Trop de tentatives. Réessayez dans quelques minutes.',
  network: 'Connexion impossible. Réessayez.',
};

export const PortalGate: React.FC<PortalGateProps> = ({ onSubmit, notice }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (code: string) => {
    setBusy(true);
    const result = await onSubmit(code);
    if (result === null) return; // l'écran est remplacé par l'application
    setBusy(false);
    setError(result);
    setTimeout(() => {
      setPin('');
      setError(null);
      inputRef.current?.focus();
    }, 1200);
  };

  const updatePin = (next: string) => {
    if (busy || error) return;
    const clean = next.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(clean);
    if (clean.length === PIN_LENGTH) void submit(clean);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12 text-slate-900">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <div className="mx-auto w-11 h-11 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center mb-6">
            <Lock className="w-4 h-4 text-slate-700" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Espace sécurisé</h1>
          <p className="text-sm text-slate-500 mt-1.5">Saisissez votre code d'accès</p>
        </div>

        {notice && (
          <p className="mb-6 text-center text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3">
            {notice}
          </p>
        )}

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
            className={`grid grid-cols-4 gap-3 ${error ? 'animate-pulse' : ''}`}
            onClick={() => inputRef.current?.focus()}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={`h-16 rounded-xl border flex items-center justify-center transition-all shadow-sm ${
                  error
                    ? 'border-rose-300 bg-rose-50'
                    : i === pin.length && !busy
                    ? 'border-slate-900'
                    : 'border-slate-100'
                }`}
              >
                {i < pin.length && <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />}
              </div>
            ))}
          </div>
        </div>

        <p className={`min-h-5 text-center text-xs mb-6 ${error ? 'text-rose-600' : 'text-slate-400'}`}>
          {error ? MESSAGES[error] ?? 'Erreur' : busy ? 'Vérification…' : ''}
        </p>

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

        <p className="text-center text-[11px] text-slate-400 mt-10">Accès confidentiel et sécurisé</p>
      </div>
    </div>
  );
};
