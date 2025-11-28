import { toast } from 'sonner';

export function useApiError() {
  const handleError = async (response: Response, defaultMessage = 'Error en la operación') => {
    try {
      const errorData = await response.json();
      
      // Extraer mensaje de error del backend
      const message = errorData.message || 
                     (Array.isArray(errorData.message) ? errorData.message[0] : null) ||
                     defaultMessage;
      
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      toast.error(message);
      return errorData;
    } catch (e) {
      console.error('Error parsing error response:', e);
      toast.error(defaultMessage);
      return { message: defaultMessage };
    }
  };

  return { handleError };
}