/**
 * AWS Rekognition API - Cliente Lite (REST directo)
 * 
 * Compara rostros sin SDK pesado usando AWS Signature V4
 * Para verificación facial de alta precisión
 */

import { createHmac, createHash } from 'crypto';

const AWS_SERVICE = 'rekognition';
const AWS_ALGORITHM = 'AWS4-HMAC-SHA256';

export interface RekognitionCompareResult {
  success: boolean;
  matched: boolean;
  confidence: number;
  matchedUserId: string | null;
  similarity: number;
  error?: string;
  timeMs: number;
}

export interface UserToCompare {
  id: string;
  name: string;
  faceImage?: string; // Base64 de la imagen registrada
}

/**
 * Compara un rostro capturado contra usuarios registrados
 */
export async function compareFacesWithRekognition(
  sourceImageBase64: string,
  targetUsers: UserToCompare[],
  timeoutMs: number = 700
): Promise<RekognitionCompareResult> {
  const startTime = Date.now();
  
  const accessKey = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
  
  if (!accessKey || !secretKey) {
    return {
      success: false,
      matched: false,
      confidence: 0,
      matchedUserId: null,
      similarity: 0,
      error: 'AWS credentials not configured',
      timeMs: Date.now() - startTime,
    };
  }
  
  // Filtrar usuarios que tienen imagen facial
  const usersWithImages = targetUsers.filter(u => u.faceImage);
  
  if (usersWithImages.length === 0) {
    return {
      success: false,
      matched: false,
      confidence: 0,
      matchedUserId: null,
      similarity: 0,
      error: 'No users with face images to compare',
      timeMs: Date.now() - startTime,
    };
  }
  
  try {
    const cleanSourceImage = sourceImageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    let bestMatch: { userId: string; similarity: number } | null = null;
    
    // Comparar con cada usuario (en paralelo, máximo 3 a la vez)
    const batchSize = 3;
    for (let i = 0; i < usersWithImages.length; i += batchSize) {
      const batch = usersWithImages.slice(i, i + batchSize);
      
      const results = await Promise.all(
        batch.map(user => compareSingleFace(
          cleanSourceImage,
          user,
          accessKey,
          secretKey,
          region,
          timeoutMs
        ))
      );
      
      for (const result of results) {
        if (result.matched && result.similarity > (bestMatch?.similarity || 0)) {
          bestMatch = { userId: result.userId!, similarity: result.similarity };
        }
      }
      
      // Si encontramos match con alta confianza, parar
      if (bestMatch && bestMatch.similarity > 95) break;
    }
    
    if (bestMatch) {
      return {
        success: true,
        matched: true,
        confidence: bestMatch.similarity,
        matchedUserId: bestMatch.userId,
        similarity: bestMatch.similarity,
        timeMs: Date.now() - startTime,
      };
    }
    
    return {
      success: true,
      matched: false,
      confidence: 0,
      matchedUserId: null,
      similarity: 0,
      timeMs: Date.now() - startTime,
    };
    
  } catch (error: any) {
    return {
      success: false,
      matched: false,
      confidence: 0,
      matchedUserId: null,
      similarity: 0,
      error: error.message,
      timeMs: Date.now() - startTime,
    };
  }
}

/**
 * Compara con un solo usuario
 */
async function compareSingleFace(
  sourceImage: string,
  targetUser: UserToCompare,
  accessKey: string,
  secretKey: string,
  region: string,
  timeoutMs: number
): Promise<{ matched: boolean; similarity: number; userId: string | null }> {
  try {
    const cleanTargetImage = targetUser.faceImage!.replace(/^data:image\/\w+;base64,/, '');
    
    const payload = JSON.stringify({
      SourceImage: { Bytes: sourceImage },
      TargetImage: { Bytes: cleanTargetImage },
      SimilarityThreshold: 70,
    });
    
    const host = `rekognition.${region}.amazonaws.com`;
    const endpoint = `https://${host}`;
    const now = new Date();
    
    // Crear headers firmados con AWS Signature V4
    const headers = await signRequest(
      'POST',
      '/',
      payload,
      host,
      region,
      accessKey,
      secretKey,
      now,
      'RekognitionService.CompareFaces'
    );
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payload,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`AWS Rekognition error for user ${targetUser.id}:`, errorText);
      return { matched: false, similarity: 0, userId: null };
    }
    
    const data = await response.json();
    
    if (data.FaceMatches && data.FaceMatches.length > 0) {
      const similarity = data.FaceMatches[0].Similarity || 0;
      return {
        matched: similarity >= 80,
        similarity,
        userId: targetUser.id,
      };
    }
    
    return { matched: false, similarity: 0, userId: null };
    
  } catch (error) {
    console.warn(`Error comparing with user ${targetUser.id}:`, error);
    return { matched: false, similarity: 0, userId: null };
  }
}

/**
 * AWS Signature V4 - Firma la request
 */
async function signRequest(
  method: string,
  path: string,
  payload: string,
  host: string,
  region: string,
  accessKey: string,
  secretKey: string,
  date: Date,
  target: string
): Promise<Record<string, string>> {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const payloadHash = hash(payload);
  
  const canonicalHeaders = [
    `content-type:application/x-amz-json-1.1`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${target}`,
  ].join('\n') + '\n';
  
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
  
  const canonicalRequest = [
    method,
    path,
    '', // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  const credentialScope = `${dateStamp}/${region}/${AWS_SERVICE}/aws4_request`;
  
  const stringToSign = [
    AWS_ALGORITHM,
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');
  
  const signingKey = getSignatureKey(secretKey, dateStamp, region, AWS_SERVICE);
  const signature = hmac(signingKey, stringToSign, 'hex');
  
  const authorizationHeader = [
    `${AWS_ALGORITHM} Credential=${accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ');
  
  return {
    'Content-Type': 'application/x-amz-json-1.1',
    'Host': host,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': target,
    'Authorization': authorizationHeader,
  };
}

function hash(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, data: string, encoding?: 'hex'): any {
  const h = createHmac('sha256', key).update(data, 'utf8');
  return encoding ? h.digest(encoding) : h.digest();
}

function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${key}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

export default { compareFacesWithRekognition };
