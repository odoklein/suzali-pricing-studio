export type CsvCell = string | number | boolean | null | undefined;

/** Un tableur exécute une cellule texte qui commence par = + - @ : on la neutralise */
const neutralize = (text: string) => (/^[=+\-@\t\r]/.test(text) ? `'${text}` : text);

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value).replace('.', ',') : '';
  const text = neutralize(typeof value === 'boolean' ? (value ? 'oui' : 'non') : value);
  return `"${text.replace(/"/g, '""')}"`;
}

/** CSV pour Excel en français : séparateur « ; », décimales à la virgule, lignes CRLF */
export function toCsv(header: string[], rows: CsvCell[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

/** Télécharge le CSV (avec BOM UTF-8 pour que les accents s'ouvrent correctement dans Excel) */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
