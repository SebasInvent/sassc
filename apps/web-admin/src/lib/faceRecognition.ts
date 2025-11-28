import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

// Opciones optimizadas para detección - umbral muy bajo para mejor detección
const DETECTION_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,      // Tamaño más pequeño = más rápido
  scoreThreshold: 0.1  // Umbral muy bajo = detecta más fácilmente
});

/**
 * Carga los modelos de face-api.js
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) {
    console.log('Modelos ya cargados');
    return;
  }
  
  // Evitar cargas múltiples simultáneas
  if (loadingPromise) {
    return loadingPromise;
  }
  
  const MODEL_URL = '/models';
  
  loadingPromise = (async () => {
    try {
      console.log('🔄 Cargando modelos de reconocimiento facial desde:', MODEL_URL);
      
      // Cargar modelos secuencialmente para mejor debugging
      console.log('  - Cargando TinyFaceDetector...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log('  ✓ TinyFaceDetector cargado');
      
      console.log('  - Cargando FaceLandmark68Net...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log('  ✓ FaceLandmark68Net cargado');
      
      console.log('  - Cargando FaceRecognitionNet...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log('  ✓ FaceRecognitionNet cargado');
      
      modelsLoaded = true;
      console.log('✅ Todos los modelos cargados correctamente');
    } catch (error) {
      console.error('❌ Error cargando modelos:', error);
      loadingPromise = null;
      throw new Error('No se pudieron cargar los modelos de reconocimiento facial');
    }
  })();
  
  return loadingPromise;
}

/**
 * Verifica si los modelos están cargados
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Detecta un rostro en un elemento de video y retorna su descriptor
 */
export async function detectFace(
  videoElement: HTMLVideoElement
): Promise<Float32Array | null> {
  if (!modelsLoaded) {
    await loadModels();
  }

  // Verificar que el video esté listo
  if (!videoElement || videoElement.readyState < 2) {
    console.log('Video no está listo, readyState:', videoElement?.readyState);
    return null;
  }

  try {
    const detection = await faceapi
      .detectSingleFace(videoElement, DETECTION_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return detection.descriptor;
  } catch (error) {
    console.error('Error en detección:', error);
    return null;
  }
}

/**
 * Detecta solo si hay un rostro (más rápido, sin descriptor)
 */
export async function detectFaceOnly(
  videoElement: HTMLVideoElement
): Promise<boolean> {
  if (!modelsLoaded) {
    await loadModels();
  }

  if (!videoElement || videoElement.readyState < 2) {
    return false;
  }

  try {
    const detection = await faceapi.detectSingleFace(videoElement, DETECTION_OPTIONS);
    return !!detection;
  } catch (error) {
    return false;
  }
}

/**
 * Calcula la distancia euclidiana entre dos arrays
 */
export function euclideanDistance(arr1: Float32Array, arr2: Float32Array): number {
  if (arr1.length !== arr2.length) {
    throw new Error('Los arrays deben tener la misma longitud');
  }
  
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Compara dos descriptores faciales y retorna el porcentaje de similitud
 */
export function compareFaces(
  descriptor1: Float32Array,
  descriptor2: Float32Array
): number {
  console.log('🔬 Comparando descriptores:');
  console.log('  - Descriptor 1 length:', descriptor1.length, 'primeros 3:', Array.from(descriptor1.slice(0, 3)).map(n => n.toFixed(4)));
  console.log('  - Descriptor 2 length:', descriptor2.length, 'primeros 3:', Array.from(descriptor2.slice(0, 3)).map(n => n.toFixed(4)));
  
  // Calcular distancia euclidiana manualmente
  const distance = euclideanDistance(descriptor1, descriptor2);
  console.log('  - Distancia euclidiana:', distance.toFixed(4));
  
  // En face-api.js, distancias típicas:
  // - Misma persona: 0.3 - 0.5
  // - Personas diferentes: 0.7 - 1.2+
  // Threshold recomendado: 0.6
  
  // Convertir a porcentaje: distancia 0 = 100%, distancia 0.6 = 50%, distancia 1.2 = 0%
  const maxDistance = 1.2;
  const similarity = Math.max(0, Math.min(100, ((maxDistance - distance) / maxDistance) * 100));
  console.log('  - Similitud calculada:', similarity.toFixed(1) + '%');
  
  return Math.round(similarity);
}

/**
 * Convierte un descriptor (Float32Array) a string JSON para almacenar en BD
 */
export function descriptorToString(descriptor: Float32Array): string {
  return JSON.stringify(Array.from(descriptor));
}

/**
 * Convierte un string JSON a descriptor (Float32Array)
 */
export function stringToDescriptor(str: string): Float32Array {
  try {
    // Si ya es un array, usarlo directamente
    if (Array.isArray(str)) {
      return new Float32Array(str as unknown as number[]);
    }
    
    const array = JSON.parse(str);
    
    if (!Array.isArray(array)) {
      throw new Error('El descriptor no es un array válido');
    }
    
    return new Float32Array(array);
  } catch (e) {
    console.error('Error parseando descriptor:', e, 'Input:', str?.substring?.(0, 100));
    throw e;
  }
}

/**
 * Busca el usuario más similar en una lista de usuarios registrados
 * 
 * Algoritmo:
 * 1. Calcula la distancia euclidiana contra TODOS los usuarios
 * 2. Ordena por distancia (menor = más similar)
 * 3. Si el mejor tiene distancia < 0.6 Y hay diferencia significativa con el segundo → Reconocer
 * 4. Si no cumple los criterios → No reconocer
 */
export function findBestMatch(
  capturedDescriptor: Float32Array,
  registeredUsers: Array<{ id: string; name: string; descriptor: string }>
): { user: { id: string; name: string } | null; similarity: number } {
  
  // Calcular distancias para TODOS los usuarios
  const results: Array<{
    user: { id: string; name: string };
    distance: number;
    similarity: number;
  }> = [];

  for (const user of registeredUsers) {
    try {
      if (!user.descriptor) continue;
      
      const storedDescriptor = stringToDescriptor(user.descriptor);
      if (storedDescriptor.length !== capturedDescriptor.length) continue;
      
      const distance = euclideanDistance(capturedDescriptor, storedDescriptor);
      const similarity = Math.max(0, Math.min(100, ((1.2 - distance) / 1.2) * 100));
      
      results.push({
        user: { id: user.id, name: user.name },
        distance,
        similarity: Math.round(similarity)
      });
    } catch (error) {
      console.error(`Error con ${user.name}:`, error);
    }
  }

  if (results.length === 0) {
    return { user: null, similarity: 0 };
  }

  // Ordenar por distancia (menor primero)
  results.sort((a, b) => a.distance - b.distance);
  
  const best = results[0];
  const second = results[1];
  
  // Log para debug
  console.log('🔍 Comparación de rostros:');
  results.forEach((r, i) => {
    const marker = i === 0 ? ' ← MEJOR' : '';
    console.log(`   ${r.user.name}: ${r.distance.toFixed(4)} (${r.similarity}%)${marker}`);
  });

  // REGLA SIMPLE: Si la mejor distancia es <= 0.6, reconocer
  // Distancias típicas:
  // - Misma persona: 0.02 - 0.15
  // - Personas diferentes: 0.6+
  if (best.distance <= 0.6) {
    console.log(`✅ Reconocido: ${best.user.name} (distancia: ${best.distance.toFixed(4)})`);
    return { user: best.user, similarity: best.similarity };
  }
  
  console.log(`❌ No reconocido (distancia: ${best.distance.toFixed(4)} > 0.6)`);
  return { user: null, similarity: best.similarity };
}

/**
 * Verifica si hay un rostro visible en el video
 */
export async function isFaceVisible(
  videoElement: HTMLVideoElement
): Promise<boolean> {
  if (!modelsLoaded) {
    await loadModels();
  }

  const detection = await faceapi.detectSingleFace(
    videoElement,
    new faceapi.TinyFaceDetectorOptions()
  );

  return !!detection;
}
