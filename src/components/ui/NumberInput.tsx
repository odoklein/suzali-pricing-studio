import React, { useState } from 'react';

type NativeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max'>;

interface NumberInputProps extends NativeProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Valeur appliquée quand le champ est laissé vide */
  fallback?: number;
}

const parse = (raw: string): number | null => {
  const n = Number(raw.replace(',', '.').trim());
  return raw.trim() === '' || Number.isNaN(n) ? null : n;
};

/**
 * Champ numérique qui garde la saisie en cours (virgule, champ vide, « 0. »)
 * et ne borne la valeur qu'à la sortie du champ.
 */
export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onValueChange,
  min,
  max,
  fallback,
  onBlur,
  onFocus,
  onKeyDown,
  ...rest
}) => {
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

  const commit = () => {
    if (draft === null) return;
    const n = parse(draft);
    const next = clamp(n ?? fallback ?? min ?? 0);
    if (next !== value) onValueChange(next);
    setDraft(null);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={draft ?? String(value).replace('.', ',')}
      onFocus={(e) => {
        setDraft(String(value).replace('.', ','));
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (!/^-?\d*[.,]?\d*$/.test(raw)) return;
        setDraft(raw);
        const n = parse(raw);
        // mise à jour en direct si la valeur est déjà dans les bornes
        if (n !== null && n === clamp(n)) onValueChange(n);
      }}
      onBlur={(e) => {
        commit();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        onKeyDown?.(e);
      }}
    />
  );
};
