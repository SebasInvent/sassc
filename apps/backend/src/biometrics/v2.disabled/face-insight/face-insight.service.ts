import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

// Umbrales de verificación InsightFace 512D
const THRESHOLDS = {
  PERFECT_MATCH: 0.35,      // Distancia coseno muy baja = match perfecto
  GOOD_MATCH: 0.45,         // Match bueno
  ACCEPTABLE_MATCH: 0.55,   // Match aceptable
  CEDULA_MATCH: 0.40,       // Umbral para comparar con foto de cédula
  LIVENESS_MIN: 0.35,       // Mínimo score de liveness
};

export interface EmbeddingResult {
  embedding: number[];
  quality: number;
  livenessScore?: number;
  faceBox?: { x: number; y: number; width: number; height: number };
}

export interface MatchResult {
  isMatch: boolean;
  distance: number;
  confidence: number;
  matchLevel: 'PERFECT' | 'GOOD' | 'ACCEPTABLE' | 'NO_MATCH';
  matchedPatientId?: string;
}

@Injectable()
export class FaceInsightService {
  private readonly logger = new Logger(FaceInsightService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Extrae embedding 512D de una imagen (simulado - en producción usar InsightFace real)
   * En producción, esto llamaría a un servicio Python con ONNX
   */
  async extractEmbedding(
    imageBase64: string,
    sessionId: string,
  ): Promise<EmbeddingResult | null> {
    this.logger.log(`Extracting 512D embedding for session ${sessionId}`);

    try {
      // TODO: Integrar con servicio InsightFace real (Python + ONNX)
      // Por ahora, simular respuesta para estructura
      
      // En producción:
      // const response = await this.httpService.post('http://insightface-worker:5000/extract', { image: imageBase64 });
      // return response.data;

      await this.auditService.log({
        sessionId,
        action: 'EXTRACT_EMBEDDING_512D',
        resource: 'face-insight',
        outcome: 'SUCCESS',
        details: { note: 'Placeholder - integrate InsightFace worker' },
      });

      // Placeholder - retornar null hasta integrar servicio real
      return null;
    } catch (error) {
      this.logger.error(`Error extracting embedding: ${error.message}`);
      
      await this.auditService.log({
        sessionId,
        action: 'EXTRACT_EMBEDDING_512D',
        resource: 'face-insight',
        outcome: 'ERROR',
        details: { error: error.message },
      });

      return null;
    }
  }

  /**
   * Verifica liveness (anti-spoofing)
   */
  async checkLiveness(
    imageBase64: string,
    sessionId: string,
  ): Promise<{ isReal: boolean; score: number; checks: string[] }> {
    this.logger.log(`Checking liveness for session ${sessionId}`);

    try {
      // TODO: Integrar con servicio de liveness real
      // Checks típicos: parpadeo, microgestos, textura de piel, profundidad

      await this.auditService.log({
        sessionId,
        action: 'LIVENESS_CHECK',
        resource: 'face-insight',
        outcome: 'SUCCESS',
        details: { note: 'Placeholder - integrate liveness detection' },
      });

      // Placeholder
      return {
        isReal: true,
        score: 0.95,
        checks: ['texture_analysis', 'depth_estimation'],
      };
    } catch (error) {
      this.logger.error(`Error checking liveness: ${error.message}`);
      return { isReal: false, score: 0, checks: [] };
    }
  }

  /**
   * Compara embedding con foto de cédula
   */
  async matchWithCedulaPhoto(
    faceEmbedding: number[],
    cedulaPhotoBase64: string,
    sessionId: string,
  ): Promise<MatchResult> {
    this.logger.log(`Matching face with cedula photo for session ${sessionId}`);

    try {
      // Extraer embedding de la foto de la cédula
      const cedulaResult = await this.extractEmbedding(cedulaPhotoBase64, sessionId);
      
      if (!cedulaResult) {
        return { 
          isMatch: false, 
          distance: 1, 
          confidence: 0, 
          matchLevel: 'NO_MATCH' 
        };
      }

      // Calcular distancia coseno
      const distance = this.cosineDistance(faceEmbedding, cedulaResult.embedding);
      const matchLevel = this.getMatchLevel(distance);
      const isMatch = distance < THRESHOLDS.CEDULA_MATCH;
      const confidence = Math.max(0, (1 - distance) * 100);

      await this.auditService.log({
        sessionId,
        action: 'MATCH_FACE_CEDULA',
        resource: 'face-insight',
        outcome: isMatch ? 'SUCCESS' : 'FAILURE',
        details: { distance, confidence, threshold: THRESHOLDS.CEDULA_MATCH, matchLevel },
      });

      return { isMatch, distance, confidence, matchLevel };
    } catch (error) {
      this.logger.error(`Error matching with cedula: ${error.message}`);
      return { isMatch: false, distance: 1, confidence: 0, matchLevel: 'NO_MATCH' };
    }
  }

  /**
   * Busca coincidencia en la base de datos
   */
  async findMatchInDatabase(
    embedding: number[],
    sessionId: string,
  ): Promise<MatchResult & { allMatches: Array<{ patientId: string; distance: number }> }> {
    this.logger.log(`Searching database for face match, session ${sessionId}`);

    try {
      // Obtener todos los embeddings activos
      const storedEmbeddings = await this.prisma.insightFaceEmbedding.findMany({
        where: { isActive: true },
        select: {
          id: true,
          patientId: true,
          embedding: true,
        },
      });

      // Calcular distancias
      const matches = storedEmbeddings.map((stored) => {
        const storedEmb = JSON.parse(stored.embedding) as number[];
        const distance = this.cosineDistance(embedding, storedEmb);
        return {
          patientId: stored.patientId,
          distance,
        };
      });

      // Ordenar por distancia
      matches.sort((a, b) => a.distance - b.distance);

      const best = matches[0];
      const matchLevel = best ? this.getMatchLevel(best.distance) : 'NO_MATCH';
      const isMatch = best && best.distance < THRESHOLDS.ACCEPTABLE_MATCH;

      await this.auditService.log({
        sessionId,
        action: 'SEARCH_DATABASE_512D',
        resource: 'face-insight',
        outcome: isMatch ? 'SUCCESS' : 'FAILURE',
        details: {
          totalCompared: matches.length,
          bestDistance: best?.distance,
          matchLevel,
          matchedPatientId: isMatch ? best.patientId : null,
        },
      });

      return {
        isMatch,
        distance: best?.distance || 1,
        confidence: best ? Math.max(0, (1 - best.distance) * 100) : 0,
        matchLevel,
        matchedPatientId: isMatch ? best.patientId : undefined,
        allMatches: matches.slice(0, 5),
      };
    } catch (error) {
      this.logger.error(`Error searching database: ${error.message}`);
      return {
        isMatch: false,
        distance: 1,
        confidence: 0,
        matchLevel: 'NO_MATCH',
        allMatches: [],
      };
    }
  }

  /**
   * Guarda embedding para un paciente
   */
  async saveEmbedding(
    patientId: string,
    embedding: number[],
    metadata: {
      quality: number;
      livenessScore?: number;
      captureAngle?: string;
      imageHash?: string;
    },
    sessionId: string,
  ): Promise<void> {
    const embeddingHash = this.hashEmbedding(embedding);

    // Desactivar embeddings anteriores
    await this.prisma.insightFaceEmbedding.updateMany({
      where: { patientId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Crear nuevo embedding
    await this.prisma.insightFaceEmbedding.create({
      data: {
        patientId,
        embedding: JSON.stringify(embedding),
        embeddingHash,
        quality: metadata.quality,
        livenessScore: metadata.livenessScore,
        captureAngle: metadata.captureAngle,
        imageHash: metadata.imageHash,
        isPrimary: true,
        isActive: true,
      },
    });

    await this.auditService.log({
      sessionId,
      action: 'SAVE_EMBEDDING_512D',
      resource: 'face-insight',
      outcome: 'SUCCESS',
      details: { patientId, quality: metadata.quality },
    });
  }

  // --- Utilidades ---

  private cosineDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return 1 - similarity; // Convertir a distancia
  }

  private getMatchLevel(distance: number): 'PERFECT' | 'GOOD' | 'ACCEPTABLE' | 'NO_MATCH' {
    if (distance < THRESHOLDS.PERFECT_MATCH) return 'PERFECT';
    if (distance < THRESHOLDS.GOOD_MATCH) return 'GOOD';
    if (distance < THRESHOLDS.ACCEPTABLE_MATCH) return 'ACCEPTABLE';
    return 'NO_MATCH';
  }

  private hashEmbedding(embedding: number[]): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(embedding))
      .digest('hex');
  }
}
