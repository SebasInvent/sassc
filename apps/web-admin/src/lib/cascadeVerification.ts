/**
 * Cliente de Verificación en Cascada
 * 
 * Orquesta la verificación facial usando múltiples proveedores:
 * 1. Google Cloud Vision (anti-spoofing)
 * 2. AWS Rekognition (comparación facial)
 * 3. Face-api.js local (verificación rápida)
 * 
 * Todo en paralelo, máximo 1.5 segundos
 */

import { API_URL } from './api';
import { 
  verifyFaceWithMultipleCaptures, 
  quickVerify,
  type VerificationResult,
  type RegisteredUser 
} from './faceVerification';

// Configuración
const CASCADE_CONFIG = {
  // Tiempo máximo total (ms)
  MAX_TOTAL_TIME: 1500,
  
  // Si el backend no responde, usar solo local
  BACKEND_TIMEOUT: 1200,
  
  // Peso de cada verificación
  BACKEND_WEIGHT: 0.6,
  LOCAL_WEIGHT: 0.4,
  
  // Mínimo para aprobar
  MIN_COMBINED_SCORE: 75,
};

export interface CascadeResult {
  success: boolean;
  user: RegisteredUser | null;
  confidence: number;
  verificationTimeMs: number;
  providers: {
    backend: {
      success: boolean;
      confidence: number;
      providers?: {
        googleVision: { success: boolean; confidence: number };
        awsRekognition: { success: boolean; confidence: number };
      };
    };
    local: {
      success: boolean;
      confidence: number;
    };
  };
  antiSpoofing: {
    isRealFace: boolean;
    livenessScore: number;
  };
  reason: string;
}

/**
 * Verifica un rostro usando verificación en cascada (backend + local)
 */
export async function verifyCascade(
  videoElement: HTMLVideoElement,
  registeredUsers: RegisteredUser[],
  onProgress?: (message: string, progress: number) => void
): Promise<CascadeResult> {
  const startTime = Date.now();
  
  onProgress?.('Iniciando verificación multi-proveedor...', 0);
  
  // Capturar imagen del video
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return createFailResult('Error capturando imagen', 0);
  }
  
  ctx.drawImage(videoElement, 0, 0);
  const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
  
  onProgress?.('Enviando a verificación en cascada...', 20);
  
  // Ejecutar verificación local y backend en PARALELO
  const [backendResult, localResult] = await Promise.all([
    verifyWithBackend(imageBase64, registeredUsers, onProgress),
    verifyLocal(videoElement, registeredUsers, onProgress),
  ]);
  
  const totalTime = Date.now() - startTime;
  
  onProgress?.('Analizando resultados...', 90);
  
  // Calcular score combinado
  let combinedScore = 0;
  let totalWeight = 0;
  
  if (backendResult.success || backendResult.confidence > 0) {
    combinedScore += backendResult.confidence * CASCADE_CONFIG.BACKEND_WEIGHT;
    totalWeight += CASCADE_CONFIG.BACKEND_WEIGHT;
  }
  
  if (localResult.success || localResult.confidence > 0) {
    combinedScore += localResult.confidence * CASCADE_CONFIG.LOCAL_WEIGHT;
    totalWeight += CASCADE_CONFIG.LOCAL_WEIGHT;
  }
  
  if (totalWeight > 0) {
    combinedScore = combinedScore / totalWeight;
  }
  
  // Determinar usuario (priorizar backend, luego local)
  let matchedUser: RegisteredUser | null = null;
  if (backendResult.userId) {
    matchedUser = registeredUsers.find(u => u.id === backendResult.userId) || null;
  } else if (localResult.user) {
    // Buscar el usuario completo en registeredUsers
    matchedUser = registeredUsers.find(u => u.id === localResult.user!.id) || null;
  }
  
  // Verificar anti-spoofing
  const antiSpoofing = {
    isRealFace: backendResult.antiSpoofing?.isRealFace ?? localResult.success,
    livenessScore: backendResult.antiSpoofing?.livenessScore ?? (localResult.success ? 80 : 30),
  };
  
  // Determinar éxito
  const success = 
    combinedScore >= CASCADE_CONFIG.MIN_COMBINED_SCORE &&
    antiSpoofing.isRealFace &&
    matchedUser !== null;
  
  // Generar razón
  let reason = '';
  if (success) {
    reason = `Identidad verificada (${combinedScore.toFixed(0)}% confianza)`;
  } else if (!antiSpoofing.isRealFace) {
    reason = 'No se detectó un rostro real. Posible intento de suplantación.';
  } else if (!matchedUser) {
    reason = 'No se encontró coincidencia en el sistema. ¿Está registrado?';
  } else {
    reason = `Confianza insuficiente (${combinedScore.toFixed(0)}%). Intente con mejor iluminación.`;
  }
  
  onProgress?.('¡Verificación completada!', 100);
  
  console.log(`🔐 Verificación en cascada completada en ${totalTime}ms`);
  console.log(`   Backend: ${backendResult.success ? '✅' : '❌'} ${backendResult.confidence}%`);
  console.log(`   Local: ${localResult.success ? '✅' : '❌'} ${localResult.confidence}%`);
  console.log(`   Combinado: ${combinedScore.toFixed(1)}%`);
  
  return {
    success,
    user: matchedUser,
    confidence: combinedScore,
    verificationTimeMs: totalTime,
    providers: {
      backend: {
        success: backendResult.success,
        confidence: backendResult.confidence,
        providers: backendResult.providers,
      },
      local: {
        success: localResult.success,
        confidence: localResult.confidence,
      },
    },
    antiSpoofing,
    reason,
  };
}

/**
 * Verificación con el backend (Google Vision + AWS Rekognition)
 */
async function verifyWithBackend(
  imageBase64: string,
  users: RegisteredUser[],
  onProgress?: (message: string, progress: number) => void
): Promise<{
  success: boolean;
  confidence: number;
  userId: string | null;
  providers?: any;
  antiSpoofing?: { isRealFace: boolean; livenessScore: number };
}> {
  try {
    onProgress?.('Verificando con Google Vision + AWS...', 40);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CASCADE_CONFIG.BACKEND_TIMEOUT);
    
    const response = await fetch(`${API_URL}/biometric/verify-cascade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        userIds: users.map(u => u.id),
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Backend verification failed');
    }
    
    const result = await response.json();
    
    return {
      success: result.success,
      confidence: result.confidence || 0,
      userId: result.userId,
      providers: result.providers,
      antiSpoofing: result.antiSpoofing,
    };
    
  } catch (error: any) {
    console.warn('Backend verification error:', error.message);
    
    // Si el backend falla, retornar resultado vacío (se usará solo local)
    return {
      success: false,
      confidence: 0,
      userId: null,
    };
  }
}

/**
 * Verificación local con face-api.js
 */
async function verifyLocal(
  videoElement: HTMLVideoElement,
  users: RegisteredUser[],
  onProgress?: (message: string, progress: number) => void
): Promise<VerificationResult> {
  onProgress?.('Verificando localmente...', 60);
  
  return verifyFaceWithMultipleCaptures(
    videoElement,
    users,
    (msg, prog) => onProgress?.(msg, 60 + prog * 0.3)
  );
}

/**
 * Crea un resultado de fallo
 */
function createFailResult(reason: string, timeMs: number): CascadeResult {
  return {
    success: false,
    user: null,
    confidence: 0,
    verificationTimeMs: timeMs,
    providers: {
      backend: { success: false, confidence: 0 },
      local: { success: false, confidence: 0 },
    },
    antiSpoofing: { isRealFace: false, livenessScore: 0 },
    reason,
  };
}

/**
 * Verificación rápida (solo local, para auto-detección)
 */
export async function quickCascadeVerify(
  videoElement: HTMLVideoElement,
  users: RegisteredUser[]
): Promise<{ user: RegisteredUser | null; confidence: number }> {
  // Para detección automática, solo usamos local (más rápido)
  const result = await quickVerify(
    await captureDescriptor(videoElement),
    users
  );
  
  return {
    user: result.user ? users.find(u => u.id === result.user!.id) || null : null,
    confidence: result.confidence,
  };
}

/**
 * Captura el descriptor facial del video
 */
async function captureDescriptor(videoElement: HTMLVideoElement): Promise<Float32Array> {
  const { detectFace } = await import('./faceRecognition');
  const descriptor = await detectFace(videoElement);
  return descriptor || new Float32Array(128);
}
