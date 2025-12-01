/**
 * Biometrics V2 Module
 * 
 * InsightFace + Mediapipe biometric verification system
 */

// Main cascade verification
export {
  verifyCascade,
  enrollUser,
  initBiometrics,
  cleanupBiometrics,
  getRegisteredUsers,
  isBiometricsReady,
  type CascadeResult,
  type EnrollmentResult,
  type RegisteredUser,
} from './cascade';

// Mediapipe liveness
export {
  initMediapipe,
  detectLiveness,
  getQuickLivenessScore,
  runLivenessChallenge,
  cleanupMediapipe,
  type LivenessData,
  type LivenessChallenge,
} from './mediapipe';

// InsightFace embeddings
export {
  initInsightFace,
  extractEmbedding,
  compareEmbeddings,
  cosineDistance,
  averageEmbeddings,
  calculateQuality,
  findBestMatch,
  cleanupInsightFace,
  isModelLoaded,
  type EmbeddingResult,
  type ComparisonResult,
} from './insightface';

// Anti-spoof detection
export {
  analyzeForSpoof,
  quickAntiSpoofCheck,
  getAntiSpoofThresholds,
  type AntiSpoofData,
  type AntiSpoofResult,
} from './antispoof';
