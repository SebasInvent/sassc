import { Controller, Post, Body, Get, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InsightFaceService } from './insightface.service';
import { LivenessService, LivenessData } from './liveness.service';
import { AntiSpoofService, AntiSpoofData } from './antispoof.service';
import { CascadeService, CascadeVerificationInput, RegisteredUser } from './cascade.service';

/**
 * Biometric V2 Controller
 * 
 * Endpoints for InsightFace + Mediapipe biometric verification
 */

// DTOs
interface EnrollDto {
  firstName: string;
  lastName: string;
  specialty: string;
  role: string;
  embedding512: string;  // JSON array of 512 floats
  embeddingQuality: number;
  livenessScore: number;
  spoofScore: number;
  faceImage: string;     // Base64 for AWS backup
}

interface VerifyDto {
  embedding512: string;  // JSON array of 512 floats
  imageBase64: string;
  livenessData: LivenessData;
  antiSpoofData: AntiSpoofData;
}

interface QuickVerifyDto {
  embedding512: string;
  livenessScore: number;
  spoofScore: number;
}

interface EmbeddingCompareDto {
  sourceEmbedding: string;
  targetEmbedding: string;
}

interface AwsBackupDto {
  sourceImage: string;
  targetImage: string;
}

@Controller('biometrics')
export class BiometricV2Controller {
  private readonly logger = new Logger(BiometricV2Controller.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insightFaceService: InsightFaceService,
    private readonly livenessService: LivenessService,
    private readonly antiSpoofService: AntiSpoofService,
    private readonly cascadeService: CascadeService,
  ) {}

  /**
   * POST /biometrics/enroll
   * Register a new user with biometric data
   */
  @Post('enroll')
  async enroll(@Body() body: EnrollDto) {
    this.logger.log(`Enrolling new user: ${body.firstName} ${body.lastName}`);

    try {
      // Parse and validate embedding
      const embedding = JSON.parse(body.embedding512);
      const validation = this.insightFaceService.validateEmbedding(embedding);
      
      if (!validation.valid) {
        throw new HttpException(
          `Invalid embedding: ${validation.error}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Validate liveness and spoof scores
      if (body.livenessScore < 60) {
        throw new HttpException(
          'Liveness score too low. Please try again with better lighting.',
          HttpStatus.BAD_REQUEST
        );
      }

      if (body.spoofScore > 40) {
        throw new HttpException(
          'Anti-spoof check failed. Please use a real face.',
          HttpStatus.BAD_REQUEST
        );
      }

      // Generate license
      const licensePrefix = this.getLicensePrefix(body.role);
      const licenseNumber = Math.floor(100000000 + Math.random() * 900000000);
      const license = `${licensePrefix}-${licenseNumber}`;

      // Create practitioner
      const practitioner = await this.prisma.practitioner.create({
        data: {
          license,
          firstName: body.firstName,
          lastName: body.lastName,
          specialty: body.specialty || body.role,
          embedding512: body.embedding512,
          embeddingQuality: body.embeddingQuality,
          embeddingVersion: 'v2',
          faceImage: body.faceImage,
          faceRegisteredAt: new Date(),
          livenessScore: body.livenessScore,
          spoofScore: body.spoofScore,
        },
      });

      // Create user with role
      const user = await this.prisma.user.create({
        data: {
          role: body.role as any,
          practitionerId: practitioner.id,
        },
      });

      this.logger.log(`User enrolled successfully: ${license}`);

      return {
        success: true,
        user: {
          id: practitioner.id,
          license: practitioner.license,
          name: `${practitioner.firstName} ${practitioner.lastName}`,
          role: body.role,
        },
      };

    } catch (error: any) {
      this.logger.error(`Enrollment failed: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'Enrollment failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /biometrics/verify
   * Full cascade verification
   */
  @Post('verify')
  async verify(@Body() body: VerifyDto) {
    this.logger.log('Starting biometric verification...');

    try {
      // Parse embedding
      const embedding = JSON.parse(body.embedding512);
      const validation = this.insightFaceService.validateEmbedding(embedding);
      
      if (!validation.valid) {
        throw new HttpException(
          `Invalid embedding: ${validation.error}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Get registered users with V2 embeddings
      const practitioners = await this.prisma.practitioner.findMany({
        where: {
          embedding512: { not: null },
          embeddingVersion: 'v2',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          embedding512: true,
          faceImage: true,
        },
      });

      const registeredUsers: RegisteredUser[] = practitioners.map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        embedding512: p.embedding512!,
        faceImage: p.faceImage || undefined,
      }));

      if (registeredUsers.length === 0) {
        return {
          success: false,
          message: 'No registered users found',
          result: null,
        };
      }

      // Run cascade verification
      const input: CascadeVerificationInput = {
        embedding512: embedding,
        imageBase64: body.imageBase64,
        livenessData: body.livenessData,
        antiSpoofData: body.antiSpoofData,
        registeredUsers,
      };

      const result = await this.cascadeService.verify(input);

      // Update verification metadata if successful
      if (result.success && result.matchedUser) {
        await this.prisma.practitioner.update({
          where: { id: result.matchedUser.id },
          data: {
            lastVerificationAt: new Date(),
            verificationCount: { increment: 1 },
            livenessScore: result.livenessScore,
            spoofScore: result.spoofScore,
          },
        });
      }

      return {
        success: result.success,
        user: result.matchedUser,
        confidence: result.normalizedConfidence,
        decision: result.finalDecision,
        reason: result.reason,
        details: {
          arcfaceScore: result.arcfaceScore,
          livenessScore: result.livenessScore,
          spoofScore: result.spoofScore,
          awsSimilarity: result.awsSimilarity,
          verificationTimeMs: result.verificationTimeMs,
        },
        providerBreakdown: result.providerBreakdown,
      };

    } catch (error: any) {
      this.logger.error(`Verification failed: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'Verification failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /biometrics/quick-verify
   * Simplified verification for fast login
   */
  @Post('quick-verify')
  async quickVerify(@Body() body: QuickVerifyDto) {
    this.logger.log('Starting quick verification...');

    try {
      const embedding = JSON.parse(body.embedding512);

      // Get registered users
      const practitioners = await this.prisma.practitioner.findMany({
        where: {
          embedding512: { not: null },
          embeddingVersion: 'v2',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          embedding512: true,
        },
      });

      const registeredUsers = practitioners.map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        embedding512: p.embedding512!,
      }));

      const result = await this.cascadeService.quickVerify(
        embedding,
        body.livenessScore,
        body.spoofScore,
        registeredUsers
      );

      return result;

    } catch (error: any) {
      this.logger.error(`Quick verification failed: ${error.message}`);
      throw new HttpException(
        error.message || 'Verification failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /biometrics/liveness
   * Validate liveness data
   */
  @Post('liveness')
  async validateLiveness(@Body() body: { livenessData: LivenessData }) {
    const result = this.livenessService.validateLiveness(body.livenessData);
    return result;
  }

  /**
   * POST /biometrics/embedding
   * Compare two embeddings
   */
  @Post('embedding')
  async compareEmbeddings(@Body() body: EmbeddingCompareDto) {
    try {
      const source = JSON.parse(body.sourceEmbedding);
      const target = JSON.parse(body.targetEmbedding);

      const result = this.insightFaceService.compareEmbeddings(source, target);
      return result;

    } catch (error: any) {
      throw new HttpException(
        `Invalid embedding format: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * POST /biometrics/aws-backup
   * Direct AWS Rekognition comparison
   */
  @Post('aws-backup')
  async awsBackup(@Body() body: AwsBackupDto) {
    this.logger.log('Running AWS Rekognition backup verification...');

    // This is handled internally by cascade service
    // Exposed for testing purposes
    return {
      message: 'Use /biometrics/verify for full verification with AWS backup',
    };
  }

  /**
   * GET /biometrics/registered
   * Get all registered users with V2 embeddings
   */
  @Get('registered')
  async getRegisteredUsers() {
    const practitioners = await this.prisma.practitioner.findMany({
      where: {
        embedding512: { not: null },
        embeddingVersion: 'v2',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        license: true,
        specialty: true,
        embeddingQuality: true,
        faceRegisteredAt: true,
        lastVerificationAt: true,
        verificationCount: true,
      },
    });

    return {
      count: practitioners.length,
      users: practitioners.map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        license: p.license,
        specialty: p.specialty,
        quality: p.embeddingQuality,
        registeredAt: p.faceRegisteredAt,
        lastVerification: p.lastVerificationAt,
        verificationCount: p.verificationCount,
      })),
    };
  }

  /**
   * GET /biometrics/thresholds
   * Get current verification thresholds
   */
  @Get('thresholds')
  async getThresholds() {
    return {
      insightFace: this.insightFaceService.getThresholds(),
      liveness: this.livenessService.getThresholds(),
      antiSpoof: this.antiSpoofService.getThresholds(),
    };
  }

  /**
   * Helper: Get license prefix by role
   */
  private getLicensePrefix(role: string): string {
    const prefixes: Record<string, string> = {
      SUPER_ADMIN: 'SUA',
      ADMIN: 'ADM',
      DOCTOR: 'DOC',
      NURSE: 'NUR',
      PHARMACIST: 'PHA',
      RECEPTIONIST: 'REC',
    };
    return prefixes[role] || 'USR';
  }
}
