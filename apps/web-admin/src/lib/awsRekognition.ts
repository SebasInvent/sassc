/**
 * AWS Rekognition API - Cliente via Backend
 * 
 * Usa el backend para comparar rostros con AWS Rekognition
 * Las credenciales AWS están seguras en el servidor
 */

import { API_URL } from './api';

export interface RekognitionCompareResult {
  success: boolean;
  matched: boolean;
  confidence: number;
  matchedUserId: string | null;
  similarity: number;
  error?: string;
  timeMs: number;
}

export interface UserToCompare {
  id: string;
  name: string;
  faceImage?: string;
}

/**
 * Verifica un rostro contra todos los usuarios registrados via backend
 */
export async function compareFacesWithRekognition(
  sourceImageBase64: string,
  targetUsers: UserToCompare[],
  timeoutMs: number = 3000
): Promise<RekognitionCompareResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`${API_URL}/auth/verify-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceImage: sourceImageBase64 }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    return {
      success: data.success,
      matched: data.matched,
      confidence: data.similarity || data.confidence || 0,
      matchedUserId: data.user?.id || null,
      similarity: data.similarity || 0,
      error: data.error,
      timeMs: Date.now() - startTime,
    };
    
  } catch (error: any) {
    return {
      success: false,
      matched: false,
      confidence: 0,
      matchedUserId: null,
      similarity: 0,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
      timeMs: Date.now() - startTime,
    };
  }
}

export default { compareFacesWithRekognition };
