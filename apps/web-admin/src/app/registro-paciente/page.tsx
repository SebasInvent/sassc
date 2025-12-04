"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, CheckCircle, Camera, CreditCard, User, Phone, MapPin,
  ArrowRight, AlertCircle, Volume2, VolumeX, RefreshCw
} from 'lucide-react';
import { 
  loadInsightFaceModels, 
  detectFaceInsight,
  detectAndExtract,
  descriptorToStringInsight,
  isInsightFaceReady 
} from '@/lib/insightFace';
import { API_URL } from '@/lib/api';

// ============ TIPOS ============
type Step = 
  | 'loading'
  | 'camera'           // Esperando rostro
  | 'cedula'           // Esperando cédula en lector
  | 'datos_adicionales'
  | 'fotos'
  | 'huella'           // Captura de huella dactilar
  | 'processing'
  | 'success'
  | 'error';

type FaceStatus = 'no_face' | 'too_far' | 'too_close' | 'off_center' | 'perfect' | 'detecting';

interface CedulaData {
  cedula: string;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  genero: string;
  fechaNacimiento: string;
  fechaExpedicion: string;
  rh: string;
}

interface PatientData extends CedulaData {
  telefono: string;
  ciudad: string;
}

// ============ VOZ ============
const VOICE_MESSAGES = {
  welcome: "Bienvenido al sistema de registro. Posicione su rostro en el centro de la pantalla.",
  tooFar: "Acérquese un poco más a la cámara.",
  tooClose: "Aléjese un poco de la cámara.",
  noFace: "No detectamos su rostro. Asegúrese de estar frente a la cámara.",
  perfect: "Perfecto, mantenga esa posición.",
  cedula: "Por favor, coloque su cédula en el lector.",
  datosAdicionales: "Complete sus datos de contacto.",
  fotos: "Ahora vamos a capturar su rostro.",
  success: "Registro exitoso. Bienvenido al sistema.",
  error: "Ocurrió un error. Intente de nuevo.",
};

// Cache de voz española - buscar la mejor voz de Google
let spanishVoiceCache: SpeechSynthesisVoice | null = null;

const getSpanishVoice = (): SpeechSynthesisVoice | null => {
  if (spanishVoiceCache) return spanishVoiceCache;
  
  const voices = window.speechSynthesis?.getVoices() || [];
  
  // Buscar voces de Google que suenan mejor (no son locales)
  // Prioridad: Google español > Microsoft español > cualquier español online > local
  spanishVoiceCache = 
    // Voces de Google (las mejores)
    voices.find(v => v.name.includes('Google') && v.lang.startsWith('es')) ||
    // Voces de Microsoft (buenas)
    voices.find(v => v.name.includes('Microsoft') && v.lang.includes('Spanish') && !v.localService) ||
    voices.find(v => v.name.includes('Sabina') || v.name.includes('Jorge') || v.name.includes('Helena')) ||
    // Cualquier voz online en español (mejor que local)
    voices.find(v => v.lang.startsWith('es') && !v.localService) ||
    // Fallback a cualquier español
    voices.find(v => v.lang === 'es-MX') ||
    voices.find(v => v.lang === 'es-US') ||
    voices.find(v => v.lang === 'es-ES') ||
    voices.find(v => v.lang.startsWith('es')) ||
    null;
  
  if (spanishVoiceCache) {
    console.log('🗣️ Voz seleccionada:', spanishVoiceCache.name, spanishVoiceCache.lang);
  }
  
  return spanishVoiceCache;
};

// Cargar voces cuando estén disponibles
if (typeof window !== 'undefined') {
  // Forzar carga de voces
  window.speechSynthesis?.getVoices();
  
  window.speechSynthesis?.addEventListener('voiceschanged', () => {
    spanishVoiceCache = null;
    getSpanishVoice();
  });
}

const speak = (text: string, enabled: boolean = true) => {
  if (!enabled || typeof window === 'undefined') return;
  window.speechSynthesis?.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0; // Velocidad normal
  utterance.pitch = 1.0; // Tono normal
  utterance.volume = 1;
  
  const voice = getSpanishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'es-MX'; // Fallback a español mexicano
  }
  
  window.speechSynthesis?.speak(utterance);
};

// ============ CONSTANTES ============
const FACE_STEPS = [
  { key: 'front', label: 'Mira al frente', icon: '👤', voice: 'Mira directamente a la cámara' },
  { key: 'left', label: 'Gira a la izquierda', icon: '👈', voice: 'Ahora gira tu cara hacia la izquierda' },
  { key: 'right', label: 'Gira a la derecha', icon: '👉', voice: 'Gira tu cara hacia la derecha' },
  { key: 'up', label: 'Mira hacia arriba', icon: '👆', voice: 'Levanta la mirada hacia arriba' },
  { key: 'down', label: 'Mira hacia abajo', icon: '👇', voice: 'Baja la mirada hacia abajo' },
];

// ============ COMPONENTE ============
export default function RegistroPacientePage() {
  const router = useRouter();
  
  // Estados
  const [step, setStep] = useState<Step>('loading');
  const [status, setStatus] = useState('Iniciando...');
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('detecting');
  const [faceBox, setFaceBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [faceLandmarks, setFaceLandmarks] = useState<number[][] | null>(null);
  
  // Datos
  const [cedulaData, setCedulaData] = useState<CedulaData | null>(null);
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  
  // Fotos
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [faceDescriptors, setFaceDescriptors] = useState<Float32Array[]>([]);
  const [currentFaceStep, setCurrentFaceStep] = useState(0);
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  
  // Huella
  const [fingerprintData, setFingerprintData] = useState<string | null>(null);
  const [fingerprintStatus, setFingerprintStatus] = useState<'waiting' | 'capturing' | 'success' | 'error'>('waiting');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cedulaPollingRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const lastVoiceRef = useRef<string>('');
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTransitionedRef = useRef(false);
  const autoCaptureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCapturingRef = useRef(false);

  // Hablar sin repetir
  const speakOnce = useCallback((key: keyof typeof VOICE_MESSAGES, customText?: string) => {
    const text = customText || VOICE_MESSAGES[key];
    if (lastVoiceRef.current === text) return;
    
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    voiceTimeoutRef.current = setTimeout(() => {
      lastVoiceRef.current = text;
      speak(text, voiceEnabled);
    }, 500);
  }, [voiceEnabled]);

  // ============ INICIALIZACIÓN ============
  useEffect(() => {
    init();
    return () => {
      cleanup();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const cleanup = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    if (cedulaPollingRef.current) clearInterval(cedulaPollingRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const init = async () => {
    try {
      setStatus('Preparando sistema...');
      
      // Cargar modelos (no crashea si falla)
      try {
        await loadInsightFaceModels();
      } catch (e) {
        console.warn('InsightFace no disponible, continuando sin él');
      }

      setStatus('Iniciando cámara...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      streamRef.current = stream;
      
      setStep('camera');
      setInstruction('Posicione su rostro en el centro');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
      
      setTimeout(() => speakOnce('welcome'), 1000);
      startFaceDetection();
      
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
      setStep('error');
      speakOnce('error');
    }
  };

  // Ref para el step actual (evitar stale closure)
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  // ============ DETECCIÓN FACIAL CON INSIGHTFACE ============
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    
    console.log('🎥 Iniciando detección facial...');
    
    detectionIntervalRef.current = setInterval(async () => {
      if (isProcessingRef.current || !videoRef.current) return;
      
      const currentStep = stepRef.current;
      if (currentStep !== 'camera' && currentStep !== 'fotos') return;
      
      isProcessingRef.current = true;
      console.log('🔍 Ejecutando detección...');
      
      try {
        const detection = await detectFaceInsight(videoRef.current);
        
        // Log para diagnóstico
        if (currentStep === 'fotos') {
          console.log('🔍 Detección en paso fotos:', detection ? `score=${detection.confidence.toFixed(2)}` : 'NO DETECTADO');
        }
        
        if (detection && detection.bbox) {
          const [x, y, width, height] = detection.bbox;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          
          // Log para debug
          console.log('BBox:', { x, y, width, height, videoWidth, videoHeight });
          
          // Calcular métricas
          const faceCenterX = (x + width / 2) / videoWidth;
          const faceCenterY = (y + height / 2) / videoHeight;
          const faceSize = (width * height) / (videoWidth * videoHeight);
          
          console.log('Métricas:', { faceCenterX, faceCenterY, faceSize });
          
          setFaceBox({ x, y, width, height });
          
          // Rostro detectado con score > 0.5 = perfecto
          setFaceStatus('perfect');
          setFaceBox({ x, y, width, height });
          
          // Guardar landmarks si están disponibles
          if (detection.landmarks) {
            setFaceLandmarks(detection.landmarks);
          }
          
          setInstruction('✓ Rostro detectado');
          
          // Pasar automáticamente al paso de cédula
          if (stepRef.current === 'camera' && !hasTransitionedRef.current) {
            hasTransitionedRef.current = true;
            setInstruction('✓ Rostro detectado - Pasando al siguiente paso...');
            speak('Perfecto. Ahora coloque su cédula en el lector.', voiceEnabled);
            
            setTimeout(() => {
              setStep('cedula');
              startCedulaPolling();
            }, 1500);
          }
          
          // La captura de fotos ahora es automática por timer, no por detección
        } else {
          setFaceStatus('no_face');
          setFaceBox(null);
          setInstruction('No se detecta rostro');
        }
      } catch (e) {
        console.error('Error detección:', e);
      }
      
      isProcessingRef.current = false;
    }, 500); // 500ms para InsightFace (más pesado)
  };

  // ============ LECTOR DE CÉDULA ============
  // El lector de cédulas siempre usa localhost porque está conectado físicamente
  const CEDULA_READER_URL = 'http://localhost:3001';
  
  const startCedulaPolling = () => {
    if (cedulaPollingRef.current) clearInterval(cedulaPollingRef.current);
    
    cedulaPollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${CEDULA_READER_URL}/cedula-reader/read`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            clearInterval(cedulaPollingRef.current!);
            handleCedulaRead(result.data);
          }
        }
      } catch (e) {
        // Silenciar
      }
    }, 1000);
  };

  const handleCedulaRead = async (data: CedulaData) => {
    setCedulaData(data);
    
    console.log('📋 Cédula leída:', data.cedula);
    
    // Leer número de cédula DÍGITO POR DÍGITO
    const cedulaDigitos = data.cedula.split('').join(', ');
    
    // Solo nombre y apellido
    const nombre = data.nombre1;
    const apellido = data.apellido1;
    
    // Mensaje simple: nombre, apellido y cédula dígito por dígito
    const mensaje = `${nombre} ${apellido}. Cédula: ${cedulaDigitos}.`;
    
    speak(mensaje, voiceEnabled);
    setStep('datos_adicionales');
  };

  // ============ DATOS ADICIONALES ============
  const handleDatosSubmit = () => {
    if (!telefono || !ciudad) {
      alert('Complete todos los campos');
      return;
    }
    
    setStep('fotos');
    setCurrentFaceStep(0);
    
    // Iniciar secuencia de captura automática
    startPhotoSequence();
  };
  
  // ============ SECUENCIA DE FOTOS COORDINADA ============
  const capturedImagesRef = useRef<string[]>([]);
  const capturedDescriptorsRef = useRef<Float32Array[]>([]);
  const currentStepRef = useRef(0);
  const isProcessingRef2 = useRef(false);
  
  const startPhotoSequence = () => {
    // Reset
    capturedImagesRef.current = [];
    capturedDescriptorsRef.current = [];
    currentStepRef.current = 0;
    isProcessingRef2.current = false;
    
    // Iniciar con la primera pose
    captureNextPose(0);
  };
  
  const captureNextPose = async (stepIndex: number) => {
    if (stepIndex >= FACE_STEPS.length) {
      // Fotos terminadas - procesar registro
      speak('Listo. Procesando.', voiceEnabled);
      handleSubmit(capturedImagesRef.current, capturedDescriptorsRef.current);
      return;
    }
    
    if (isProcessingRef2.current) return;
    isProcessingRef2.current = true;
    
    setCurrentFaceStep(stepIndex);
    
    // 1. Decir la instrucción
    speak(FACE_STEPS[stepIndex].voice, voiceEnabled);
    
    // 2. Esperar 1.5 segundos para que la persona gire
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 3. Capturar la foto
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, 480, 360);
        const image = canvas.toDataURL('image/jpeg', 0.6);
        const descriptor = new Float32Array(512);
        
        capturedImagesRef.current.push(image);
        capturedDescriptorsRef.current.push(descriptor);
        setFaceImages([...capturedImagesRef.current]);
        setFaceDescriptors([...capturedDescriptorsRef.current]);
        
        console.log(`📸 ${stepIndex + 1}/${FACE_STEPS.length} - ${FACE_STEPS[stepIndex].key}`);
      }
    }
    
    isProcessingRef2.current = false;
    
    // 4. Pasar a la siguiente pose (sin decir "listo")
    captureNextPose(stepIndex + 1);
  };

  // ============ CAPTURA DE HUELLA DACTILAR ============
  const startFingerprintCapture = async () => {
    setFingerprintStatus('capturing');
    
    try {
      // Llamar al backend para capturar huella
      const response = await fetch('http://localhost:3001/fingerprint/capture', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success && result.fingerprint) {
        setFingerprintData(result.fingerprint);
        setFingerprintStatus('success');
        speak('Huella capturada. Procesando registro.', voiceEnabled);
        
        // Continuar con el submit
        setTimeout(() => {
          handleSubmit(capturedImagesRef.current, capturedDescriptorsRef.current);
        }, 1000);
      } else {
        // Reintentar
        setFingerprintStatus('error');
        speak('No se detectó la huella. Intenta de nuevo.', voiceEnabled);
        
        // Reintentar después de 2 segundos
        setTimeout(() => {
          startFingerprintCapture();
        }, 2000);
      }
    } catch (error) {
      console.error('Error capturando huella:', error);
      setFingerprintStatus('error');
      speak('Error con el lector. Intenta de nuevo.', voiceEnabled);
      
      setTimeout(() => {
        startFingerprintCapture();
      }, 2000);
    }
  };

  // ============ CAPTURA FACIAL CON INSIGHTFACE ============
  const capturePhoto = async (): Promise<{ image: string; descriptor: Float32Array } | null> => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Reducir tamaño para evitar "request entity too large"
    const maxSize = 480;
    const scale = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.5); // Calidad reducida
    
    // Usar InsightFace para detectar y extraer descriptor 512D
    const result = await detectAndExtract(video);
    if (!result?.descriptor) return null;
    
    return { image, descriptor: result.descriptor };
  };


  // ============ ENVÍO ============
  const handleSubmit = async (images: string[], descriptors: Float32Array[]) => {
    setStep('processing');
    speak('Procesando su registro.', voiceEnabled);
    
    try {
      // Preparar datos del paciente
      const patientData = {
        docType: 'CC',
        docNumber: cedulaData!.cedula,
        firstName: `${cedulaData!.nombre1} ${cedulaData!.nombre2}`.trim(),
        lastName: `${cedulaData!.apellido1} ${cedulaData!.apellido2}`.trim(),
        birthDate: cedulaData!.fechaNacimiento,
        gender: cedulaData!.genero,
        phone: telefono,
        city: ciudad,
        department: 'Colombia',
        bloodType: cedulaData!.rh,
        faceDescriptors: descriptors.map(d => descriptorToStringInsight(d)),
        faceImages: images,
      };
      
      console.log('📤 Registrando paciente:', patientData.firstName, patientData.lastName);
      console.log('📸 Fotos capturadas:', images.length);
      console.log('🔐 Descriptores:', descriptors.length);
      
      // Enviar al backend
      const response = await fetch(`${API_URL}/fhir/Patient/register-biometric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });
      
      const result = await response.json();
      console.log('📥 Respuesta del servidor:', result);
      
      if (result.success) {
        speak(`Registro exitoso. ${cedulaData!.nombre1} ${cedulaData!.apellido1}.`, voiceEnabled);
        setStep('success');
      } else {
        throw new Error(result.message || 'Error al registrar paciente');
      }
      
    } catch (err) {
      console.error('Submit error:', err);
      setError((err as Error).message);
      setStep('error');
    }
  };

  const resetFlow = () => {
    // Limpiar estados
    setCedulaData(null);
    setTelefono('');
    setCiudad('');
    setFaceImages([]);
    setFaceDescriptors([]);
    setCurrentFaceStep(0);
    setError('');
    setAutoCapturing(false);
    setCaptureCountdown(0);
    
    // Limpiar refs
    hasTransitionedRef.current = false;
    isCapturingRef.current = false;
    if (autoCaptureTimeoutRef.current) {
      clearTimeout(autoCaptureTimeoutRef.current);
      autoCaptureTimeoutRef.current = null;
    }
    
    // Volver al paso de cámara (los modelos ya están cargados)
    setStep('camera');
    setInstruction('Posicione su rostro en el centro');
    
    // Reiniciar detección facial
    startFaceDetection();
  };

  // ============ RENDER ============
  const getCircleColor = () => {
    switch (faceStatus) {
      case 'perfect': return '#22d3ee';
      case 'too_far': 
      case 'too_close': 
      case 'off_center': return '#fbbf24';
      default: return '#f87171';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden">
      {/* Video fullscreen */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      
      {/* Canvas oculto */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Círculo facial que sigue el rostro + Puntos biométricos */}
      {faceBox && videoRef.current && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          style={{ transform: 'scaleX(-1)' }}
        >
          {(() => {
            const video = videoRef.current!;
            const scaleX = video.clientWidth / video.videoWidth;
            const scaleY = video.clientHeight / video.videoHeight;
            
            const cx = (faceBox.x + faceBox.width / 2) * scaleX;
            const cy = (faceBox.y + faceBox.height / 2) * scaleY;
            const r = Math.max(faceBox.width * scaleX, faceBox.height * scaleY) * 0.6;
            
            const color = faceStatus === 'perfect' ? '#22d3ee' : '#fbbf24';
            
            return (
              <>
                {/* Círculo principal alrededor del rostro */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  style={{ 
                    filter: `drop-shadow(0 0 10px ${color})`,
                    transition: 'all 0.1s ease-out'
                  }}
                />
                
                {/* Esquinas del marco */}
                <path
                  d={`M ${cx - r} ${cy - r * 0.3} L ${cx - r} ${cy - r} L ${cx - r * 0.7} ${cy - r}`}
                  fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                />
                <path
                  d={`M ${cx + r * 0.7} ${cy - r} L ${cx + r} ${cy - r} L ${cx + r} ${cy - r * 0.3}`}
                  fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                />
                <path
                  d={`M ${cx - r} ${cy + r * 0.3} L ${cx - r} ${cy + r} L ${cx - r * 0.7} ${cy + r}`}
                  fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                />
                <path
                  d={`M ${cx + r * 0.7} ${cy + r} L ${cx + r} ${cy + r} L ${cx + r} ${cy + r * 0.3}`}
                  fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                />
                
                {/* Puntos biométricos (landmarks) */}
                {faceLandmarks && faceLandmarks.map((point, idx) => {
                  const px = point[0] * scaleX;
                  const py = point[1] * scaleY;
                  const labels = ['👁️ Ojo Izq', '👁️ Ojo Der', '👃 Nariz', '👄 Boca Izq', '👄 Boca Der'];
                  
                  return (
                    <g key={idx}>
                      {/* Punto */}
                      <circle
                        cx={px}
                        cy={py}
                        r="6"
                        fill={color}
                        style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                      />
                      {/* Círculo exterior */}
                      <circle
                        cx={px}
                        cy={py}
                        r="10"
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        opacity="0.5"
                      />
                    </g>
                  );
                })}
                
                {/* Etiqueta de estado */}
                <rect
                  x={cx - 80}
                  y={cy + r + 15}
                  width="160"
                  height="28"
                  rx="14"
                  fill={color}
                  opacity="0.9"
                />
                <text
                  x={cx}
                  y={cy + r + 34}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {faceStatus === 'perfect' ? '✓ ROSTRO DETECTADO' : 'DETECTANDO...'}
                </text>
              </>
            );
          })()}
        </svg>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/90" />
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
        <div className="text-white">
          <span className="text-xs text-slate-400">SASSC</span>
          <p className="font-semibold">Registro de Paciente</p>
        </div>
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="p-2 rounded-full bg-black/30 text-white"
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>
      
      {/* Status bar */}
      <div className="absolute top-20 left-0 right-0 flex justify-center z-10">
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          faceStatus === 'perfect' ? 'bg-cyan-500/80 text-white' :
          faceStatus === 'no_face' ? 'bg-red-500/80 text-white' :
          'bg-yellow-500/80 text-white'
        }`}>
          {instruction || status}
        </div>
      </div>
      
      {/* Contenido central */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        {step === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-xl text-slate-300">{status}</p>
          </div>
        )}
        
        {step === 'cedula' && (
          <div className="text-center">
            <CreditCard className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-bounce" />
            <p className="text-2xl text-white font-semibold">Coloque su cédula en el lector</p>
          </div>
        )}
        
        {step === 'datos_adicionales' && (
          <div className="bg-slate-900/90 backdrop-blur rounded-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-2 text-center">
              Hola, {cedulaData?.nombre1} 👋
            </h2>
            <p className="text-slate-400 text-center mb-6">Complete sus datos de contacto</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  <Phone className="w-4 h-4 inline mr-2" />Teléfono
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="3001234567"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  <MapPin className="w-4 h-4 inline mr-2" />Ciudad
                </label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Bogotá"
                />
              </div>
              <button
                onClick={handleDatosSubmit}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                Continuar <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        
        {step === 'fotos' && FACE_STEPS[currentFaceStep] && (
          <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center z-30">
            {/* Instrucción grande y clara */}
            <div className="text-center mb-6">
              <p className="text-8xl mb-4">{FACE_STEPS[currentFaceStep]?.icon || '📸'}</p>
              <p className="text-4xl text-white font-bold drop-shadow-lg mb-2">
                {FACE_STEPS[currentFaceStep]?.label || 'Capturando...'}
              </p>
              <p className="text-xl text-cyan-300 animate-pulse">Detectando pose...</p>
            </div>
            
            {/* Progreso de fotos - más compacto */}
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur px-6 py-3 rounded-full">
              {FACE_STEPS.map((step, i) => (
                <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                  i < currentFaceStep 
                    ? 'bg-green-500 text-white' 
                    : i === currentFaceStep 
                      ? 'bg-cyan-500 text-white ring-4 ring-cyan-400/50 scale-110 animate-pulse' 
                      : 'bg-slate-700 text-slate-400'
                }`}>
                  {i < currentFaceStep ? '✓' : step.icon}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {step === 'huella' && (
          <div className="text-center">
            <div className={`text-8xl mb-6 ${fingerprintStatus === 'capturing' ? 'animate-pulse' : ''}`}>
              {fingerprintStatus === 'success' ? '✅' : fingerprintStatus === 'error' ? '❌' : '👆'}
            </div>
            <p className="text-3xl text-white font-bold mb-4">
              {fingerprintStatus === 'success' 
                ? 'Huella capturada' 
                : fingerprintStatus === 'error' 
                  ? 'Intenta de nuevo' 
                  : 'Coloca tu dedo en el lector'}
            </p>
            <p className="text-xl text-cyan-300 animate-pulse">
              {fingerprintStatus === 'capturing' ? 'Esperando huella...' : ''}
            </p>
          </div>
        )}
        
        {step === 'processing' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-xl text-slate-300">Procesando registro...</p>
          </div>
        )}
        
        {step === 'success' && (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">¡Registro Exitoso!</h2>
            <p className="text-xl text-slate-300 mb-6">Bienvenido, {cedulaData?.nombre1} {cedulaData?.apellido1}</p>
            <p className="text-slate-400 mb-8">Tu registro biométrico ha sido completado correctamente.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Registrar otra persona
            </button>
          </div>
        )}
        
        {step === 'error' && (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-700 text-white rounded-xl">
              <RefreshCw className="w-5 h-5 inline mr-2" />Reintentar
            </button>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center z-10">
        <p className="text-slate-500 text-sm">Sistema de Registro Biométrico • v1.0</p>
      </div>
    </div>
  );
}
