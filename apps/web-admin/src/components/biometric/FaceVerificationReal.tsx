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
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  loadModels, 
  detectFace,
  detectFaceOnly,
  findBestMatch,
  descriptorToString 
} from '@/lib/faceRecognition';

interface RegisteredUser {
  id: string;
  name: string;
  license: string;
  descriptor: string;
  role?: string;
  specialty?: string;
}

interface FaceVerificationProps {
  /** Lista de usuarios registrados con sus descriptores faciales */
  registeredUsers?: RegisteredUser[];
  /** Umbral mínimo de similitud (0-100) */
  threshold?: number;
  /** Callback cuando se identifica un usuario */
  onUserIdentified: (user: RegisteredUser, similarity: number, imageBase64: string) => void;
  /** Callback cuando no se reconoce el rostro */
  onUnknownFace?: (imageBase64: string) => void;
  /** Callback para errores */
  onError?: (error: string) => void;
  /** Mensaje personalizado */
  message?: string;
}

type Estado = 'idle' | 'cargando_modelos' | 'iniciando' | 'detectando' | 'procesando' | 'identificado' | 'no_reconocido' | 'error';

export function FaceVerificationReal({ 
  registeredUsers = [],
  threshold = 70,
  onUserIdentified,
  onUnknownFace,
  onError,
  message = 'Verificación de identidad'
}: FaceVerificationProps) {
  const [estado, setEstado] = useState<Estado>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [identifiedUser, setIdentifiedUser] = useState<RegisteredUser | null>(null);
  const [similarity, setSimilarity] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [modelsProgress, setModelsProgress] = useState(0);
  
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  const iniciar = async () => {
    setEstado('cargando_modelos');
    setErrorMsg(null);
    setModelsProgress(0);

    try {
      // Cargar modelos de face-api.js
      setModelsProgress(30);
      await loadModels();
      setModelsProgress(100);
      
      // Iniciar cámara
      await startCamera();
    } catch (err: any) {
      console.error('Error:', err);
      setErrorMsg(err.message || 'Error iniciando verificación');
      setEstado('error');
      onError?.(err.message);
    }
  };

  const startCamera = async () => {
    setEstado('iniciando');

    try {
      cleanup();

      console.log('📷 Solicitando acceso a cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('✅ Stream obtenido:', stream.getVideoTracks()[0]?.label);
      streamRef.current = stream;
      
      // Cambiar a estado detectando PRIMERO para que el video element se monte
      setEstado('detectando');
      
    } catch (err: any) {
      console.error('Error cámara:', err);
      let errorMessage = 'No se pudo acceder a la cámara.';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permiso de cámara denegado.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró cámara.';
      }
      setErrorMsg(errorMessage);
      setEstado('error');
      onError?.(errorMessage);
    }
  };

  // Efecto para configurar el video cuando el estado cambia a 'detectando'
  useEffect(() => {
    if (estado === 'detectando' && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      
      console.log('🎥 Configurando video element...');
      video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = async () => {
        console.log('📐 Video metadata cargada:', video.videoWidth, 'x', video.videoHeight);
        try {
          await video.play();
          console.log('▶️ Video reproduciendo');
          startFaceDetection();
        } catch (e) {
          console.error('Error reproduciendo video:', e);
        }
      };
    }
  }, [estado]);

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    console.log('🔍 Iniciando detección de rostro...');
    
    // Detectar rostro cada 800ms usando face-api.js real (más rápido con detectFaceOnly)
    detectionIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video) {
        console.log('Video ref no disponible');
        return;
      }
      
      if (estado !== 'detectando') {
        console.log('Estado no es detectando:', estado);
        return;
      }

      // Verificar que el video esté reproduciendo
      if (video.readyState < 2 || video.paused) {
        console.log('Video no listo. readyState:', video.readyState, 'paused:', video.paused);
        return;
      }

      try {
        // Usar detectFaceOnly para detección más rápida
        const detected = await detectFaceOnly(video);
        console.log('Detección resultado:', detected);
        setFaceDetected(detected);
      } catch (err) {
        console.error('Error en detección:', err);
      }
    }, 800);
  };

  // Auto-captura con countdown
  useEffect(() => {
    let countdownTimer: NodeJS.Timeout | null = null;
    
    if (faceDetected && estado === 'detectando') {
      countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownTimer) clearInterval(countdownTimer);
            captureAndIdentify();
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

  const captureAndIdentify = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    setEstado('procesando');

    try {
      // Capturar imagen
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // Detectar rostro y obtener descriptor
      const descriptor = await detectFace(video);
      
      if (!descriptor) {
        setErrorMsg('No se detectó un rostro claro. Intente de nuevo.');
        setEstado('error');
        return;
      }

      // Si hay usuarios registrados, buscar coincidencia
      if (registeredUsers.length > 0) {
        console.log('═══════════════════════════════════════════');
        console.log('📊 COMPARACIÓN DE ROSTROS');
        console.log('═══════════════════════════════════════════');
        console.log('📊 Usuarios registrados:', registeredUsers.length);
        console.log('📊 Descriptor capturado (primeros 5):', Array.from(descriptor.slice(0, 5)).map(n => n.toFixed(4)));
        console.log('📊 Longitud descriptor capturado:', descriptor.length);
        
        registeredUsers.forEach((u, i) => {
          console.log(`📊 Usuario ${i + 1}: ${u.name} (${u.license}) - descriptor: ${u.descriptor?.length || 0} chars`);
        });
        
        const { user, similarity: matchSimilarity } = findBestMatch(descriptor, registeredUsers);
        
        console.log('📊 Resultado findBestMatch:', { user: user?.name || 'null', similarity: matchSimilarity });
        setSimilarity(matchSimilarity);

        // Si findBestMatch retorna un usuario, significa que pasó todas las validaciones
        if (user) {
          const fullUser = registeredUsers.find(u => u.id === user.id)!;
          console.log('✅ Usuario identificado:', fullUser.name, '- Licencia:', fullUser.license);
          setIdentifiedUser(fullUser);
          setEstado('identificado');
          cleanup();
          
          setTimeout(() => {
            onUserIdentified(fullUser, matchSimilarity, imageBase64);
          }, 1500);
        } else {
          console.log('❌ Rostro no reconocido - ningún usuario cumplió los criterios');
          setEstado('no_reconocido');
          onUnknownFace?.(imageBase64);
        }
      } else {
        // No hay usuarios registrados, solo confirmar que hay rostro
        setSimilarity(100);
        setEstado('identificado');
        cleanup();
        
        // Crear usuario temporal
        const tempUser: RegisteredUser = {
          id: 'temp',
          name: 'Usuario Verificado',
          license: '',
          role: 'USER',
          descriptor: descriptorToString(descriptor)
        };
        
        setTimeout(() => {
          onUserIdentified(tempUser, 100, imageBase64);
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error procesando:', err);
      setErrorMsg('Error procesando rostro');
      setEstado('error');
    }
  };

  const retry = () => {
    setErrorMsg(null);
    setCountdown(3);
    setIdentifiedUser(null);
    setSimilarity(0);
    iniciar();
  };

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      {/* Estado: Idle */}
      {estado === 'idle' && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <Fingerprint className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{message}</p>
            <p className="text-sm text-gray-500 mt-1">
              El sistema reconocerá su rostro automáticamente
            </p>
          </div>
          <Button onClick={iniciar} className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Iniciar Reconocimiento
          </Button>
        </div>
      )}

      {/* Estado: Cargando Modelos */}
      {estado === 'cargando_modelos' && (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
          <div>
            <p className="text-sm text-gray-600">Cargando modelos de IA...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${modelsProgress}%` }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Estado: Iniciando */}
      {estado === 'iniciando' && (
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
          <p className="text-sm text-gray-600">Iniciando cámara...</p>
        </div>
      )}

      {/* Estado: Detectando */}
      {estado === 'detectando' && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Guía facial */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-48 h-64 border-4 rounded-full transition-all duration-300 ${
                faceDetected 
                  ? 'border-green-500 shadow-lg shadow-green-500/50' 
                  : 'border-white/50'
              }`} />
            </div>

            {/* Countdown */}
            {faceDetected && countdown < 3 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-7xl font-bold text-white drop-shadow-lg">{countdown}</span>
              </div>
            )}

            {/* Indicador */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
                faceDetected ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
              }`}>
                {faceDetected ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Rostro detectado - Identificando en {countdown}...</span>
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

          <Button onClick={captureAndIdentify} disabled={!faceDetected} className="w-full" size="lg">
            <Camera className="w-5 h-5 mr-2" />
            Capturar Ahora
          </Button>
        </div>
      )}

      {/* Estado: Procesando */}
      {estado === 'procesando' && (
        <div className="text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75" />
            <div className="relative w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-900">Procesando rostro...</p>
            <p className="text-sm text-gray-500 mt-1">Buscando coincidencias</p>
          </div>
        </div>
      )}

      {/* Estado: Identificado */}
      {estado === 'identificado' && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <UserCheck className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">¡Bienvenido!</p>
            {identifiedUser && (
              <p className="text-lg font-bold text-gray-900 mt-1">
                {identifiedUser.name}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-1">
              Similitud: {similarity}%
            </p>
          </div>
          <div className="w-full bg-green-100 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {/* Estado: No Reconocido */}
      {estado === 'no_reconocido' && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-yellow-600" />
          </div>
          <div>
            <p className="font-medium text-yellow-800">Rostro No Reconocido</p>
            <p className="text-sm text-gray-600 mt-1">
              Similitud máxima: {similarity}% (mínimo requerido: {threshold}%)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={retry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
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
            <p className="font-medium text-red-800">Error</p>
            <p className="text-sm text-gray-600 mt-1">{errorMsg}</p>
          </div>
          <Button variant="outline" onClick={retry} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}
