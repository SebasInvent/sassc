/**
 * Convierte una fecha de input HTML a formato ISO-8601 DateTime
 * Input: "2026-12-31" -> Output: "2026-12-31T00:00:00.000Z"
 */
export function dateToISO(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  try {
    return new Date(dateString).toISOString();
  } catch (error) {
    console.error('Error converting date:', dateString, error);
    return null;
  }
}

/**
 * Convierte ISO DateTime a formato de input date
 * Input: "2026-12-31T00:00:00.000Z" -> Output: "2026-12-31"
 */
export function isoToDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    return isoString.split('T')[0];
  } catch (error) {
    console.error('Error parsing ISO date:', isoString, error);
    return '';
  }
}

/**
 * Valida que una fecha esté en formato correcto
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}