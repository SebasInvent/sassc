import { Injectable, Logger } from '@nestjs/common';

/**
 * Liveness Service - Mediapipe FaceMesh Validation
 * 
 * Validates that the face is from a live person, not a photo/video.
 * Uses facial landmarks analysis for liveness detection.
 */

export interface LivenessData {
  // Blink detection
  blinkDetected: boolean;
  blinkCount: number;
  eyeAspectRatio: number;
  
  // Head pose
  headPose: {
    yaw: number;    // Left/right rotation (-90 to 90)
    pitch: number;  // Up/down rotation (-90 to 90)
    roll: number;   // Tilt (-90 to 90)
  };
  
  // Movement detection
  movementDetected: boolean;
  movementScore: number;
  
  // Face mesh quality
  landmarksDetected: number;
  meshQuality: number;
  
  // Depth cues (simulated from landmarks)
  depthScore: number;
  
  // Texture analysis
  textureScore: number;
}

export interface LivenessResult {
  isLive: boolean;
  livenessScore: number;  // 0-100
  confidence: number;
  checks: {
    blink: { passed: boolean; score: number };
    headPose: { passed: boolean; score: number };
    movement: { passed: boolean; score: number };
    depth: { passed: boolean; score: number };
    texture: { passed: boolean; score: number };
  };
  reason?: string;
}

@Injectable()
export class LivenessService {
  private readonly logger = new Logger(LivenessService.name);

  // Thresholds
  private readonly THRESHOLDS = {
    MIN_LIVENESS_SCORE: 60,
    MIN_BLINK_EAR: 0.2,      // Eye Aspect Ratio threshold for blink
    MIN_HEAD_MOVEMENT: 5,    // Minimum degrees of head movement
    MIN_LANDMARKS: 400,      // Minimum landmarks detected (out of 468)
    MIN_DEPTH_SCORE: 50,
    MIN_TEXTURE_SCORE: 50,
  };

  /**
   * Validate liveness from frontend data
   */
  validateLiveness(data: LivenessData): LivenessResult {
    const checks = {
      blink: this.checkBlink(data),
      headPose: this.checkHeadPose(data),
      movement: this.checkMovement(data),
      depth: this.checkDepth(data),
      texture: this.checkTexture(data),
    };

    // Calculate weighted score
    const weights = {
      blink: 0.25,
      headPose: 0.20,
      movement: 0.15,
      depth: 0.20,
      texture: 0.20,
    };

    let totalScore = 0;
    let totalWeight = 0;
    let failedChecks: string[] = [];

    for (const [key, check] of Object.entries(checks)) {
      const weight = weights[key as keyof typeof weights];
      totalScore += check.score * weight;
      totalWeight += weight;
      
      if (!check.passed) {
        failedChecks.push(key);
      }
    }

    const livenessScore = (totalScore / totalWeight);
    const isLive = livenessScore >= this.THRESHOLDS.MIN_LIVENESS_SCORE;

    // Calculate confidence based on how many checks passed
    const passedCount = Object.values(checks).filter(c => c.passed).length;
    const confidence = (passedCount / 5) * 100;

    let reason: string | undefined;
    if (!isLive) {
      if (failedChecks.length > 0) {
        reason = `Failed checks: ${failedChecks.join(', ')}`;
      } else {
        reason = 'Liveness score too low';
      }
    }

    this.logger.debug(
      `Liveness validation: score=${livenessScore.toFixed(1)}, ` +
      `isLive=${isLive}, passed=${passedCount}/5`
    );

    return {
      isLive,
      livenessScore,
      confidence,
      checks,
      reason,
    };
  }

  /**
   * Check blink detection
   */
  private checkBlink(data: LivenessData): { passed: boolean; score: number } {
    // Blink detected is a strong indicator of liveness
    if (data.blinkDetected && data.blinkCount >= 1) {
      return { passed: true, score: 100 };
    }

    // Check Eye Aspect Ratio variation
    if (data.eyeAspectRatio < this.THRESHOLDS.MIN_BLINK_EAR) {
      return { passed: true, score: 80 };
    }

    // No blink detected, but might still be live
    return { passed: false, score: 30 };
  }

  /**
   * Check head pose variation
   */
  private checkHeadPose(data: LivenessData): { passed: boolean; score: number } {
    const { yaw, pitch, roll } = data.headPose;

    // Check if there's natural head movement
    const hasYawMovement = Math.abs(yaw) > this.THRESHOLDS.MIN_HEAD_MOVEMENT;
    const hasPitchMovement = Math.abs(pitch) > this.THRESHOLDS.MIN_HEAD_MOVEMENT;

    if (hasYawMovement && hasPitchMovement) {
      return { passed: true, score: 100 };
    }

    if (hasYawMovement || hasPitchMovement) {
      return { passed: true, score: 75 };
    }

    // Static head pose - suspicious but not definitive
    return { passed: false, score: 40 };
  }

  /**
   * Check movement detection
   */
  private checkMovement(data: LivenessData): { passed: boolean; score: number } {
    if (data.movementDetected && data.movementScore > 50) {
      return { passed: true, score: data.movementScore };
    }

    if (data.movementScore > 30) {
      return { passed: true, score: data.movementScore + 20 };
    }

    return { passed: false, score: data.movementScore };
  }

  /**
   * Check depth cues
   */
  private checkDepth(data: LivenessData): { passed: boolean; score: number } {
    if (data.depthScore >= this.THRESHOLDS.MIN_DEPTH_SCORE) {
      return { passed: true, score: data.depthScore };
    }

    return { passed: false, score: data.depthScore };
  }

  /**
   * Check texture analysis
   */
  private checkTexture(data: LivenessData): { passed: boolean; score: number } {
    if (data.textureScore >= this.THRESHOLDS.MIN_TEXTURE_SCORE) {
      return { passed: true, score: data.textureScore };
    }

    return { passed: false, score: data.textureScore };
  }

  /**
   * Validate mesh quality
   */
  validateMeshQuality(landmarksCount: number): { valid: boolean; quality: number } {
    const quality = (landmarksCount / 468) * 100;
    const valid = landmarksCount >= this.THRESHOLDS.MIN_LANDMARKS;

    return { valid, quality };
  }

  /**
   * Quick liveness check (simplified for login)
   */
  quickLivenessCheck(data: Partial<LivenessData>): { passed: boolean; score: number } {
    let score = 50; // Base score

    // Blink is the strongest indicator
    if (data.blinkDetected) {
      score += 30;
    }

    // Head movement
    if (data.headPose) {
      const hasMovement = 
        Math.abs(data.headPose.yaw) > 3 || 
        Math.abs(data.headPose.pitch) > 3;
      if (hasMovement) {
        score += 15;
      }
    }

    // Mesh quality
    if (data.landmarksDetected && data.landmarksDetected >= 400) {
      score += 10;
    }

    // Depth
    if (data.depthScore && data.depthScore > 40) {
      score += 10;
    }

    const passed = score >= this.THRESHOLDS.MIN_LIVENESS_SCORE;
    return { passed, score: Math.min(100, score) };
  }

  /**
   * Get thresholds for external use
   */
  getThresholds() {
    return { ...this.THRESHOLDS };
  }
}
