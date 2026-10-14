/** Concatène des classes en ignorant les valeurs vides (les primitives n’ont pas de classes concurrentes). */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
