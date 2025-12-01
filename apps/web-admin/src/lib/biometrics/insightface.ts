/**
 * InsightFace - ArcFace 512D Embeddings (Frontend)
 * 
 * Uses ONNX Runtime Web to run ArcFace model in browser.
 * Generates 512-dimensional face embeddings for comparison.
 */

import * as ort from 'onnxruntime-web';

// Types
export interface EmbeddingResult {
  embedding: number[];
  quality: number;
  faceDetected: boolean;
  processingTimeMs: number;
  error?: string;
}

export interface ComparisonResult {
  distance: number;
  similarity: number;
  isMatch: boolean;
  confidence: number;
}

// Model state
let session: ort.InferenceSession | null = null;
let isInitializing = false;

// ArcFace model configuration
const MODEL_CONFIG = {
  inputSize: 112,  // ArcFace expects 112x112 input
  outputSize: 512, // 512-dimensional embedding
  modelPath: '/models/arcface_mobilefacenet.onnx',
};

// Thresholds
const THRESHOLDS = {
  MATCH: 0.45,
  HIGH_CONFIDENCE: 0.35,
};

/**
 * Initialize InsightFace model
 */
export async function initInsightFace(): Promise<void> {
  if (session || isInitializing) return;

  isInitializing = true;
  console.log('🔄 Loading InsightFace ArcFace model...');

  try {
    // Configure ONNX Runtime
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/';
    
    // Try WebGPU first, fallback to WASM
    const executionProviders = ['webgpu', 'wasm'];
    
    session = await ort.InferenceSession.create(MODEL_CONFIG.modelPath, {
      executionProviders,
      graphOptimizationLevel: 'all',
    });

    console.log('✅ InsightFace model loaded');
    console.log('   Input:', session.inputNames);
    console.log('   Output:', session.outputNames);

  } catch (error: any) {
    console.error('❌ Failed to load InsightFace model:', error.message);
    
    // Fallback: try loading from CDN
    try {
      const cdnPath = 'https://huggingface.co/nickmuchi/mobilefacenet-arcface-onnx/resolve/main/mobilefacenet.onnx';
      session = await ort.InferenceSession.create(cdnPath, {
        executionProviders: ['wasm'],
      });
      console.log('✅ InsightFace model loaded from CDN');
    } catch (cdnError: any) {
      console.error('❌ CDN fallback also failed:', cdnError.message);
      throw new Error('Failed to load InsightFace model');
    }
  } finally {
    isInitializing = false;
  }
}

/**
 * Extract face embedding from image
 */
export async function extractEmbedding(
  imageSource: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<EmbeddingResult> {
  const startTime = performance.now();

  if (!session) {
    await initInsightFace();
  }

  if (!session) {
    return {
      embedding: [],
      quality: 0,
      faceDetected: false,
      processingTimeMs: performance.now() - startTime,
      error: 'Model not loaded',
    };
  }

  try {
    // Preprocess image
    const inputTensor = preprocessImage(imageSource);

    // Run inference
    const feeds: Record<string, ort.Tensor> = {};
    feeds[session.inputNames[0]] = inputTensor;

    const results = await session.run(feeds);
    const outputTensor = results[session.outputNames[0]];
    const embedding = Array.from(outputTensor.data as Float32Array);

    // Normalize embedding
    const normalizedEmbedding = normalizeEmbedding(embedding);

    // Calculate quality (based on embedding magnitude before normalization)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const quality = Math.min(1, magnitude / 20); // Typical magnitude is around 15-25

    return {
      embedding: normalizedEmbedding,
      quality,
      faceDetected: true,
      processingTimeMs: performance.now() - startTime,
    };

  } catch (error: any) {
    return {
      embedding: [],
      quality: 0,
      faceDetected: false,
      processingTimeMs: performance.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Preprocess image for ArcFace model
 */
function preprocessImage(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): ort.Tensor {
  // Create canvas for preprocessing
  const canvas = document.createElement('canvas');
  canvas.width = MODEL_CONFIG.inputSize;
  canvas.height = MODEL_CONFIG.inputSize;
  const ctx = canvas.getContext('2d')!;

  // Draw and resize image
  ctx.drawImage(source, 0, 0, MODEL_CONFIG.inputSize, MODEL_CONFIG.inputSize);

  // Get image data
  const imageData = ctx.getImageData(0, 0, MODEL_CONFIG.inputSize, MODEL_CONFIG.inputSize);
  const { data } = imageData;

  // Convert to tensor format: [1, 3, 112, 112] with normalization
  const tensorData = new Float32Array(1 * 3 * MODEL_CONFIG.inputSize * MODEL_CONFIG.inputSize);
  
  // ArcFace normalization: (pixel - 127.5) / 128
  for (let i = 0; i < MODEL_CONFIG.inputSize * MODEL_CONFIG.inputSize; i++) {
    const r = (data[i * 4] - 127.5) / 128;
    const g = (data[i * 4 + 1] - 127.5) / 128;
    const b = (data[i * 4 + 2] - 127.5) / 128;

    // RGB channels
    tensorData[i] = r;
    tensorData[MODEL_CONFIG.inputSize * MODEL_CONFIG.inputSize + i] = g;
    tensorData[2 * MODEL_CONFIG.inputSize * MODEL_CONFIG.inputSize + i] = b;
  }

  return new ort.Tensor('float32', tensorData, [1, 3, MODEL_CONFIG.inputSize, MODEL_CONFIG.inputSize]);
}

/**
 * Normalize embedding to unit length
 */
function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return embedding;
  return embedding.map(val => val / norm);
}

/**
 * Calculate cosine distance between embeddings
 */
export function cosineDistance(emb1: number[], emb2: number[]): number {
  if (emb1.length !== emb2.length) {
    throw new Error('Embedding dimension mismatch');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < emb1.length; i++) {
    dotProduct += emb1[i] * emb2[i];
    norm1 += emb1[i] * emb1[i];
    norm2 += emb2[i] * emb2[i];
  }

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return 1 - similarity; // Convert to distance
}

/**
 * Compare two embeddings
 */
export function compareEmbeddings(emb1: number[], emb2: number[]): ComparisonResult {
  const distance = cosineDistance(emb1, emb2);
  const similarity = (1 - distance / 2) * 100;
  const isMatch = distance < THRESHOLDS.MATCH;
  
  let confidence: number;
  if (distance < THRESHOLDS.HIGH_CONFIDENCE) {
    confidence = 100;
  } else if (distance < THRESHOLDS.MATCH) {
    confidence = 80 + (THRESHOLDS.MATCH - distance) / (THRESHOLDS.MATCH - THRESHOLDS.HIGH_CONFIDENCE) * 20;
  } else {
    confidence = Math.max(0, 80 - (distance - THRESHOLDS.MATCH) * 100);
  }

  return { distance, similarity, isMatch, confidence };
}

/**
 * Average multiple embeddings
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];

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

  return normalizeEmbedding(avg);
}

/**
 * Calculate embedding quality from multiple captures
 */
export function calculateQuality(embeddings: number[][]): number {
  if (embeddings.length < 2) return 1;

  const avg = averageEmbeddings(embeddings);
  let totalVariance = 0;

  for (const emb of embeddings) {
    const dist = cosineDistance(emb, avg);
    totalVariance += dist * dist;
  }

  const avgVariance = totalVariance / embeddings.length;
  return Math.max(0, 1 - avgVariance * 10);
}

/**
 * Find best match among registered users
 */
export function findBestMatch(
  sourceEmbedding: number[],
  users: Array<{ id: string; name: string; embedding512: string }>
): { user: typeof users[0] | null; result: ComparisonResult } {
  let bestUser: typeof users[0] | null = null;
  let bestResult: ComparisonResult = {
    distance: Infinity,
    similarity: 0,
    isMatch: false,
    confidence: 0,
  };

  for (const user of users) {
    try {
      const targetEmbedding = JSON.parse(user.embedding512);
      const result = compareEmbeddings(sourceEmbedding, targetEmbedding);

      if (result.distance < bestResult.distance) {
        bestUser = user;
        bestResult = result;
      }
    } catch (e) {
      console.warn(`Failed to parse embedding for user ${user.id}`);
    }
  }

  return { user: bestUser, result: bestResult };
}

/**
 * Cleanup
 */
export async function cleanupInsightFace(): Promise<void> {
  if (session) {
    await session.release();
    session = null;
  }
}

/**
 * Check if model is loaded
 */
export function isModelLoaded(): boolean {
  return session !== null;
}
