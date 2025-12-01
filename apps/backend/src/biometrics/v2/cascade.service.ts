import { Injectable, Logger } from '@nestjs/common';
import { InsightFaceService, ComparisonResult } from './insightface.service';
import { LivenessService, LivenessData, LivenessResult } from './liveness.service';
import { AntiSpoofService, AntiSpoofData, AntiSpoofResult } from './antispoof.service';
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

/**
 * Cascade Verification Service
 * 
 * Orchestrates the biometric verification pipeline:
 * 1. Liveness Check (Mediapipe)
 * 2. Anti-Spoof Check (CNN)
 * 3. InsightFace Comparison (ArcFace 512D)
 * 4. AWS Rekognition Backup (if borderline)
 */

export interface RegisteredUser {
  id: string;
  name: string;
  embedding512: string;
  faceImage?: string;
}

export interface CascadeVerificationInput {
  // Current capture
  embedding512: number[];
  imageBase64: string;
  livenessData: LivenessData;
  antiSpoofData: AntiSpoofData;
  
  // Registered users to compare against
  registeredUsers: RegisteredUser[];
}

export interface CascadeVerificationResult {
  success: boolean;
  matchedUser: {
    id: string;
    name: string;
  } | null;
  
  // Scores
  arcfaceScore: number;        // 0-100 similarity
  arcfaceDistance: number;     // Raw distance
  livenessScore: number;       // 0-100
  spoofScore: number;          // 0-100 (lower is better)
  awsSimilarity: number | null; // 0-100 if used
  
  // Final decision
  finalDecision: 'MATCH' | 'NO_MATCH' | 'SPOOF_DETECTED' | 'LIVENESS_FAILED' | 'ERROR';
  normalizedConfidence: number; // 0-100
  
  // Provider breakdown
  providerBreakdown: {
    liveness: { passed: boolean; score: number; details: LivenessResult };
    antiSpoof: { passed: boolean; score: number; details: AntiSpoofResult };
    insightFace: { passed: boolean; score: number; details: ComparisonResult };
    awsRekognition: { used: boolean; passed: boolean; score: number } | null;
  };
  
  // Metadata
  verificationTimeMs: number;
  reason: string;
}

@Injectable()
export class CascadeService {
  private readonly logger = new Logger(CascadeService.name);
  private rekognitionClient: RekognitionClient | null = null;

  constructor(
    private readonly insightFaceService: InsightFaceService,
    private readonly livenessService: LivenessService,
    private readonly antiSpoofService: AntiSpoofService,
  ) {
    // Initialize AWS Rekognition client if credentials are available
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.rekognitionClient = new RekognitionClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.logger.log('AWS Rekognition client initialized');
    } else {
      this.logger.warn('AWS Rekognition not configured - backup verification disabled');
    }
  }

  /**
   * Main cascade verification method
   */
  async verify(input: CascadeVerificationInput): Promise<CascadeVerificationResult> {
    const startTime = Date.now();
    
    this.logger.log('Starting cascade verification...');

    // Initialize result
    let result: CascadeVerificationResult = {
      success: false,
      matchedUser: null,
      arcfaceScore: 0,
      arcfaceDistance: Infinity,
      livenessScore: 0,
      spoofScore: 100,
      awsSimilarity: null,
      finalDecision: 'ERROR',
      normalizedConfidence: 0,
      providerBreakdown: {
        liveness: { passed: false, score: 0, details: {} as LivenessResult },
        antiSpoof: { passed: false, score: 0, details: {} as AntiSpoofResult },
        insightFace: { passed: false, score: 0, details: {} as ComparisonResult },
        awsRekognition: null,
      },
      verificationTimeMs: 0,
      reason: '',
    };

    try {
      // Step 1: Liveness Check
      this.logger.debug('Step 1: Liveness check...');
      const livenessResult = this.livenessService.validateLiveness(input.livenessData);
      result.livenessScore = livenessResult.livenessScore;
      result.providerBreakdown.liveness = {
        passed: livenessResult.isLive,
        score: livenessResult.livenessScore,
        details: livenessResult,
      };

      if (!livenessResult.isLive) {
        result.finalDecision = 'LIVENESS_FAILED';
        result.reason = livenessResult.reason || 'Liveness check failed';
        result.verificationTimeMs = Date.now() - startTime;
        this.logger.warn(`Liveness failed: ${result.reason}`);
        return result;
      }

      // Step 2: Anti-Spoof Check
      this.logger.debug('Step 2: Anti-spoof check...');
      const antiSpoofResult = this.antiSpoofService.validateAntiSpoof(input.antiSpoofData);
      result.spoofScore = antiSpoofResult.spoofScore;
      result.providerBreakdown.antiSpoof = {
        passed: antiSpoofResult.isReal,
        score: 100 - antiSpoofResult.spoofScore, // Invert for consistency
        details: antiSpoofResult,
      };

      if (!antiSpoofResult.isReal) {
        result.finalDecision = 'SPOOF_DETECTED';
        result.reason = antiSpoofResult.reason || 'Spoof attack detected';
        result.verificationTimeMs = Date.now() - startTime;
        this.logger.warn(`Spoof detected: ${result.reason}`);
        return result;
      }

      // Step 3: InsightFace Comparison
      this.logger.debug('Step 3: InsightFace comparison...');
      const { user: bestMatch, result: comparisonResult } = 
        this.insightFaceService.findBestMatch(input.embedding512, input.registeredUsers);

      result.arcfaceDistance = comparisonResult.distance;
      result.arcfaceScore = comparisonResult.similarity;
      result.providerBreakdown.insightFace = {
        passed: comparisonResult.isMatch,
        score: comparisonResult.similarity,
        details: comparisonResult,
      };

      // Decision based on InsightFace result
      if (comparisonResult.matchLevel === 'HIGH' || comparisonResult.matchLevel === 'MEDIUM') {
        // Direct match
        result.success = true;
        result.matchedUser = bestMatch ? { id: bestMatch.id, name: bestMatch.name } : null;
        result.finalDecision = 'MATCH';
        result.normalizedConfidence = comparisonResult.confidence;
        result.reason = `Match confirmed by InsightFace (${comparisonResult.matchLevel})`;
        
      } else if (comparisonResult.matchLevel === 'LOW') {
        // Borderline - use AWS backup
        this.logger.debug('Step 4: AWS Rekognition backup...');
        
        if (bestMatch && bestMatch.faceImage && this.rekognitionClient) {
          const awsResult = await this.verifyWithAws(input.imageBase64, bestMatch.faceImage);
          result.awsSimilarity = awsResult.similarity;
          result.providerBreakdown.awsRekognition = {
            used: true,
            passed: awsResult.matched,
            score: awsResult.similarity,
          };

          if (awsResult.matched) {
            result.success = true;
            result.matchedUser = { id: bestMatch.id, name: bestMatch.name };
            result.finalDecision = 'MATCH';
            result.normalizedConfidence = (comparisonResult.confidence + awsResult.similarity) / 2;
            result.reason = 'Match confirmed by AWS Rekognition backup';
          } else {
            result.finalDecision = 'NO_MATCH';
            result.reason = 'Borderline match rejected by AWS Rekognition';
          }
        } else {
          // No AWS backup available
          result.finalDecision = 'NO_MATCH';
          result.reason = 'Borderline match, AWS backup not available';
        }
        
      } else {
        // No match
        result.finalDecision = 'NO_MATCH';
        result.reason = 'No matching face found';
      }

      // Calculate final normalized confidence
      if (result.success) {
        result.normalizedConfidence = this.calculateNormalizedConfidence(
          result.livenessScore,
          100 - result.spoofScore,
          result.arcfaceScore,
          result.awsSimilarity
        );
      }

    } catch (error: any) {
      this.logger.error(`Cascade verification error: ${error.message}`);
      result.finalDecision = 'ERROR';
      result.reason = error.message;
    }

    result.verificationTimeMs = Date.now() - startTime;
    
    this.logger.log(
      `Cascade verification completed in ${result.verificationTimeMs}ms: ` +
      `${result.finalDecision} (confidence: ${result.normalizedConfidence.toFixed(1)}%)`
    );

    return result;
  }

  /**
   * Verify with AWS Rekognition (backup)
   */
  private async verifyWithAws(
    sourceImage: string,
    targetImage: string
  ): Promise<{ matched: boolean; similarity: number }> {
    if (!this.rekognitionClient) {
      return { matched: false, similarity: 0 };
    }

    try {
      // Clean base64 strings
      const cleanSource = sourceImage.replace(/^data:image\/\w+;base64,/, '');
      const cleanTarget = targetImage.replace(/^data:image\/\w+;base64,/, '');

      const command = new CompareFacesCommand({
        SourceImage: { Bytes: Buffer.from(cleanSource, 'base64') },
        TargetImage: { Bytes: Buffer.from(cleanTarget, 'base64') },
        SimilarityThreshold: 70,
      });

      const response = await this.rekognitionClient.send(command);

      if (response.FaceMatches && response.FaceMatches.length > 0) {
        const similarity = response.FaceMatches[0].Similarity || 0;
        return {
          matched: similarity >= 90,
          similarity,
        };
      }

      return { matched: false, similarity: 0 };

    } catch (error: any) {
      this.logger.error(`AWS Rekognition error: ${error.message}`);
      return { matched: false, similarity: 0 };
    }
  }

  /**
   * Calculate normalized confidence score
   */
  private calculateNormalizedConfidence(
    livenessScore: number,
    antiSpoofScore: number,
    arcfaceScore: number,
    awsSimilarity: number | null
  ): number {
    const weights = {
      liveness: 0.15,
      antiSpoof: 0.15,
      arcface: 0.50,
      aws: 0.20,
    };

    let totalScore = 
      livenessScore * weights.liveness +
      antiSpoofScore * weights.antiSpoof +
      arcfaceScore * weights.arcface;

    if (awsSimilarity !== null) {
      totalScore += awsSimilarity * weights.aws;
    } else {
      // Redistribute AWS weight to arcface
      totalScore += arcfaceScore * weights.aws;
    }

    return Math.min(100, Math.max(0, totalScore));
  }

  /**
   * Quick verification (simplified for fast login)
   */
  async quickVerify(
    embedding512: number[],
    livenessScore: number,
    spoofScore: number,
    registeredUsers: Array<{ id: string; name: string; embedding512: string }>
  ): Promise<{ success: boolean; user: { id: string; name: string } | null; confidence: number }> {
    // Quick checks
    if (livenessScore < 60) {
      return { success: false, user: null, confidence: 0 };
    }

    if (spoofScore > 40) {
      return { success: false, user: null, confidence: 0 };
    }

    // Find best match
    const { user, result } = this.insightFaceService.findBestMatch(embedding512, registeredUsers);

    if (result.isMatch && user) {
      return {
        success: true,
        user: { id: user.id, name: user.name },
        confidence: result.confidence,
      };
    }

    return { success: false, user: null, confidence: result.confidence };
  }
}
