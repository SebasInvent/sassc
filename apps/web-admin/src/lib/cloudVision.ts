/**
 * Google Cloud Vision API - Cliente Lite (REST directo)
 * 
 * Detecta rostros y verifica anti-spoofing sin SDK pesado
 * Usa la API REST directamente con API Key
 */

const GOOGLE_VISION_API = 'https://vision.googleapis.com/v1/images:annotate';

export interface VisionFaceResult {
  success: boolean;
  faceDetected: boolean;
  confidence: number;
  antiSpoofing: {
    isRealFace: boolean;
    livenessScore: number;
  };
  faceData?: {
    joy: string;
    sorrow: string;
    anger: string;
    surprise: string;
    headwear: string;
    blurred: boolean;
    underExposed: boolean;
    boundingBox: any;
  };
  error?: string;
  timeMs: number;
}

/**
 * Detecta rostros y analiza anti-spoofing con Google Cloud Vision
 */
export async function detectFaceWithVision(
  imageBase64: string,
  timeoutMs: number = 600
): Promise<VisionFaceResult> {
  const startTime = Date.now();
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      faceDetected: false,
      confidence: 0,
      antiSpoofing: { isRealFace: false, livenessScore: 0 },
      error: 'Google Vision API key not configured',
      timeMs: Date.now() - startTime,
    };
  }
  
  try {
    // Limpiar base64 si tiene prefijo
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const requestBody = {
      requests: [{
        image: { content: cleanBase64 },
        features: [
          { type: 'FACE_DETECTION', maxResults: 5 },
          { type: 'SAFE_SEARCH_DETECTION' }, // Para detectar contenido sospechoso
        ],
      }],
    };
    
    // Llamada con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`${GOOGLE_VISION_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    const faces = data.responses?.[0]?.faceAnnotations || [];
    
    if (faces.length === 0) {
      return {
        success: true,
        faceDetected: false,
        confidence: 0,
        antiSpoofing: { isRealFace: false, livenessScore: 0 },
        timeMs: Date.now() - startTime,
      };
    }
    
    // Analizar el rostro principal
    const face = faces[0];
    
    // Calcular score de liveness basado en características
    const livenessScore = calculateLivenessScore(face);
    const isRealFace = livenessScore > 60;
    
    // Confidence de detección (0-100)
    const detectionConfidence = (face.detectionConfidence || 0) * 100;
    
    return {
      success: true,
      faceDetected: true,
      confidence: detectionConfidence,
      antiSpoofing: {
        isRealFace,
        livenessScore,
      },
      faceData: {
        joy: face.joyLikelihood,
        sorrow: face.sorrowLikelihood,
        anger: face.angerLikelihood,
        surprise: face.surpriseLikelihood,
        headwear: face.headwearLikelihood,
        blurred: face.blurredLikelihood === 'LIKELY' || face.blurredLikelihood === 'VERY_LIKELY',
        underExposed: face.underExposedLikelihood === 'LIKELY' || face.underExposedLikelihood === 'VERY_LIKELY',
        boundingBox: face.boundingPoly,
      },
      timeMs: Date.now() - startTime,
    };
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        faceDetected: false,
        confidence: 0,
        antiSpoofing: { isRealFace: false, livenessScore: 0 },
        error: 'Timeout',
        timeMs: Date.now() - startTime,
      };
    }
    
    return {
      success: false,
      faceDetected: false,
      confidence: 0,
      antiSpoofing: { isRealFace: false, livenessScore: 0 },
      error: error.message,
      timeMs: Date.now() - startTime,
    };
  }
}

/**
 * Calcula un score de liveness basado en características del rostro
 * 
 * Indicadores de rostro REAL:
 * - Expresiones naturales (no completamente neutro)
 * - No borroso
 * - Buena exposición
 * - Ángulos de pose naturales
 */
function calculateLivenessScore(face: any): number {
  let score = 50; // Base
  
  // Penalizar si está muy borroso (posible foto de foto)
  if (face.blurredLikelihood === 'VERY_LIKELY') score -= 30;
  else if (face.blurredLikelihood === 'LIKELY') score -= 15;
  else if (face.blurredLikelihood === 'UNLIKELY') score += 10;
  
  // Penalizar mala exposición (posible pantalla)
  if (face.underExposedLikelihood === 'VERY_LIKELY') score -= 20;
  else if (face.underExposedLikelihood === 'LIKELY') score -= 10;
  
  // Bonus por expresiones naturales (no es una foto estática)
  const hasExpression = 
    face.joyLikelihood !== 'VERY_UNLIKELY' ||
    face.surpriseLikelihood !== 'VERY_UNLIKELY';
  if (hasExpression) score += 15;
  
  // Bonus por buena confianza de detección
  if (face.detectionConfidence > 0.9) score += 15;
  else if (face.detectionConfidence > 0.7) score += 10;
  
  // Bonus por landmarks detectados (más difícil falsificar)
  const landmarkCount = face.landmarks?.length || 0;
  if (landmarkCount > 20) score += 10;
  
  // Penalizar ángulos extremos (posible foto inclinada)
  const rollAngle = Math.abs(face.rollAngle || 0);
  const panAngle = Math.abs(face.panAngle || 0);
  const tiltAngle = Math.abs(face.tiltAngle || 0);
  
  if (rollAngle > 30 || panAngle > 30 || tiltAngle > 30) {
    score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

export default { detectFaceWithVision };
