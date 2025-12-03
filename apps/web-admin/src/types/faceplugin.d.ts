declare module 'faceplugin-face-recognition-js' {
  export function loadDetectionModel(): Promise<any>;
  export function loadLandmarkModel(): Promise<any>;
  export function loadFeatureModel(): Promise<any>;
  export function loadLivenessModel(): Promise<any>;
  export function loadExpressionModel(): Promise<any>;
  export function loadPoseModel(): Promise<any>;
  export function loadEyeModel(): Promise<any>;
  export function loadGenderModel(): Promise<any>;
  export function loadAgeModel(): Promise<any>;
  
  export function detectFace(session: any, canvasId: string): Promise<any[]>;
  export function predictLandmark(session: any, canvasId: string, bbox: any): Promise<number[][]>;
  export function extractFeature(session: any, canvasId: string, landmarks: number[][]): Promise<number[]>;
  export function predictLiveness(session: any, canvasId: string, bbox: any): Promise<any>;
  export function predictExpression(session: any, canvasId: string, bbox: any): Promise<any>;
  export function predictPose(session: any, canvasId: string, bbox: any, question?: any): Promise<any>;
  export function predictEye(session: any, canvasId: string, landmark: number[][]): Promise<any>;
  export function predictGender(session: any, canvasId: string, landmark: number[][]): Promise<any>;
  export function predictAge(session: any, canvasId: string, landmark: number[][]): Promise<any>;
}
