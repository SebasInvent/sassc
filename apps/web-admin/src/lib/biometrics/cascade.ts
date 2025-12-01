/**
 * Cascade Verification V2 (Frontend)
 * 
 * Orchestrates the biometric verification pipeline:
 * 1. Mediapipe Liveness
 * 2. Anti-Spoof Detection
 * 3. InsightFace Embedding
 * 4. Backend Verification (with AWS backup)
 */

import { initMediapipe, detectLiveness, getQuickLivenessScore, cleanupMediapipe, type LivenessData } from './mediapipe';
import { initInsightFace, extractEmbedding, cleanupInsightFace, isModelLoaded } from './insightface';
import { analyzeForSpoof, type AntiSpoofData } from './antispoof';
import { API_URL } from '../api';

// Types
export interface RegisteredUser {
  id: string;
  name: string;
  license: string;
  specialty: string;
  embedding512?: string;
  faceImage?: string;
}

export interface CascadeResult {
  success: boolean;
  user: RegisteredUser | null;
  confidence: number;
  decision: 'MATCH' | 'NO_MATCH' | 'SPOOF_DETECTED' | 'LIVENESS_FAILED' | 'ERROR';
  
  // Detailed scores
  arcfaceScore: number;
  livenessScore: number;
  spoofScore: number;
  awsSimilarity: number | null;
  
  // Provider breakdown
  providers: {
    mediapipe: { passed: boolean; score: number };
    antispoof: { passed: boolean; score: number };
    insightface: { passed: boolean; score: number };
    aws: { used: boolean; passed: boolean; score: number } | null;
  };
  
  // Metadata
  verificationTimeMs: number;
  reason: string;
}

export interface EnrollmentResult {
  success: boolean;
  user?: {
    id: string;
    license: string;
    name: string;
  };
  error?: string;
}

// Configuration
const CONFIG = {
  MIN_LIVENESS_SCORE: 60,
  MAX_SPOOF_SCORE: 40,
  LIVENESS_DURATION_MS: 1500,
  MAX_VERIFICATION_TIME_MS: 3000,
};

let isInitialized = false;

/**
 * Initialize all biometric models
 */
export async function initBiometrics(
  onProgress?: (message: string, progress: number) => void
): Promise<void> {
  if (isInitialized) return;

  onProgress?.('Cargando Mediapipe FaceMesh...', 20);
  await initMediapipe();

  onProgress?.('Cargando InsightFace ArcFace...', 60);
  await initInsightFace();

  isInitialized = true;
  onProgress?.('Modelos cargados', 100);
}

/**
 * Capture image from video
 */
function captureImage(video: HTMLVideoElement, maxSize: number = 480): string {
  const canvas = document.createElement('canvas');
  const videoWidth = video.videoWidth || 640;
  const videoHeight = video.videoHeight || 480;
  
  const scale = Math.min(maxSize / videoWidth, maxSize / videoHeight, 1);
  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);
  
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Full cascade verification
 */
export async function verifyCascade(
  video: HTMLVideoElement,
  registeredUsers: RegisteredUser[],
  onProgress?: (message: string, progress: number) => void
): Promise<CascadeResult> {
  const startTime = Date.now();

  // Initialize result
  let result: CascadeResult = {
    success: false,
    user: null,
    confidence: 0,
    decision: 'ERROR',
    arcfaceScore: 0,
    livenessScore: 0,
    spoofScore: 100,
    awsSimilarity: null,
    providers: {
      mediapipe: { passed: false, score: 0 },
      antispoof: { passed: false, score: 0 },
      insightface: { passed: false, score: 0 },
      aws: null,
    },
    verificationTimeMs: 0,
    reason: '',
  };

  try {
    // Ensure models are loaded
    if (!isInitialized) {
      onProgress?.('Inicializando modelos...', 5);
      await initBiometrics(onProgress);
    }

    // Step 1: Liveness Check
    onProgress?.('Verificando liveness...', 20);
    const { score: livenessScore, data: livenessData } = await getQuickLivenessScore(
      video,
      CONFIG.LIVENESS_DURATION_MS
    );

    result.livenessScore = livenessScore;
    result.providers.mediapipe = {
      passed: livenessScore >= CONFIG.MIN_LIVENESS_SCORE,
      score: livenessScore,
    };

    if (livenessScore < CONFIG.MIN_LIVENESS_SCORE) {
      result.decision = 'LIVENESS_FAILED';
      result.reason = `Liveness score too low (${livenessScore.toFixed(0)}%). Please ensure good lighting and look at the camera.`;
      result.verificationTimeMs = Date.now() - startTime;
      return result;
    }

    // Step 2: Anti-Spoof Check
    onProgress?.('Verificando anti-spoofing...', 40);
    const antiSpoofData = await analyzeForSpoof(video);
    const spoofScore = antiSpoofData.spoofProbability * 100;

    result.spoofScore = spoofScore;
    result.providers.antispoof = {
      passed: spoofScore <= CONFIG.MAX_SPOOF_SCORE,
      score: 100 - spoofScore,
    };

    if (spoofScore > CONFIG.MAX_SPOOF_SCORE) {
      result.decision = 'SPOOF_DETECTED';
      result.reason = 'Possible spoof attack detected. Please use your real face.';
      result.verificationTimeMs = Date.now() - startTime;
      return result;
    }

    // Step 3: Extract Embedding
    onProgress?.('Extrayendo embedding facial...', 60);
    const embeddingResult = await extractEmbedding(video);

    if (!embeddingResult.faceDetected || embeddingResult.embedding.length === 0) {
      result.decision = 'ERROR';
      result.reason = embeddingResult.error || 'Failed to extract face embedding';
      result.verificationTimeMs = Date.now() - startTime;
      return result;
    }

    // Step 4: Send to backend for verification
    onProgress?.('Verificando identidad...', 80);
    const imageBase64 = captureImage(video);

    const backendResult = await verifyWithBackend({
      embedding512: JSON.stringify(embeddingResult.embedding),
      imageBase64,
      livenessData: livenessData!,
      antiSpoofData,
    });

    // Update result with backend response
    result.success = backendResult.success;
    result.user = backendResult.user;
    result.confidence = backendResult.confidence;
    result.decision = backendResult.decision;
    result.arcfaceScore = backendResult.details?.arcfaceScore || 0;
    result.awsSimilarity = backendResult.details?.awsSimilarity || null;
    result.reason = backendResult.reason;

    result.providers.insightface = {
      passed: backendResult.success,
      score: backendResult.details?.arcfaceScore || 0,
    };

    if (backendResult.providerBreakdown?.awsRekognition) {
      result.providers.aws = backendResult.providerBreakdown.awsRekognition;
    }

    onProgress?.('Verificación completada', 100);

  } catch (error: any) {
    result.decision = 'ERROR';
    result.reason = error.message || 'Verification failed';
  }

  result.verificationTimeMs = Date.now() - startTime;

  console.log(`🔐 Cascade V2 completed in ${result.verificationTimeMs}ms: ${result.decision}`);
  console.log(`   Liveness: ${result.livenessScore.toFixed(0)}%`);
  console.log(`   Anti-Spoof: ${(100 - result.spoofScore).toFixed(0)}%`);
  console.log(`   ArcFace: ${result.arcfaceScore.toFixed(0)}%`);
  if (result.awsSimilarity !== null) {
    console.log(`   AWS: ${result.awsSimilarity.toFixed(0)}%`);
  }

  return result;
}

/**
 * Verify with backend
 */
async function verifyWithBackend(data: {
  embedding512: string;
  imageBase64: string;
  livenessData: LivenessData;
  antiSpoofData: AntiSpoofData;
}): Promise<any> {
  const response = await fetch(`${API_URL}/biometrics/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Backend verification failed');
  }

  return response.json();
}

/**
 * Enroll new user
 */
export async function enrollUser(
  video: HTMLVideoElement,
  userData: {
    firstName: string;
    lastName: string;
    specialty: string;
    role: string;
  },
  onProgress?: (message: string, progress: number) => void
): Promise<EnrollmentResult> {
  try {
    // Ensure models are loaded
    if (!isInitialized) {
      onProgress?.('Inicializando modelos...', 5);
      await initBiometrics(onProgress);
    }

    // Capture 3 embeddings
    const embeddings: number[][] = [];
    const images: string[] = [];

    for (let i = 0; i < 3; i++) {
      onProgress?.(`Capturando imagen ${i + 1}/3...`, 20 + i * 20);
      
      // Wait a bit between captures
      if (i > 0) {
        await new Promise(r => setTimeout(r, 500));
      }

      const result = await extractEmbedding(video);
      if (result.faceDetected && result.embedding.length > 0) {
        embeddings.push(result.embedding);
        images.push(captureImage(video));
      }
    }

    if (embeddings.length < 3) {
      return {
        success: false,
        error: 'Could not capture enough face images. Please try again.',
      };
    }

    // Average embeddings
    onProgress?.('Procesando embeddings...', 70);
    const avgEmbedding = averageEmbeddings(embeddings);
    const quality = calculateQuality(embeddings);

    // Liveness check
    onProgress?.('Verificando liveness...', 80);
    const { score: livenessScore } = await getQuickLivenessScore(video, 1000);

    if (livenessScore < CONFIG.MIN_LIVENESS_SCORE) {
      return {
        success: false,
        error: 'Liveness check failed. Please ensure good lighting.',
      };
    }

    // Anti-spoof check
    const antiSpoofData = await analyzeForSpoof(video);
    const spoofScore = antiSpoofData.spoofProbability * 100;

    if (spoofScore > CONFIG.MAX_SPOOF_SCORE) {
      return {
        success: false,
        error: 'Anti-spoof check failed. Please use your real face.',
      };
    }

    // Send to backend
    onProgress?.('Registrando usuario...', 90);
    const response = await fetch(`${API_URL}/biometrics/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...userData,
        embedding512: JSON.stringify(avgEmbedding),
        embeddingQuality: quality,
        livenessScore,
        spoofScore,
        faceImage: images[images.length - 1], // Best image (last one)
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Registration failed',
      };
    }

    const result = await response.json();
    onProgress?.('Registro completado', 100);

    return {
      success: true,
      user: result.user,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Enrollment failed',
    };
  }
}

/**
 * Average multiple embeddings
 */
function averageEmbeddings(embeddings: number[][]): number[] {
  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      avg[i] += emb[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    avg[i] /= embeddings.length;
  }

  // Normalize
  const norm = Math.sqrt(avg.reduce((sum, val) => sum + val * val, 0));
  return avg.map(val => val / norm);
}

/**
 * Calculate embedding quality
 */
function calculateQuality(embeddings: number[][]): number {
  if (embeddings.length < 2) return 1;

  const avg = averageEmbeddings(embeddings);
  let totalVariance = 0;

  for (const emb of embeddings) {
    let dist = 0;
    for (let i = 0; i < emb.length; i++) {
      dist += (emb[i] - avg[i]) ** 2;
    }
    totalVariance += Math.sqrt(dist);
  }

  const avgVariance = totalVariance / embeddings.length;
  return Math.max(0, 1 - avgVariance * 5);
}

/**
 * Get registered users from backend
 */
export async function getRegisteredUsers(): Promise<RegisteredUser[]> {
  try {
    const response = await fetch(`${API_URL}/biometrics/registered`);
    if (!response.ok) {
      throw new Error('Failed to fetch registered users');
    }
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Failed to fetch registered users:', error);
    return [];
  }
}

/**
 * Cleanup all models
 */
export async function cleanupBiometrics(): Promise<void> {
  cleanupMediapipe();
  await cleanupInsightFace();
  isInitialized = false;
}

/**
 * Check if biometrics are initialized
 */
export function isBiometricsReady(): boolean {
  return isInitialized && isModelLoaded();
}
