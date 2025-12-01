import { Injectable, Logger } from '@nestjs/common';

/**
 * InsightFace Service - ArcFace 512D Embeddings
 * 
 * Handles facial embedding generation and comparison using ArcFace model.
 * Embeddings are 512-dimensional vectors normalized to unit length.
 */

export interface EmbeddingResult {
  embedding: number[];
  quality: number;
  faceDetected: boolean;
  error?: string;
}

export interface ComparisonResult {
  distance: number;
  similarity: number;
  isMatch: boolean;
  confidence: number;
  matchLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

@Injectable()
export class InsightFaceService {
  private readonly logger = new Logger(InsightFaceService.name);

  // Thresholds for ArcFace cosine distance
  private readonly THRESHOLDS = {
    MATCH_HIGH: 0.35,      // Very confident match
    MATCH_MEDIUM: 0.45,    // Confident match
    MATCH_LOW: 0.55,       // Borderline - needs AWS backup
    NO_MATCH: 0.55,        // Above this = no match
  };

  /**
   * Calculate cosine distance between two embeddings
   * Returns value between 0 (identical) and 2 (opposite)
   */
  cosineDistance(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error(`Embedding dimension mismatch: ${embedding1.length} vs ${embedding2.length}`);
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const cosineSimilarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    // Convert similarity [-1, 1] to distance [0, 2]
    return 1 - cosineSimilarity;
  }

  /**
   * Calculate euclidean distance between two embeddings
   */
  euclideanDistance(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error(`Embedding dimension mismatch: ${embedding1.length} vs ${embedding2.length}`);
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Normalize embedding to unit length
   */
  normalizeEmbedding(embedding: number[]): number[] {
    let norm = 0;
    for (const val of embedding) {
      norm += val * val;
    }
    norm = Math.sqrt(norm);
    
    if (norm === 0) return embedding;
    return embedding.map(val => val / norm);
  }

  /**
   * Average multiple embeddings (for registration)
   */
  averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      throw new Error('No embeddings to average');
    }

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

    // Normalize the averaged embedding
    return this.normalizeEmbedding(avg);
  }

  /**
   * Calculate embedding quality based on variance
   */
  calculateQuality(embeddings: number[][]): number {
    if (embeddings.length < 2) return 1.0;

    const avg = this.averageEmbeddings(embeddings);
    let totalVariance = 0;

    for (const emb of embeddings) {
      const dist = this.cosineDistance(emb, avg);
      totalVariance += dist * dist;
    }

    const avgVariance = totalVariance / embeddings.length;
    // Convert variance to quality score (0-1, higher is better)
    // Low variance = high quality
    return Math.max(0, 1 - avgVariance * 10);
  }

  /**
   * Compare two embeddings and return detailed result
   */
  compareEmbeddings(
    sourceEmbedding: number[],
    targetEmbedding: number[],
  ): ComparisonResult {
    const distance = this.cosineDistance(sourceEmbedding, targetEmbedding);
    const similarity = (1 - distance / 2) * 100; // Convert to 0-100%

    let matchLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    let isMatch = false;

    if (distance < this.THRESHOLDS.MATCH_HIGH) {
      matchLevel = 'HIGH';
      isMatch = true;
    } else if (distance < this.THRESHOLDS.MATCH_MEDIUM) {
      matchLevel = 'MEDIUM';
      isMatch = true;
    } else if (distance < this.THRESHOLDS.MATCH_LOW) {
      matchLevel = 'LOW';
      isMatch = false; // Needs AWS backup
    } else {
      matchLevel = 'NONE';
      isMatch = false;
    }

    // Calculate confidence based on distance from threshold
    let confidence: number;
    if (distance < this.THRESHOLDS.MATCH_MEDIUM) {
      confidence = Math.min(100, (1 - distance / this.THRESHOLDS.MATCH_MEDIUM) * 100);
    } else {
      confidence = Math.max(0, (1 - (distance - this.THRESHOLDS.MATCH_MEDIUM) / 0.5) * 50);
    }

    this.logger.debug(
      `Embedding comparison: distance=${distance.toFixed(4)}, ` +
      `similarity=${similarity.toFixed(1)}%, matchLevel=${matchLevel}`
    );

    return {
      distance,
      similarity,
      isMatch,
      confidence,
      matchLevel,
    };
  }

  /**
   * Find best match among multiple users
   */
  findBestMatch(
    sourceEmbedding: number[],
    users: Array<{ id: string; embedding512: string; name: string; faceImage?: string }>,
  ): { user: typeof users[0] | null; result: ComparisonResult } {
    let bestMatch: typeof users[0] | null = null;
    let bestResult: ComparisonResult = {
      distance: Infinity,
      similarity: 0,
      isMatch: false,
      confidence: 0,
      matchLevel: 'NONE',
    };

    for (const user of users) {
      try {
        const targetEmbedding = JSON.parse(user.embedding512);
        const result = this.compareEmbeddings(sourceEmbedding, targetEmbedding);

        if (result.distance < bestResult.distance) {
          bestMatch = user;
          bestResult = result;
        }
      } catch (e) {
        this.logger.warn(`Failed to parse embedding for user ${user.id}: ${e.message}`);
      }
    }

    return { user: bestMatch, result: bestResult };
  }

  /**
   * Validate embedding format and dimensions
   */
  validateEmbedding(embedding: number[]): { valid: boolean; error?: string } {
    if (!Array.isArray(embedding)) {
      return { valid: false, error: 'Embedding must be an array' };
    }

    if (embedding.length !== 512) {
      return { valid: false, error: `Expected 512 dimensions, got ${embedding.length}` };
    }

    for (let i = 0; i < embedding.length; i++) {
      if (typeof embedding[i] !== 'number' || isNaN(embedding[i])) {
        return { valid: false, error: `Invalid value at index ${i}` };
      }
    }

    return { valid: true };
  }

  /**
   * Check if distance is in borderline zone (needs AWS backup)
   */
  needsAwsBackup(distance: number): boolean {
    return distance >= this.THRESHOLDS.MATCH_MEDIUM && 
           distance < this.THRESHOLDS.NO_MATCH;
  }

  /**
   * Get thresholds for external use
   */
  getThresholds() {
    return { ...this.THRESHOLDS };
  }
}
