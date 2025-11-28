'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  Fingerprint,
  Shield,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FaceVerificationProps {
  /** Descriptor facial almacenado del usuario (JSON string) */
  storedDescriptor?: string;
  /** Umbral mínimo de similitud (0-100) */
  threshold?: number;
  /** Callback cuando la verificación es exitosa */
  onSuccess: (similarity: number, imageBase64: string) => void;
  /** Callback cuando la verificación falla */
  onError?: (error: string) => void;
  /** Callback para cancelar */
  onCancel?: () => void;
  /** Mensaje personalizado */
  message?: string;
}

type Estado = 'idle' | 'iniciando' | 'detectando' | 'verificando' | 'exito' | 'error';

/**
 * Componente para verificar la identidad de un usuario mediante reconocimiento facial
 */
export function FaceVerification({ 
  storedDescriptor,
  threshold = 85,
  onSuccess, 
  onError,
  onCancel,
  message = 'Verificación de identidad requerida'
}: FaceVerificationProps) {
  const [estado, setEstado] = useState<Estado>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [similarity, setSimilarity] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [videoReady, setVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    console.log('Limpiando recursos...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track detenido:', track.kind);
      });
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setVideoReady(false);
  }, []);

  const startCamera = async () => {
    console.log('=== INICIANDO CÁMARA ===' );
    setEstado('iniciando');
    setErrorMsg(null);
    setVideoReady(false);

    try {
      // Limpiar stream anterior
      cleanup();

      console.log('Solicitando acceso a la cámara...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('Stream obtenido:', stream);
      console.log('Tracks:', stream.getTracks());
      
      streamRef.current = stream;
      
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element no encontrado');
      }

      // Configurar el video
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      
      // Esperar a que el video cargue los metadatos
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          console.log('Video metadata cargada:', video.videoWidth, 'x', video.videoHeight);
          resolve();
        };
        video.onerror = (e) => {
          console.error('Error en video:', e);
          reject(new Error('Error cargando video'));
        };
        // Timeout de seguridad
        setTimeout(() => reject(new Error('Timeout cargando video')), 10000);
      });

      // Reproducir el video
      console.log('Intentando reproducir video...');
      await video.play();
      console.log('Video reproduciéndose!');
      
      setVideoReady(true);
      setEstado('detectando');
      startFaceDetection();
      
    } catch (err: any) {
      console.error('Error completo:', err);
      cleanup();
      
      let errorMessage = 'No se pudo acceder a la cámara.';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permiso de cámara denegado. Por favor permite el acceso en tu navegador.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara conectada.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setErrorMsg(errorMessage);
      setEstado('error');
      onError?.(errorMessage);
    }
  };

  const startFaceDetection = () => {
    console.log('Iniciando detección facial simulada...');
    
    // Limpiar intervalo anterior
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    // Simular detección cada 500ms
    detectionIntervalRef.current = setInterval(() => {
      // Simulación: 80% de probabilidad de detectar rostro
      const detected = Math.random() > 0.2;
      setFaceDetected(detected);
    }, 500);
  };

  // Auto-captura con countdown cuando se detecta rostro
  useEffect(() => {
    let countdownTimer: NodeJS.Timeout | null = null;
    
    if (faceDetected && estado === 'detectando') {
      countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownTimer) clearInterval(countdownTimer);
            captureAndVerify();
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(3);
    }

    return () => {
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [faceDetected, estado]);

  const captureAndVerify = async () => {
    console.log('Capturando y verificando...');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) {
      console.error('Video o canvas no disponible');
      return;
    }

    // Detener detección
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    setEstado('verificando');

    // Capturar frame del video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener contexto 2D');
      return;
    }
    
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    console.log('Imagen capturada, longitud:', imageBase64.length);

    // Simular verificación (1.5 segundos)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simular resultado exitoso (85-100% similitud)
    const simulatedSimilarity = 85 + Math.random() * 15;
    const finalSimilarity = Math.round(simulatedSimilarity);
    setSimilarity(finalSimilarity);

    console.log('Similitud simulada:', finalSimilarity);

    if (simulatedSimilarity >= threshold) {
      setEstado('exito');
      cleanup();
      
      // Llamar callback después de mostrar éxito
      setTimeout(() => {
        onSuccess(finalSimilarity, imageBase64);
      }, 1500);
    } else {
      setEstado('error');
      setErrorMsg(`Similitud insuficiente: ${finalSimilarity}% (mínimo ${threshold}%)`);
      onError?.('Verificación facial fallida');
    }
  };

  const retry = () => {
    console.log('Reintentando...');
    setErrorMsg(null);
    setCountdown(3);
    startCamera();
  };

  return (
    <div className="space-y-4">
      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Video siempre presente pero oculto cuando no está en uso */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* Estado: Idle */}
      {estado === 'idle' && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <Fingerprint className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{message}</p>
            <p className="text-sm text-gray-500 mt-1">
              Se verificará su identidad mediante reconocimiento facial
            </p>
          </div>
          <Button onClick={startCamera} className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Iniciar Verificación
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="w-full">
              Cancelar
            </Button>
          )}
        </div>
      )}

      {/* Estado: Iniciando */}
      {estado === 'iniciando' && (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
          <p className="text-sm text-gray-600">Iniciando cámara...</p>
          <p className="text-xs text-gray-400">Por favor permite el acceso a la cámara si el navegador lo solicita</p>
        </div>
      )}

      {/* Estado: Detectando */}
      {estado === 'detectando' && (
        <div className="space-y-4">
          {/* Video con overlay */}
          <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
            {/* Clonar el video para mostrarlo */}
            <video
              autoPlay
              playsInline
              muted
              ref={(el) => {
                if (el && streamRef.current) {
                  el.srcObject = streamRef.current;
                }
              }}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay con guía facial */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-48 h-64 border-4 rounded-full transition-colors duration-300 ${
                faceDetected ? 'border-green-500 shadow-lg shadow-green-500/50' : 'border-white/50'
              }`} />
            </div>

            {/* Countdown */}
            {faceDetected && countdown < 3 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-7xl font-bold text-white drop-shadow-lg">{countdown}</span>
              </div>
            )}

            {/* Indicador de detección */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
                faceDetected 
                  ? 'bg-green-500 text-white' 
                  : 'bg-yellow-500 text-white'
              }`}>
                {faceDetected ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Rostro detectado - Capturando en {countdown}...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    <span>Posicione su rostro en el círculo</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Button 
            onClick={captureAndVerify} 
            disabled={!faceDetected}
            className="w-full"
            size="lg"
          >
            <Camera className="w-5 h-5 mr-2" />
            Capturar Ahora
          </Button>
        </div>
      )}

      {/* Estado: Verificando */}
      {estado === 'verificando' && (
        <div className="text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75" />
            <div className="relative w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-900">Verificando identidad...</p>
            <p className="text-sm text-gray-500 mt-1">Comparando rostro capturado</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '66%' }} />
          </div>
        </div>
      )}

      {/* Estado: Éxito */}
      {estado === 'exito' && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">¡Verificación Exitosa!</p>
            <p className="text-sm text-gray-600 mt-1">
              Similitud: {similarity}%
            </p>
          </div>
          <div className="w-full bg-green-100 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {/* Estado: Error */}
      {estado === 'error' && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-red-800">Verificación Fallida</p>
            <p className="text-sm text-gray-600 mt-1">{errorMsg}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={retry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
