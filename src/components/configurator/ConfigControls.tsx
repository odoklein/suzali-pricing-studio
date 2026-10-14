import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ClientMetadata } from '../../types/quote';
import { cn } from '../../lib/cn';
import { NumberInput } from '../ui/NumberInput';
import { Field, Input, fieldControl, fieldSizes } from '../ui/input';
import { Badge, Card } from '../ui/display';

interface ConfigControlsProps {
  metadata: ClientMetadata;
  onUpdateMetadata: (newMetadata: Partial<ClientMetadata>) => void;
}

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'tel';
  mono?: boolean;
  autoComplete?: string;
}> = ({ label, value, onChange, type = 'text', mono, autoComplete }) => (
  <Field label={label}>
    {(id) => (
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete ?? 'off'}
        onChange={(e) => onChange(e.target.value)}
        className={mono ? 'font-mono' : undefined}
      />
    )}
  </Field>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix: string;
}> = ({ label, value, onChange, min, max, suffix }) => (
  <Field label={`${label} (${suffix})`}>
    {(id) => (
      <NumberInput
        id={id}
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        className={cn(fieldControl, fieldSizes.md, 'tabular font-mono')}
      />
    )}
  </Field>
);

const Legend: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <legend className="mb-3 text-xs font-semibold text-muted">{children}</legend>
);

export const ConfigControls: React.FC<ConfigControlsProps> = ({ metadata, onUpdateMetadata }) => {
  const panelId = useId();
  // Un devis neuf s'ouvre sur ses coordonnées : c'est la première chose à remplir
  const [expanded, setExpanded] = useState(() => !metadata.clientCompany);

  const missing = [!metadata.clientCompany && 'société', !metadata.clientEmail && 'e-mail'].filter(Boolean) as string[];

  return (
    <Card aria-labelledby={`${panelId}-title`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-5 py-4 text-left outline-hidden transition-colors hover:bg-surface-2 focus-visible:shadow-[var(--ring)]"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span id={`${panelId}-title`} className="text-title font-semibold tracking-title">
            Client et coordonnées
          </span>
          <span className="truncate text-ui text-muted">{metadata.clientCompany || 'Client à renseigner'}</span>
          {missing.length > 0 && <Badge tone="waiting">À compléter : {missing.join(', ')}</Badge>}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-ui text-muted">
          {expanded ? 'Masquer' : 'Modifier'}
          <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="grid grid-cols-1 gap-x-8 gap-y-6 border-t border-line px-5 py-5 md:grid-cols-2">
          <fieldset className="min-w-0 space-y-3">
            <Legend>Client final</Legend>
            <TextField
              label="Société"
              value={metadata.clientCompany}
              autoComplete="organization"
              onChange={(clientCompany) => onUpdateMetadata({ clientCompany })}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Contact" value={metadata.clientContact} onChange={(clientContact) => onUpdateMetadata({ clientContact })} />
              <TextField label="E-mail" type="email" value={metadata.clientEmail} onChange={(clientEmail) => onUpdateMetadata({ clientEmail })} />
            </div>
            <TextField label="Adresse" value={metadata.clientAddress} onChange={(clientAddress) => onUpdateMetadata({ clientAddress })} />
          </fieldset>

          <fieldset className="min-w-0 space-y-3">
            <Legend>Dossier</Legend>
            <TextField label="Nom du projet" value={metadata.projectName} onChange={(projectName) => onUpdateMetadata({ projectName })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="N° de devis" mono value={metadata.quoteNumber} onChange={(quoteNumber) => onUpdateMetadata({ quoteNumber })} />
              <NumberField
                label="Validité"
                value={metadata.validityDays}
                onChange={(validityDays) => onUpdateMetadata({ validityDays })}
                min={1}
                max={365}
                suffix="jours"
              />
            </div>
            <NumberField
              label="Acompte à la commande"
              value={metadata.depositPercentage}
              onChange={(depositPercentage) => onUpdateMetadata({ depositPercentage })}
              min={0}
              max={100}
              suffix="%"
            />
          </fieldset>

          <fieldset className="min-w-0 space-y-3 md:col-span-2">
            <Legend>Émetteur du devis</Legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <TextField label="Société" value={metadata.partnerCompany} onChange={(partnerCompany) => onUpdateMetadata({ partnerCompany })} />
              <TextField label="Contact" value={metadata.partnerContact} onChange={(partnerContact) => onUpdateMetadata({ partnerContact })} />
              <TextField label="E-mail" type="email" value={metadata.partnerEmail} onChange={(partnerEmail) => onUpdateMetadata({ partnerEmail })} />
              <TextField label="Téléphone" type="tel" value={metadata.partnerPhone} onChange={(partnerPhone) => onUpdateMetadata({ partnerPhone })} />
              <TextField label="SIRET" mono value={metadata.partnerSiret} onChange={(partnerSiret) => onUpdateMetadata({ partnerSiret })} />
              <TextField label="Adresse" value={metadata.partnerAddress} onChange={(partnerAddress) => onUpdateMetadata({ partnerAddress })} />
            </div>
          </fieldset>
        </div>
      )}
    </Card>
  );
};
