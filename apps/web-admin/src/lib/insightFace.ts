/**
 * InsightFace SDK - Detección y Reconocimiento Facial
 * Usa ONNX Runtime Web con modelos SCRFD + ArcFace
 */

import * as ort from 'onnxruntime-web';

// Configuración - modelos desde Cloudflare R2 (CORS habilitado)
const IS_LOCALHOST = typeof window !== 'undefined' && window.location.hostname.includes('localhost');

// Cloudflare R2 Bucket URL
const R2_BUCKET = 'https://pub-9d169f7a228744c8b2828de2f4645bb5.r2.dev';
const LOCAL_PATH = '/models/insightface';

// URLs de los modelos
const DETECTION_MODEL = IS_LOCALHOST 
  ? `${LOCAL_PATH}/det_10g.onnx`
  : `${R2_BUCKET}/det_10g.onnx`;
const RECOGNITION_MODEL = IS_LOCALHOST
  ? `${LOCAL_PATH}/w600k_r50.onnx`
  : `${R2_BUCKET}/w600k_r50.onnx`;

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
    
    // PLAN LOCAL vs PLAN RAILWAY
    if (IS_LOCALHOST) {
      console.log('🏠 MODO LOCAL: Usando archivos del sistema de archivos');
      // En local, los archivos están en la raíz de public/
      ort.env.wasm.wasmPaths = '/';
    } else {
      console.log('☁️ MODO PRODUCCIÓN: Usando CDN');
      // Configurar WASM paths al CDN con la versión EXACTA instalada (1.23.2)
      const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
      ort.env.wasm.wasmPaths = WASM_CDN;
    }
    
    // Configuración para evitar errores de carga dinámica
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    
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
    console.error('❌ ERROR CRÍTICO cargando InsightFace:', error?.message || error);
    console.error('Stack:', error?.stack);
    // NO marcar como inicializado si falló - permitir reintentos
    isInitialized = false;
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
    
    // Debug: Verificar si la imagen no es negra
    const centerPixel = (canvas.height / 2) * canvas.width + (canvas.width / 2);
    const pixelData = imageData.data.slice(centerPixel * 4, centerPixel * 4 + 4);
    console.log(`🎨 Pixel central: R=${pixelData[0]} G=${pixelData[1]} B=${pixelData[2]}`);

    // Preprocesar
    const { tensor, scale, padding } = preprocessForDetection(imageData);
    
    // Inferencia
    const feeds: Record<string, ort.Tensor> = {};
    // Aseguramos que session existe (ya verificado arriba)
    const activeSession = session!; 
    const inputName = activeSession.inputNames[0];
    feeds[inputName] = tensor;
    console.log('🧠 Ejecutando inferencia SCRFD...');
    const results = await activeSession.run(feeds);
    
    // Postprocesar resultados
    console.log('📊 Outputs del modelo:', Object.keys(results));
    
    // DEBUG: Ver tamaños de cada output
    for (const key of Object.keys(results)) {
      const data = results[key].data as Float32Array;
      const maxVal = Math.max(...Array.from(data.slice(0, 100)));
      console.log(`  Output "${key}": length=${data.length}, maxVal(primeros100)=${maxVal.toFixed(4)}`);
    }
    
    // Lógica dinámica para encontrar outputs de score y bbox
    let bestScore = 0;
    let bestAnchorIdx = -1;
    let bestStride = 0;
    
    const resultKeys = Object.keys(results);
    
    // Buscamos outputs que parezcan scores (shape [1, num_anchors, 1])
    // Stride 8: 12800 anchors (640x640) -> data length 12800
    // Stride 16: 3200 anchors -> data length 3200
    // Stride 32: 800 anchors -> data length 800
    
    const strideMap: Record<number, number> = {
      12800: 8,
      3200: 16,
      800: 32
    };

    for (const key of resultKeys) {
      const output = results[key];
      const data = output.data as Float32Array;
      const len = data.length;
      
      // Verificar si es un output de scores conocido
      if (strideMap[len]) {
        const stride = strideMap[len];
        
        for (let i = 0; i < len; i++) {
          const score = data[i];
          // Umbral muy bajo para detectar algo
          if (score > 0.4 && score > bestScore) {
            bestScore = score;
            bestAnchorIdx = i;
            bestStride = stride;
          }
        }
      }
    }
    
    if (bestScore < 0.4 || bestAnchorIdx === -1) {
      // console.log('🤷‍♂️ Score bajo:', bestScore);
      return null;
    }
    
    // Calcular bbox
    // Necesitamos encontrar el output de bbox correspondiente al stride del score
    // Bbox output tiene shape [1, num_anchors, 4] -> length = num_anchors * 4
    const anchors = bestStride === 8 ? 12800 : (bestStride === 16 ? 3200 : 800);
    const bboxLen = anchors * 4;
    
    let bboxData: Float32Array | null = null;
    
    // Buscar el output de bbox que coincida en tamaño
    for (const key of resultKeys) {
      const data = results[key].data as Float32Array;
      if (data.length === bboxLen) {
        bboxData = data;
        break;
      }
    }
    
    if (!bboxData) {
        console.warn('No se encontró output de bbox compatible');
        return null;
    }
    
    // Recuperar bbox (están en formato distancia al centro del anchor: l, t, r, b)
    // Nota: SCRFD exportado simple suele dar bbox directo o distancias. Asumiremos distancias * stride.
    
    const gridW = 640 / bestStride;
    const anchorY = Math.floor(bestAnchorIdx / gridW);
    const anchorX = bestAnchorIdx % gridW;
    
    const anchorCenterX = (anchorX + 0.5) * bestStride;
    const anchorCenterY = (anchorY + 0.5) * bestStride;
    
    const idx4 = bestAnchorIdx * 4;
    const l = bboxData[idx4] * bestStride;
    const t = bboxData[idx4+1] * bestStride;
    const r = bboxData[idx4+2] * bestStride;
    const b = bboxData[idx4+3] * bestStride;
    
    const x1 = anchorCenterX - l;
    const y1 = anchorCenterY - t;
    const x2 = anchorCenterX + r;
    const y2 = anchorCenterY + b;
    
    // Escalar a tamaño original
    const [padX, padY] = padding;
    const [scaleVal] = scale;
    
    const finalX = (x1 - padX) / scaleVal;
    const finalY = (y1 - padY) / scaleVal;
    const finalW = (x2 - x1) / scaleVal;
    const finalH = (y2 - y1) / scaleVal;
    
    // console.log(`✨ ROSTRO DETECTADO! Score: ${bestScore.toFixed(2)} en stride ${bestStride}`);
    
    return {
      bbox: [finalX, finalY, finalW, finalH],
      confidence: bestScore,
      landmarks: [] // Simplificado
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

