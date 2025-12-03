import { Injectable, Logger } from '@nestjs/common';

/**
 * Anti-Spoof Service
 * 
 * Detects presentation attacks (photos, videos, masks, etc.)
 * Uses texture analysis, frequency analysis, and CNN-based detection.
 */

export interface AntiSpoofData {
  // CNN model output
  spoofProbability: number;  // 0-1 probability of being a spoof
  
  // Texture analysis
  textureVariance: number;
  laplacianVariance: number;
  
  // Frequency analysis
  highFrequencyRatio: number;
  
  // Reflection detection
  reflectionScore: number;
  
  // Moire pattern detection
  moireScore: number;
  
  // Color analysis
  colorDistribution: {
    naturalness: number;
    saturation: number;
  };
}

export interface AntiSpoofResult {
  isReal: boolean;
  spoofScore: number;  // 0-100 (higher = more likely spoof)
  confidence: number;
  checks: {
    cnn: { passed: boolean; score: number };
    texture: { passed: boolean; score: number };
    frequency: { passed: boolean; score: number };
    reflection: { passed: boolean; score: number };
    color: { passed: boolean; score: number };
  };
  attackType?: 'PHOTO' | 'VIDEO' | 'MASK' | 'DEEPFAKE' | 'UNKNOWN';
  reason?: string;
}

@Injectable()
export class AntiSpoofService {
  private readonly logger = new Logger(AntiSpoofService.name);

  // Thresholds
  private readonly THRESHOLDS = {
    MAX_SPOOF_SCORE: 40,           // Above this = reject
    CNN_SPOOF_THRESHOLD: 0.5,      // CNN probability threshold
    MIN_TEXTURE_VARIANCE: 100,     // Minimum texture variance
    MIN_LAPLACIAN_VARIANCE: 50,    // Minimum laplacian variance (blur detection)
    MAX_REFLECTION_SCORE: 60,      // Maximum reflection score
    MIN_COLOR_NATURALNESS: 40,     // Minimum color naturalness
  };

  /**
   * Validate anti-spoofing from frontend data
   */
  validateAntiSpoof(data: AntiSpoofData): AntiSpoofResult {
    const checks = {
      cnn: this.checkCNN(data),
      texture: this.checkTexture(data),
      frequency: this.checkFrequency(data),
      reflection: this.checkReflection(data),
      color: this.checkColor(data),
    };

    // Calculate weighted spoof score
    const weights = {
      cnn: 0.40,        // CNN is most important
      texture: 0.20,
      frequency: 0.15,
      reflection: 0.15,
      color: 0.10,
    };

    let totalSpoofScore = 0;
    let failedChecks: string[] = [];

    for (const [key, check] of Object.entries(checks)) {
      const weight = weights[key as keyof typeof weights];
      // Invert score for spoof calculation (high score = likely spoof)
      totalSpoofScore += (100 - check.score) * weight;
      
      if (!check.passed) {
        failedChecks.push(key);
      }
    }

    const spoofScore = totalSpoofScore;
    const isReal = spoofScore <= this.THRESHOLDS.MAX_SPOOF_SCORE;

    // Calculate confidence
    const passedCount = Object.values(checks).filter(c => c.passed).length;
    const confidence = (passedCount / 5) * 100;

    // Determine attack type if detected
    let attackType: AntiSpoofResult['attackType'];
    let reason: string | undefined;

    if (!isReal) {
      attackType = this.detectAttackType(data, checks);
      reason = `Possible ${attackType?.toLowerCase() || 'spoof'} attack detected. Failed: ${failedChecks.join(', ')}`;
    }

    this.logger.debug(
      `Anti-spoof validation: spoofScore=${spoofScore.toFixed(1)}, ` +
      `isReal=${isReal}, attackType=${attackType || 'none'}`
    );

    return {
      isReal,
      spoofScore,
      confidence,
      checks,
      attackType,
      reason,
    };
  }

  /**
   * Check CNN model output
   */
  private checkCNN(data: AntiSpoofData): { passed: boolean; score: number } {
    const isReal = data.spoofProbability < this.THRESHOLDS.CNN_SPOOF_THRESHOLD;
    const score = (1 - data.spoofProbability) * 100;

    return { passed: isReal, score };
  }

  /**
   * Check texture analysis
   */
  private checkTexture(data: AntiSpoofData): { passed: boolean; score: number } {
    // Real faces have natural texture variance
    // Photos/screens tend to have lower variance or unnatural patterns
    
    const hasGoodTexture = data.textureVariance >= this.THRESHOLDS.MIN_TEXTURE_VARIANCE;
    const hasGoodLaplacian = data.laplacianVariance >= this.THRESHOLDS.MIN_LAPLACIAN_VARIANCE;

    if (hasGoodTexture && hasGoodLaplacian) {
      return { passed: true, score: 90 };
    }

    if (hasGoodTexture || hasGoodLaplacian) {
      return { passed: true, score: 70 };
    }

    // Low texture variance suggests printed photo or screen
    const score = Math.min(
      (data.textureVariance / this.THRESHOLDS.MIN_TEXTURE_VARIANCE) * 50,
      (data.laplacianVariance / this.THRESHOLDS.MIN_LAPLACIAN_VARIANCE) * 50
    );

    return { passed: false, score };
  }

  /**
   * Check frequency analysis
   */
  private checkFrequency(data: AntiSpoofData): { passed: boolean; score: number } {
    // Real faces have natural high-frequency content
    // Screens/prints may have different frequency patterns
    
    if (data.highFrequencyRatio > 0.3) {
      return { passed: true, score: 85 };
    }

    if (data.highFrequencyRatio > 0.15) {
      return { passed: true, score: 65 };
    }

    return { passed: false, score: data.highFrequencyRatio * 200 };
  }

  /**
   * Check reflection patterns
   */
  private checkReflection(data: AntiSpoofData): { passed: boolean; score: number } {
    // Screens often have specular reflections
    // Photos may have glossy reflections
    
    if (data.reflectionScore <= this.THRESHOLDS.MAX_REFLECTION_SCORE) {
      return { passed: true, score: 100 - data.reflectionScore };
    }

    return { passed: false, score: Math.max(0, 100 - data.reflectionScore) };
  }

  /**
   * Check color distribution
   */
  private checkColor(data: AntiSpoofData): { passed: boolean; score: number } {
    // Real skin has natural color distribution
    // Screens/prints may have unnatural colors
    
    const { naturalness, saturation } = data.colorDistribution;

    if (naturalness >= this.THRESHOLDS.MIN_COLOR_NATURALNESS) {
      return { passed: true, score: naturalness };
    }

    return { passed: false, score: naturalness };
  }

  /**
   * Detect type of attack
   */
  private detectAttackType(
    data: AntiSpoofData,
    checks: AntiSpoofResult['checks']
  ): AntiSpoofResult['attackType'] {
    // High reflection + low texture = screen/phone
    if (data.reflectionScore > 70 && data.textureVariance < 50) {
      return 'VIDEO';
    }

    // Low laplacian (blur) + low texture = printed photo
    if (data.laplacianVariance < 30 && data.textureVariance < 80) {
      return 'PHOTO';
    }

    // Moire patterns = screen
    if (data.moireScore > 50) {
      return 'VIDEO';
    }

    // Unnatural color distribution might indicate deepfake
    if (data.colorDistribution.naturalness < 30) {
      return 'DEEPFAKE';
    }

    return 'UNKNOWN';
  }

  /**
   * Quick anti-spoof check (simplified)
   */
  quickAntiSpoofCheck(spoofProbability: number, textureScore: number): { passed: boolean; score: number } {
    const spoofScore = spoofProbability * 60 + (100 - textureScore) * 0.4;
    const passed = spoofScore <= this.THRESHOLDS.MAX_SPOOF_SCORE;

    return { passed, score: spoofScore };
  }

  /**
   * Get thresholds for external use
   */
  getThresholds() {
    return { ...this.THRESHOLDS };
  }
}
