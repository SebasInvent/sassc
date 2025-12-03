/**
 * InsightFace SDK - Detección y Reconocimiento Facial
 * Usa ONNX Runtime Web con modelos SCRFD + ArcFace
 */

import * as ort from 'onnxruntime-web';

// Configuración - modelos desde rewrite proxy o local
const IS_LOCALHOST = typeof window !== 'undefined' && window.location.hostname.includes('localhost');

// En local: usar archivos locales
// En producción: usar rewrite proxy a HuggingFace (/hf-models/*)
const LOCAL_PATH = '/models/insightface';
const PROXY_PATH = '/hf-models';

// URLs de los modelos
const DETECTION_MODEL = IS_LOCALHOST 
  ? `${LOCAL_PATH}/det_10g.onnx`
  : `${PROXY_PATH}/det_10g.onnx`;
const RECOGNITION_MODEL = IS_LOCALHOST
  ? `${LOCAL_PATH}/w600k_r50.onnx`
  : `${PROXY_PATH}/w600k_r50.onnx`;

// Usar window para persistir entre HMR (Hot Module Reload)
declare global {
  interface Window {
    __insightface_detection?: ort.InferenceSession;
    __insightface_recognition?: ort.InferenceSession;
    __insightface_loaded?: boolean;
    __insightface_loading?: boolean;
  }
}

// Sesiones ONNX (persistidas en window para evitar recargas)
const getDetectionSession = () => typeof window !== 'undefined' ? window.__insightface_detection : null;
const setDetectionSession = (s: ort.InferenceSession) => { if (typeof window !== 'undefined') window.__insightface_detection = s; };
const getRecognitionSession = () => typeof window !== 'undefined' ? window.__insightface_recognition : null;
const setRecognitionSession = (s: ort.InferenceSession) => { if (typeof window !== 'undefined') window.__insightface_recognition = s; };
const isLoaded = () => typeof window !== 'undefined' && window.__insightface_loaded === true;
const setLoaded = () => { if (typeof window !== 'undefined') window.__insightface_loaded = true; };
const isCurrentlyLoading = () => typeof window !== 'undefined' && window.__insightface_loading === true;
const setLoading = (v: boolean) => { if (typeof window !== 'undefined') window.__insightface_loading = v; };

// Variables locales de respaldo
let detectionSession: ort.InferenceSession | null = null;
let recognitionSession: ort.InferenceSession | null = null;
let isInitialized = false;
let isLoading = false;

export interface InsightFaceResult {
  bbox: [number, number, number, number]; // x, y, width, height
  confidence: number;
  landmarks?: number[][]; // 5 puntos: ojo izq, ojo der, nariz, boca izq, boca der
  descriptor?: Float32Array;
}

// Estructura para landmarks faciales
export interface FaceLandmarks {
  leftEye: [number, number];
  rightEye: [number, number];
  nose: [number, number];
  leftMouth: [number, number];
  rightMouth: [number, number];
}

/**
 * Cargar modelos InsightFace - SOLO SE EJECUTA UNA VEZ
 */
export async function loadInsightFaceModels(): Promise<void> {
  // Verificar si ya está cargado en window (persiste entre HMR)
  const existingDet = getDetectionSession();
  const existingRec = getRecognitionSession();
  
  if (existingDet && existingRec) {
    console.log('✅ InsightFace ya cargado (desde window)');
    detectionSession = existingDet;
    recognitionSession = existingRec;
    isInitialized = true;
    return;
  }
  
  if (isLoaded()) {
    console.log('✅ InsightFace marcado como cargado');
    isInitialized = true;
    return;
  }
  
  // Si está cargando, esperar
  if (isCurrentlyLoading()) {
    let wait = 0;
    while (isCurrentlyLoading() && wait < 30) {
      await new Promise(r => setTimeout(r, 500));
      wait++;
    }
    return;
  }
  
  setLoading(true);
  
  try {
    console.log('🔄 Cargando InsightFace SDK...');
    console.log('📍 URL Detección:', DETECTION_MODEL);
    console.log('📍 URL Reconocimiento:', RECOGNITION_MODEL);
    
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/';
    ort.env.wasm.numThreads = 1;
    
    // Función para cargar modelo con fetch manual (evita CORS)
    const loadModelBuffer = async (url: string): Promise<ArrayBuffer> => {
      console.log(`📥 Descargando: ${url}`);
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return response.arrayBuffer();
    };
    
    console.log('- Cargando modelo de detección (SCRFD)...');
    const detBuffer = await loadModelBuffer(DETECTION_MODEL);
    const det = await ort.InferenceSession.create(detBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'basic',
    });
    setDetectionSession(det);
    detectionSession = det;
    console.log('✓ Modelo de detección cargado');
    
    console.log('- Cargando modelo de reconocimiento (ArcFace)...');
    const recBuffer = await loadModelBuffer(RECOGNITION_MODEL);
    const rec = await ort.InferenceSession.create(recBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'basic',
    });
    setRecognitionSession(rec);
    recognitionSession = rec;
    console.log('✓ Modelo de reconocimiento cargado');
    
    setLoaded();
    isInitialized = true;
    console.log('✅ InsightFace SDK listo');
    
  } catch (error: any) {
    console.warn('⚠️ Error cargando InsightFace:', error?.message || error);
    // Marcar como cargado para evitar reintentos infinitos
    setLoaded();
    isInitialized = true;
  } finally {
    setLoading(false);
  }
}

/**
 * Verificar si InsightFace está listo
 */
export function isInsightFaceReady(): boolean {
  return isInitialized || isLoaded();
}

/**
 * Preprocesar imagen para SCRFD
 */
function preprocessForDetection(
  imageData: ImageData,
  targetSize: [number, number] = [640, 640]
): { tensor: ort.Tensor; scale: [number, number]; padding: [number, number] } {
  const [targetW, targetH] = targetSize;
  const { width, height, data } = imageData;
  
  // Calcular escala manteniendo aspect ratio
  const scale = Math.min(targetW / width, targetH / height);
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);
  
  // Crear canvas para resize
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  
  // Fondo negro
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, targetW, targetH);
  
  // Dibujar imagen centrada
  const padX = (targetW - newW) / 2;
  const padY = (targetH - newH) / 2;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);
  
  ctx.drawImage(tempCanvas, padX, padY, newW, newH);
  
  // Obtener datos normalizados
  const resizedData = ctx.getImageData(0, 0, targetW, targetH);
  const float32Data = new Float32Array(3 * targetW * targetH);
  
  // Normalizar a [0, 1] y reorganizar a CHW
  for (let i = 0; i < targetW * targetH; i++) {
    float32Data[i] = resizedData.data[i * 4] / 255.0;                    // R
    float32Data[targetW * targetH + i] = resizedData.data[i * 4 + 1] / 255.0;  // G
    float32Data[2 * targetW * targetH + i] = resizedData.data[i * 4 + 2] / 255.0; // B
  }
  
  return {
    tensor: new ort.Tensor('float32', float32Data, [1, 3, targetH, targetW]),
    scale: [scale, scale],
    padding: [padX, padY],
  };
}

/**
 * Detectar rostro con SCRFD
 */
export async function detectFaceInsight(
  videoOrCanvas: HTMLVideoElement | HTMLCanvasElement
): Promise<InsightFaceResult | null> {
  // Obtener sesión de window o variable local
  const session = getDetectionSession() || detectionSession;
  
  if (!session) {
    // No hay sesión, intentar recargar desde window
    if (typeof window !== 'undefined' && window.__insightface_detection) {
      detectionSession = window.__insightface_detection;
    } else {
      console.warn('InsightFace no inicializado');
      return null;
    }
  }
  
  try {
    // Obtener imagen del video/canvas
    let canvas: HTMLCanvasElement;
    let originalWidth: number;
    let originalHeight: number;
    
    if (videoOrCanvas instanceof HTMLVideoElement) {
      originalWidth = videoOrCanvas.videoWidth;
      originalHeight = videoOrCanvas.videoHeight;
      canvas = document.createElement('canvas');
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(videoOrCanvas, 0, 0);
    } else {
      canvas = videoOrCanvas;
      originalWidth = canvas.width;
      originalHeight = canvas.height;
    }
    
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Preprocesar
    const { tensor, scale, padding } = preprocessForDetection(imageData);
    
    // Usar la sesión verificada
    const activeSession = getDetectionSession() || detectionSession;
    if (!activeSession) {
      console.warn('No hay sesión de detección disponible');
      return null;
    }
    
    // Inferencia
    const feeds: Record<string, ort.Tensor> = {};
    const inputName = activeSession.inputNames[0];
    feeds[inputName] = tensor;
    
    const results = await activeSession.run(feeds);
    
    // SCRFD det_10g outputs - necesitamos decodificar con anchors
    // Por ahora, usamos un enfoque simplificado: encontrar el anchor con mejor score
    // y estimar la posición basada en el índice del anchor
    
    const outputNames = activeSession.outputNames;
    
    let bestScore = 0;
    let bestAnchorIdx = -1;
    let bestScaleInfo: { stride: number; anchors: number; gridW: number; gridH: number } | null = null;
    
    // Escalas del modelo SCRFD (stride 8, 16, 32)
    const scaleConfigs = [
      { scores: '448', stride: 8, gridW: 80, gridH: 80, anchors: 12800 },  // 640/8 = 80
      { scores: '471', stride: 16, gridW: 40, gridH: 40, anchors: 3200 }, // 640/16 = 40
      { scores: '494', stride: 32, gridW: 20, gridH: 20, anchors: 800 },  // 640/32 = 20
    ];
    
    for (const config of scaleConfigs) {
      const scoresData = results[config.scores]?.data as Float32Array;
      if (!scoresData) continue;
      
      for (let i = 0; i < scoresData.length; i++) {
        const score = scoresData[i];
        // Umbral más bajo (0.3) para detectar caras giradas
        if (score > bestScore && score > 0.3) {
          bestScore = score;
          bestAnchorIdx = i;
          bestScaleInfo = config;
        }
      }
    }
    
    if (!bestScaleInfo || bestAnchorIdx < 0) {
      return null;
    }
    
    // Calcular posición del anchor en la grilla
    const { stride, gridW, gridH } = bestScaleInfo;
    const anchorY = Math.floor(bestAnchorIdx / gridW);
    const anchorX = bestAnchorIdx % gridW;
    
    // Convertir a coordenadas en imagen 640x640
    const centerX640 = (anchorX + 0.5) * stride;
    const centerY640 = (anchorY + 0.5) * stride;
    
    // Tamaño estimado del rostro basado en el stride
    const faceSize640 = stride * 4; // Estimación aproximada
    
    // Convertir a coordenadas originales
    const [padX, padY] = padding;
    const [scaleVal] = scale;
    
    const centerXOrig = (centerX640 - padX) / scaleVal;
    const centerYOrig = (centerY640 - padY) / scaleVal;
    const faceSizeOrig = faceSize640 / scaleVal;
    
    const finalX = Math.max(0, centerXOrig - faceSizeOrig / 2);
    const finalY = Math.max(0, centerYOrig - faceSizeOrig / 2);
    const finalW = Math.min(faceSizeOrig, originalWidth - finalX);
    const finalH = Math.min(faceSizeOrig, originalHeight - finalY);
    
    // Extraer landmarks si están disponibles
    // Los landmarks están en outputs 454, 477, 500 (10 valores cada uno: x1,y1,x2,y2,x3,y3,x4,y4,x5,y5)
    let landmarks: number[][] | undefined;
    
    const landmarkOutputs = ['454', '477', '500'];
    const landmarkStrides = [8, 16, 32];
    
    // Encontrar el output de landmarks correspondiente al stride usado
    const strideIdx = landmarkStrides.indexOf(stride);
    if (strideIdx >= 0) {
      const lmOutput = results[landmarkOutputs[strideIdx]]?.data as Float32Array;
      if (lmOutput && bestAnchorIdx * 10 + 9 < lmOutput.length) {
        const lmIdx = bestAnchorIdx * 10;
        landmarks = [
          [(lmOutput[lmIdx] * stride + centerX640 - padX) / scaleVal, (lmOutput[lmIdx + 1] * stride + centerY640 - padY) / scaleVal],     // Ojo izquierdo
          [(lmOutput[lmIdx + 2] * stride + centerX640 - padX) / scaleVal, (lmOutput[lmIdx + 3] * stride + centerY640 - padY) / scaleVal], // Ojo derecho
          [(lmOutput[lmIdx + 4] * stride + centerX640 - padX) / scaleVal, (lmOutput[lmIdx + 5] * stride + centerY640 - padY) / scaleVal], // Nariz
          [(lmOutput[lmIdx + 6] * stride + centerX640 - padX) / scaleVal, (lmOutput[lmIdx + 7] * stride + centerY640 - padY) / scaleVal], // Boca izq
          [(lmOutput[lmIdx + 8] * stride + centerX640 - padX) / scaleVal, (lmOutput[lmIdx + 9] * stride + centerY640 - padY) / scaleVal], // Boca der
        ];
      }
    }
    
    console.log('Detección:', { 
      bbox: [finalX, finalY, finalW, finalH],
      landmarks: landmarks ? 'disponibles' : 'no disponibles',
      score: bestScore 
    });
    
    return {
      bbox: [finalX, finalY, finalW, finalH],
      confidence: bestScore,
      landmarks,
    };
    
  } catch (error) {
    console.error('Error en detección InsightFace:', error);
    return null;
  }
}

/**
 * Extraer descriptor facial con ArcFace
 */
export async function extractDescriptorInsight(
  videoOrCanvas: HTMLVideoElement | HTMLCanvasElement,
  bbox: [number, number, number, number]
): Promise<Float32Array | null> {
  // Obtener sesión de window o variable local
  const recSession = getRecognitionSession() || recognitionSession;
  
  if (!recSession) {
    console.warn('InsightFace recognition no inicializado');
    return null;
  }
  
  try {
    // Obtener imagen
    let canvas: HTMLCanvasElement;
    if (videoOrCanvas instanceof HTMLVideoElement) {
      canvas = document.createElement('canvas');
      canvas.width = videoOrCanvas.videoWidth;
      canvas.height = videoOrCanvas.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(videoOrCanvas, 0, 0);
    } else {
      canvas = videoOrCanvas;
    }
    
    // Recortar rostro con margen
    const [x, y, w, h] = bbox;
    const margin = 0.2;
    const cropX = Math.max(0, x - w * margin);
    const cropY = Math.max(0, y - h * margin);
    const cropW = w * (1 + 2 * margin);
    const cropH = h * (1 + 2 * margin);
    
    // Crear canvas para el rostro (112x112 para ArcFace)
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 112;
    faceCanvas.height = 112;
    const faceCtx = faceCanvas.getContext('2d')!;
    
    faceCtx.drawImage(
      canvas,
      cropX, cropY, cropW, cropH,
      0, 0, 112, 112
    );
    
    // Preprocesar para ArcFace
    const faceData = faceCtx.getImageData(0, 0, 112, 112);
    const float32Data = new Float32Array(3 * 112 * 112);
    
    // Normalizar con mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]
    for (let i = 0; i < 112 * 112; i++) {
      float32Data[i] = (faceData.data[i * 4] / 255.0 - 0.5) / 0.5;
      float32Data[112 * 112 + i] = (faceData.data[i * 4 + 1] / 255.0 - 0.5) / 0.5;
      float32Data[2 * 112 * 112 + i] = (faceData.data[i * 4 + 2] / 255.0 - 0.5) / 0.5;
    }
    
    const tensor = new ort.Tensor('float32', float32Data, [1, 3, 112, 112]);
    
    // Inferencia con sesión verificada
    const activeRecSession = getRecognitionSession() || recognitionSession;
    if (!activeRecSession) {
      console.warn('No hay sesión de reconocimiento disponible');
      return null;
    }
    
    const feeds: Record<string, ort.Tensor> = {};
    const inputName = activeRecSession.inputNames[0];
    feeds[inputName] = tensor;
    
    const results = await activeRecSession.run(feeds);
    const outputName = activeRecSession.outputNames[0];
    const embedding = results[outputName].data as Float32Array;
    
    // Normalizar L2
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    
    const normalized = new Float32Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / norm;
    }
    
    return normalized;
    
  } catch (error) {
    console.error('Error extrayendo descriptor:', error);
    return null;
  }
}

/**
 * Detectar y extraer descriptor en un solo paso
 */
export async function detectAndExtract(
  videoOrCanvas: HTMLVideoElement | HTMLCanvasElement
): Promise<InsightFaceResult | null> {
  const detection = await detectFaceInsight(videoOrCanvas);
  if (!detection) return null;
  
  const descriptor = await extractDescriptorInsight(videoOrCanvas, detection.bbox);
  if (descriptor) {
    detection.descriptor = descriptor;
  }
  
  return detection;
}

/**
 * Calcular similitud coseno entre descriptores
 */
export function cosineSimilarity(desc1: Float32Array, desc2: Float32Array): number {
  if (desc1.length !== desc2.length) {
    throw new Error('Descriptores de diferente tamaño');
  }
  
  let dot = 0;
  for (let i = 0; i < desc1.length; i++) {
    dot += desc1[i] * desc2[i];
  }
  
  return dot; // Ya están normalizados L2
}

/**
 * Convertir descriptor a string
 */
export function descriptorToStringInsight(descriptor: Float32Array): string {
  return Array.from(descriptor).join(',');
}

/**
 * Convertir string a descriptor
 */
export function stringToDescriptorInsight(str: string): Float32Array {
  return new Float32Array(str.split(',').map(Number));
}

