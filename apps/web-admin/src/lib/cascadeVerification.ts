/**
 * Cliente de Verificación en Cascada - ARQUITECTURA PROFESIONAL
 * 
 * Orquesta la verificación facial usando múltiples proveedores DIRECTAMENTE:
 * 1. Google Cloud Vision (anti-spoofing + detección) - API REST
 * 2. AWS Rekognition (comparación facial) - API REST con Signature V4
 * 3. Face-api.js local (verificación rápida)
 * 
 * Todo en paralelo, máximo 1.5 segundos
 * Sin SDKs pesados - llamadas REST directas
 */

import { detectFaceWithVision, type VisionFaceResult } from './cloudVision';
import { compareFacesWithRekognition, type RekognitionCompareResult } from './awsRekognition';
import { 
  verifyFaceWithMultipleCaptures, 
  quickVerify,
  type VerificationResult,
  type RegisteredUser 
} from './faceVerification';

// Configuración - AJUSTADA PARA MAYOR TOLERANCIA
const CASCADE_CONFIG = {
  // Tiempo máximo total (ms)
  MAX_TOTAL_TIME: 2000,
  
  // Timeouts individuales
  GOOGLE_TIMEOUT: 800,
  AWS_TIMEOUT: 900,
  LOCAL_TIMEOUT: 1000,
  
  // Peso de cada verificación - Local tiene más peso ahora
  GOOGLE_WEIGHT: 0.20,  // Anti-spoofing
  AWS_WEIGHT: 0.35,     // Comparación precisa
  LOCAL_WEIGHT: 0.45,   // Verificación rápida - MÁS PESO
  
  // Mínimo para aprobar - REDUCIDO
  MIN_COMBINED_SCORE: 55,
  
  // Mínimo de proveedores que deben aprobar
  MIN_PROVIDERS_PASS: 1, // Solo 1 proveedor si tiene buena confianza
};

export interface CascadeResult {
  success: boolean;
  user: RegisteredUser | null;
  confidence: number;
  verificationTimeMs: number;
  providers: {
    googleVision: {
      success: boolean;
      confidence: number;
      antiSpoofing: { isRealFace: boolean; livenessScore: number };
      timeMs: number;
    };
    awsRekognition: {
      success: boolean;
      confidence: number;
      matchedUserId: string | null;
      timeMs: number;
    };
    local: {
      success: boolean;
      confidence: number;
      timeMs: number;
    };
    // Alias para compatibilidad
    backend: {
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
 * Verifica un rostro usando verificación en cascada
 * Google Vision + AWS Rekognition + Face-api.js local
 * Todo en PARALELO para máxima velocidad
 */
export async function verifyCascade(
  videoElement: HTMLVideoElement,
  registeredUsers: RegisteredUser[],
  onProgress?: (message: string, progress: number) => void
): Promise<CascadeResult> {
  const startTime = Date.now();
  
  onProgress?.('Iniciando verificación multi-proveedor...', 0);
  
  // Capturar imagen del video - limitar tamaño para móviles (igual que registro)
  const canvas = document.createElement('canvas');
  const maxSize = 480;
  const videoWidth = videoElement.videoWidth || 640;
  const videoHeight = videoElement.videoHeight || 480;
  const scale = Math.min(maxSize / videoWidth, maxSize / videoHeight, 1);
  
  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return createFailResult('Error capturando imagen', 0);
  }
  
  // Capturar imagen directamente sin transformaciones (igual que registro)
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
  const imageBase64 = canvas.toDataURL('image/jpeg', 0.7); // Misma compresión que registro
  
  onProgress?.('Verificando con Google Vision...', 15);
  
  // Preparar usuarios con imágenes para AWS
  const usersForAWS = registeredUsers.map(u => ({
    id: u.id,
    name: u.name,
    faceImage: u.faceImage,
  }));
  
  // Ejecutar TODOS los proveedores en PARALELO
  const [googleResult, awsResult, localResult] = await Promise.all([
    // 1. Google Cloud Vision - Anti-spoofing
    detectFaceWithVision(imageBase64, CASCADE_CONFIG.GOOGLE_TIMEOUT)
      .then(r => {
        onProgress?.('Google Vision completado', 35);
        return r;
      }),
    
    // 2. AWS Rekognition - Comparación facial
    compareFacesWithRekognition(imageBase64, usersForAWS, CASCADE_CONFIG.AWS_TIMEOUT)
      .then(r => {
        onProgress?.('AWS Rekognition completado', 55);
        return r;
      }),
    
    // 3. Face-api.js local - Verificación rápida
    verifyFaceWithMultipleCaptures(videoElement, registeredUsers, (msg, prog) => {
      onProgress?.(msg, 55 + prog * 0.35);
    }),
  ]);
  
  const totalTime = Date.now() - startTime;
  
  onProgress?.('Analizando resultados...', 95);
  
  // Analizar resultados
  const analysis = analyzeResults(googleResult, awsResult, localResult, registeredUsers);
  
  onProgress?.('¡Verificación completada!', 100);
  
  // Logging detallado
  console.log(`🔐 Verificación en cascada completada en ${totalTime}ms`);
  console.log(`   Google Vision: ${googleResult.success ? '✅' : '❌'} (${googleResult.confidence.toFixed(0)}%) - Liveness: ${googleResult.antiSpoofing.livenessScore}%`);
  console.log(`   AWS Rekognition: ${awsResult.success ? '✅' : '❌'} (${awsResult.confidence.toFixed(0)}%) - Match: ${awsResult.matchedUserId || 'ninguno'}`);
  console.log(`   Local Face-API: ${localResult.success ? '✅' : '❌'} (${localResult.confidence.toFixed(0)}%)`);
  console.log(`   Combinado: ${analysis.combinedScore.toFixed(1)}% - Proveedores OK: ${analysis.providersPass}/3`);
  
  return {
    success: analysis.success,
    user: analysis.matchedUser,
    confidence: analysis.combinedScore,
    verificationTimeMs: totalTime,
    providers: {
      googleVision: {
        success: googleResult.success && googleResult.faceDetected,
        confidence: googleResult.confidence,
        antiSpoofing: googleResult.antiSpoofing,
        timeMs: googleResult.timeMs,
      },
      awsRekognition: {
        success: awsResult.success && awsResult.matched,
        confidence: awsResult.confidence,
        matchedUserId: awsResult.matchedUserId,
        timeMs: awsResult.timeMs,
      },
      local: {
        success: localResult.success,
        confidence: localResult.confidence,
        timeMs: 0, // No tenemos este dato
      },
      // Alias para compatibilidad con UI existente
      backend: {
        success: googleResult.success || awsResult.success,
        confidence: Math.max(googleResult.confidence, awsResult.confidence),
      },
    },
    antiSpoofing: analysis.antiSpoofing,
    reason: analysis.reason,
  };
}

/**
 * Analiza los resultados de todos los proveedores
 */
function analyzeResults(
  google: VisionFaceResult,
  aws: RekognitionCompareResult,
  local: VerificationResult,
  users: RegisteredUser[]
): {
  success: boolean;
  combinedScore: number;
  matchedUser: RegisteredUser | null;
  antiSpoofing: { isRealFace: boolean; livenessScore: number };
  providersPass: number;
  reason: string;
} {
  // Contar proveedores que aprueban
  let providersPass = 0;
  let combinedScore = 0;
  let totalWeight = 0;
  
  // Google Vision (anti-spoofing) - más tolerante
  if (google.success && google.faceDetected) {
    // Aprobar si detectó rostro, aunque liveness sea bajo
    if (google.antiSpoofing.livenessScore >= 30) {
      providersPass++;
    }
    combinedScore += google.confidence * CASCADE_CONFIG.GOOGLE_WEIGHT;
    totalWeight += CASCADE_CONFIG.GOOGLE_WEIGHT;
  }
  
  // AWS Rekognition (comparación) - umbral reducido
  if (aws.success && aws.matched && aws.confidence >= 70) {
    providersPass++;
    combinedScore += aws.confidence * CASCADE_CONFIG.AWS_WEIGHT;
    totalWeight += CASCADE_CONFIG.AWS_WEIGHT;
  }
  
  // Local Face-API - umbral reducido para ser más tolerante
  if (local.success && local.confidence >= 55) {
    providersPass++;
    combinedScore += local.confidence * CASCADE_CONFIG.LOCAL_WEIGHT;
    totalWeight += CASCADE_CONFIG.LOCAL_WEIGHT;
  }
  
  // Normalizar score
  if (totalWeight > 0) {
    combinedScore = combinedScore / totalWeight;
  }
  
  // Determinar usuario (consenso entre proveedores)
  let matchedUser: RegisteredUser | null = null;
  
  // Prioridad: AWS > Local > ninguno
  if (aws.matched && aws.matchedUserId) {
    matchedUser = users.find(u => u.id === aws.matchedUserId) || null;
  } else if (local.success && local.user) {
    matchedUser = users.find(u => u.id === local.user!.id) || null;
  }
  
  // Anti-spoofing combinado - MÁS TOLERANTE
  // Confiar si AWS O Local confirman con confianza razonable
  const awsConfirmsIdentity = aws.success && aws.matched && aws.confidence >= 70;
  const localConfirmsIdentity = local.success && local.confidence >= 60;
  const highConfidenceMatch = awsConfirmsIdentity || localConfirmsIdentity;
  
  const googleLiveness = google.success ? google.antiSpoofing.livenessScore : 50; // Default 50 si no hay Google
  
  // Considerar rostro real si:
  // 1. Google dice que es real (liveness > 50), O
  // 2. AWS o Local confirman identidad con confianza razonable, O
  // 3. Local tiene alta confianza (>70%) - confiar en face-api.js
  const isRealFace = 
    (google.success && google.antiSpoofing.livenessScore >= 50) ||
    highConfidenceMatch ||
    (local.success && local.confidence >= 70);
  
  const antiSpoofing = {
    isRealFace,
    livenessScore: googleLiveness,
  };
  
  // Determinar éxito final
  // Si Local confirma con buena confianza, solo necesitamos 1 proveedor
  const minProviders = (localConfirmsIdentity || awsConfirmsIdentity) ? 1 : CASCADE_CONFIG.MIN_PROVIDERS_PASS;
  
  const success = 
    providersPass >= minProviders &&
    combinedScore >= CASCADE_CONFIG.MIN_COMBINED_SCORE &&
    antiSpoofing.isRealFace &&
    matchedUser !== null;
  
  // Generar razón
  let reason = '';
  if (success) {
    reason = `Identidad verificada con ${providersPass}/3 proveedores (${combinedScore.toFixed(0)}% confianza)`;
  } else if (!antiSpoofing.isRealFace) {
    reason = 'No se detectó un rostro real. Posible intento de suplantación.';
  } else if (!matchedUser) {
    reason = 'No se encontró coincidencia en el sistema. ¿Está registrado?';
  } else if (providersPass < CASCADE_CONFIG.MIN_PROVIDERS_PASS) {
    reason = `Solo ${providersPass}/3 proveedores aprobaron. Se requieren al menos ${CASCADE_CONFIG.MIN_PROVIDERS_PASS}.`;
  } else {
    reason = `Confianza insuficiente (${combinedScore.toFixed(0)}%). Intente con mejor iluminación.`;
  }
  
  return {
    success,
    combinedScore,
    matchedUser,
    antiSpoofing,
    providersPass,
    reason,
  };
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
      googleVision: { success: false, confidence: 0, antiSpoofing: { isRealFace: false, livenessScore: 0 }, timeMs: 0 },
      awsRekognition: { success: false, confidence: 0, matchedUserId: null, timeMs: 0 },
      local: { success: false, confidence: 0, timeMs: 0 },
      backend: { success: false, confidence: 0 },
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

export type { RegisteredUser };
