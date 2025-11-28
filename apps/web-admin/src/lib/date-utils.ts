export const dateUtils = {
  /**
   * Convierte fecha de input a ISO-8601
   */
  toISO: (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toISOString();
    } catch {
      return null;
    }
  },

  /**
   * Convierte ISO a formato de input date
   */
  fromISO: (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    try {
      return isoString.split('T')[0];
    } catch {
      return '';
    }
  }
}