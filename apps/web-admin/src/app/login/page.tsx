"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  CheckCircle, 
  XCircle,
  Camera,
  UserPlus,
  KeyRound,
  RefreshCw,
  Scan,
  Fingerprint,
  Shield,
  Eye,
  Lock,
  Volume2,
  VolumeX,
  ArrowRight,
  User
} from 'lucide-react';
import { 
  loadModels, 
  detectFace, 
  euclideanDistance,
  stringToDescriptor 
} from '@/lib/faceRecognition';
import { 
  verifyFaceWithMultipleCaptures, 
  quickVerify,
  SECURITY_CONFIG,
  type VerificationResult 
} from '@/lib/faceVerification';
import { verifyCascade, type CascadeResult } from '@/lib/cascadeVerification';
import { API_URL } from '@/lib/api';

// ============ SISTEMA DE VOZ ============
const VOICE_MESSAGES = {
  welcome: "Bienvenido a SASSC. Posicione su rostro en el centro de la pantalla.",
  tooFar: "Acérquese un poco más a la cámara.",
  tooClose: "Aléjese un poco de la cámara.",
  noFace: "No detectamos su rostro. Asegúrese de estar frente a la cámara.",
  perfect: "Perfecto, mantenga esa posición.",
  verifying: "Verificando identidad.",
  success: "Bienvenido",
  notRegistered: "No encontramos su rostro en el sistema. Por favor regístrese.",
  error: "Ocurrió un error. Intente de nuevo.",
  lookCenter: "Mire directamente a la cámara.",
  goodLight: "Buena iluminación detectada.",
  badLight: "Busque un lugar con mejor iluminación.",
};

// Función para hablar
const speak = (text: string, enabled: boolean = true) => {
  if (!enabled || typeof window === 'undefined') return;
  
  // Cancelar cualquier speech anterior
  window.speechSynthesis?.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  // Buscar voz en español
  const voices = window.speechSynthesis?.getVoices() || [];
  const spanishVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
  if (spanishVoice) utterance.voice = spanishVoice;
  
  window.speechSynthesis?.speak(utterance);
};

interface RegisteredUser {
  id: string;
  name: string;
  license: string;
  specialty: string;
  descriptor: string;
  faceImage?: string;
}

type Step = 'loading' | 'camera' | 'verifying' | 'recognized' | 'not_registered' | 'no_face_detected' | 'verification_failed' | 'manual_login';

// Estado de detección facial
type FaceStatus = 'no_face' | 'too_far' | 'too_close' | 'off_center' | 'perfect' | 'detecting';

export default function LoginV2Page() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [step, setStep] = useState<Step>('loading');
  const [status, setStatus] = useState('Iniciando...');
  const [instruction, setInstruction] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [recognizedUser, setRecognizedUser] = useState<RegisteredUser | null>(null);
  const [license, setLicense] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('detecting');
  const [faceBox, setFaceBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const lastVoiceRef = useRef<string>('');
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para hablar sin repetir el mismo mensaje
  const speakOnce = useCallback((key: keyof typeof VOICE_MESSAGES, customText?: string) => {
    const text = customText || VOICE_MESSAGES[key];
    if (lastVoiceRef.current === text) return;
    
    // Debounce para no hablar muy seguido
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    voiceTimeoutRef.current = setTimeout(() => {
      lastVoiceRef.current = text;
      speak(text, voiceEnabled);
    }, 500);
  }, [voiceEnabled]);

  useEffect(() => {
    init();
    return () => {
      stopCamera();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const init = async () => {
    try {
      setStatus('Cargando...');
      const res = await fetch(`${API_URL}/auth/registered-faces`);
      const data = await res.json();
      setRegisteredUsers(data.users || []);

      setStatus('Preparando IA...');
      await loadModels();

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
      
      // Mensaje de bienvenida
      setTimeout(() => speakOnce('welcome'), 1000);
      
      startAutoDetection();
      
    } catch (err: any) {
      console.error('Error:', err);
      setStatus(`Error: ${err.message}`);
      speakOnce('error');
    }
  };

  const startAutoDetection = () => {
    const interval = setInterval(async () => {
      if (step !== 'camera' || isProcessingRef.current || !videoRef.current) {
        return;
      }
      
      isProcessingRef.current = true;
      
      try {
        // Detectar rostro con face-api.js
        const faceapi = await import('face-api.js');
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        ).withFaceLandmarks().withFaceDescriptor();
        
        if (detection) {
          const box = detection.detection.box;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          
          // Calcular posición relativa del rostro
          const faceCenterX = (box.x + box.width / 2) / videoWidth;
          const faceCenterY = (box.y + box.height / 2) / videoHeight;
          const faceSize = (box.width * box.height) / (videoWidth * videoHeight);
          
          setFaceBox({ x: box.x, y: box.y, width: box.width, height: box.height });
          
          // Determinar estado del rostro
          let newStatus: FaceStatus = 'perfect';
          let newInstruction = 'Perfecto, mantenga esa posición';
          
          if (faceSize < 0.03) {
            newStatus = 'too_far';
            newInstruction = 'Acérquese más a la cámara';
            speakOnce('tooFar');
          } else if (faceSize > 0.25) {
            newStatus = 'too_close';
            newInstruction = 'Aléjese un poco de la cámara';
            speakOnce('tooClose');
          } else if (Math.abs(faceCenterX - 0.5) > 0.15 || Math.abs(faceCenterY - 0.45) > 0.15) {
            newStatus = 'off_center';
            newInstruction = 'Centre su rostro en la pantalla';
            speakOnce('lookCenter');
          } else {
            speakOnce('perfect');
          }
          
          setFaceStatus(newStatus);
          setInstruction(newInstruction);
          
          // Si el rostro está bien posicionado, intentar reconocer
          if (newStatus === 'perfect' && registeredUsers.length > 0) {
            const descriptor = detection.descriptor;
            const comparisons: Array<{user: RegisteredUser, distance: number}> = [];
            
            for (const user of registeredUsers) {
              try {
                const storedDesc = stringToDescriptor(user.descriptor);
                const distance = euclideanDistance(descriptor, storedDesc);
                comparisons.push({ user, distance });
              } catch (e) {}
            }
            
            comparisons.sort((a, b) => a.distance - b.distance);
            
            if (comparisons.length > 0) {
              const best = comparisons[0];
              const second = comparisons[1];
              const diffWithSecond = second ? second.distance - best.distance : 1;
              
              console.log(`🔍 Match: ${best.user.name} (dist: ${best.distance.toFixed(4)}, diff: ${diffWithSecond.toFixed(4)})`);
              
              // UMBRAL BALANCEADO para auto-detección:
              // - Distancia < 0.52 (similar pero no tan estricto)
              // - Diferencia con segundo > 0.06 (claramente distinguible)
              // - Si solo hay 1 usuario, solo verificar distancia
              const isOnlyUser = comparisons.length === 1;
              const isValidMatch = best.distance < 0.52 && (isOnlyUser || diffWithSecond > 0.06);
              
              if (isValidMatch) {
                clearInterval(interval);
                setRecognizedUser(best.user);
                setStep('recognized');
                speakOnce('success', `Bienvenido, ${best.user.name.split(' ')[0]}`);
                setTimeout(() => doLogin(best.user.license), 2000);
              }
            }
          }
        } else {
          setFaceStatus('no_face');
          setFaceBox(null);
          setInstruction('No detectamos su rostro');
        }
      } catch (e) {
        // Silenciar errores
      }
      
      isProcessingRef.current = false;
    }, 500);
    
    return () => clearInterval(interval);
  };

  const captureManually = async () => {
    if (!videoRef.current || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setStep('verifying');
    setInstruction('Verificando identidad...');
    speakOnce('verifying');
    
    try {
      if (registeredUsers.length === 0) {
        stopCamera();
        setStep('not_registered');
        speakOnce('notRegistered');
        isProcessingRef.current = false;
        return;
      }
      
      const descriptor = await detectFace(videoRef.current);
      
      if (!descriptor) {
        setStep('no_face_detected');
        speakOnce('noFace');
        isProcessingRef.current = false;
        return;
      }
      
      const comparisons: Array<{user: RegisteredUser, distance: number}> = [];
      
      for (const user of registeredUsers) {
        try {
          const storedDesc = stringToDescriptor(user.descriptor);
          const distance = euclideanDistance(descriptor, storedDesc);
          comparisons.push({ user, distance });
        } catch (e) {}
      }
      
      comparisons.sort((a, b) => a.distance - b.distance);
      
      if (comparisons.length === 0) {
        setStep('verification_failed');
        speakOnce('error');
        isProcessingRef.current = false;
        return;
      }
      
      const best = comparisons[0];
      const second = comparisons[1];
      const diffWithSecond = second ? second.distance - best.distance : 1;
      const isOnlyUser = comparisons.length === 1;
      
      console.log(`🔐 Verificación manual:`);
      console.log(`   Mejor: ${best.user.name} (dist: ${best.distance.toFixed(4)})`);
      console.log(`   Segundo: ${second?.user.name || 'N/A'} (dist: ${second?.distance.toFixed(4) || 'N/A'})`);
      console.log(`   Diferencia: ${diffWithSecond.toFixed(4)}`);
      console.log(`   Usuarios en sistema: ${comparisons.length}`);
      
      // SISTEMA DE VERIFICACIÓN INTELIGENTE:
      // Nivel 1: Match perfecto (distancia muy baja)
      // Nivel 2: Match bueno con diferencia clara del segundo
      // Nivel 3: Único usuario en sistema (solo verificar distancia)
      
      const THRESHOLD_PERFECT = 0.48;  // Match muy bueno
      const THRESHOLD_GOOD = 0.55;     // Match aceptable
      const MIN_DIFF = 0.05;           // Diferencia mínima con segundo
      
      let isValidMatch = false;
      let matchLevel = '';
      
      if (best.distance < THRESHOLD_PERFECT) {
        // Match perfecto - alta confianza
        isValidMatch = true;
        matchLevel = 'PERFECTO';
      } else if (best.distance < THRESHOLD_GOOD && (isOnlyUser || diffWithSecond > MIN_DIFF)) {
        // Match bueno con diferencia clara O único usuario
        isValidMatch = true;
        matchLevel = isOnlyUser ? 'UNICO_USUARIO' : 'BUENO';
      } else if (best.distance >= 0.60) {
        // Distancia muy alta - definitivamente no es la persona
        isValidMatch = false;
        matchLevel = 'NO_MATCH';
      }
      
      console.log(`   Resultado: ${matchLevel} (valid: ${isValidMatch})`);
      
      if (isValidMatch) {
        stopCamera();
        setRecognizedUser(best.user);
        setStep('recognized');
        speakOnce('success', `Bienvenido, ${best.user.name.split(' ')[0]}`);
        setTimeout(() => doLogin(best.user.license), 2000);
      } else {
        // NO HAY COINCIDENCIA - Denegar acceso
        stopCamera();
        setStep('not_registered');
        speakOnce('notRegistered');
        console.log(`❌ Acceso denegado: ${matchLevel}`);
      }
      
    } catch (err: any) {
      console.error('Error:', err);
      setStep('verification_failed');
      speakOnce('error');
    }
    
    isProcessingRef.current = false;
  };

  const doLogin = async (userLicense: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license: userLicense }),
      });

      if (response.ok) {
        const data = await response.json();
        login(data.access_token, data.user);
        router.push('/dashboard');
      } else {
        setError('Error al iniciar sesión');
        setStep('manual_login');
      }
    } catch (err) {
      setError('Error de conexión');
      setStep('manual_login');
    }
    setLoading(false);
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license.trim()) return;
    await doLogin(license);
  };

  const retry = () => {
    setRecognizedUser(null);
    setError('');
    setFaceStatus('detecting');
    setFaceBox(null);
    lastVoiceRef.current = '';
    setStep('loading');
    init();
  };

  // Color del borde según estado
  const getBorderColor = () => {
    switch (faceStatus) {
      case 'perfect': return 'border-green-400 shadow-green-400/30';
      case 'too_far': return 'border-yellow-400 shadow-yellow-400/30';
      case 'too_close': return 'border-orange-400 shadow-orange-400/30';
      case 'off_center': return 'border-yellow-400 shadow-yellow-400/30';
      case 'no_face': return 'border-red-400 shadow-red-400/30';
      default: return 'border-cyan-400 shadow-cyan-400/30';
    }
  };

  // ============ PANTALLA DE CARGA ============
  if (step === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
            <Fingerprint className="w-12 h-12 text-cyan-400 animate-pulse" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">SASSC</h1>
        <p className="text-cyan-400 text-sm">{status}</p>
      </div>
    );
  }

  // ============ PANTALLA DE CÁMARA FULLSCREEN ============
  if (step === 'camera') {
    return (
      <div className="fixed inset-0 bg-black">
        {/* Video fullscreen */}
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          autoPlay 
          playsInline 
          muted 
        />
        
        {/* Overlay oscuro en los bordes */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
        
        {/* Header flotante */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">SASSC</h1>
              <p className="text-cyan-400/80 text-xs">Face ID</p>
            </div>
          </div>
          
          {/* Botones superiores */}
          <div className="flex items-center gap-2">
            {/* Toggle voz */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            {/* Botón registrarse */}
            <button
              onClick={() => router.push('/registro-facial')}
              className="h-10 px-4 rounded-full bg-cyan-500/20 backdrop-blur-sm border border-cyan-400/30 flex items-center gap-2 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-sm font-medium">Registrarse</span>
            </button>
          </div>
        </div>
        
        {/* Guía facial central */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-64 h-80 rounded-[50%] border-4 ${getBorderColor()} shadow-[0_0_60px_rgba(0,0,0,0.5)] transition-all duration-300`}>
            {/* Indicadores de esquina */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4 border-inherit rounded-tl-xl" />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4 border-inherit rounded-tr-xl" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4 border-inherit rounded-bl-xl" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4 border-inherit rounded-br-xl" />
          </div>
        </div>
        
        {/* Instrucción central */}
        <div className="absolute left-0 right-0 top-1/2 mt-48 flex justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/10">
            <p className="text-white text-center font-medium">{instruction}</p>
          </div>
        </div>
        
        {/* Panel inferior */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
          {/* Estado de detección */}
          <div className="flex justify-center mb-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              faceStatus === 'perfect' ? 'bg-green-500/20 text-green-400' :
              faceStatus === 'no_face' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                faceStatus === 'perfect' ? 'bg-green-400' :
                faceStatus === 'no_face' ? 'bg-red-400' :
                'bg-yellow-400'
              } animate-pulse`} />
              <span className="text-sm font-medium">
                {faceStatus === 'perfect' ? 'Rostro detectado' :
                 faceStatus === 'no_face' ? 'Sin rostro' :
                 faceStatus === 'too_far' ? 'Muy lejos' :
                 faceStatus === 'too_close' ? 'Muy cerca' :
                 'Ajustando...'}
              </span>
            </div>
          </div>
          
          {/* Botón principal */}
          <button
            onClick={captureManually}
            disabled={faceStatus === 'no_face'}
            className={`w-full h-16 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
              faceStatus === 'perfect' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                : faceStatus === 'no_face'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30'
            }`}
          >
            <Shield className="w-6 h-6" />
            Verificar Identidad
          </button>
          
          {/* Opción secundaria */}
          <button
            onClick={() => { stopCamera(); setStep('manual_login'); }}
            className="w-full mt-3 py-3 text-slate-400 text-sm hover:text-white transition-colors"
          >
            Ingresar con licencia médica
          </button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA DE VERIFICANDO ============
  if (step === 'verifying') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-cyan-500/50">
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              autoPlay 
              playsInline 
              muted 
            />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-cyan-400 animate-ping opacity-30" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Verificando</h2>
        <p className="text-slate-400 mb-8">{instruction}</p>
        
        <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  // ============ PANTALLA DE RECONOCIDO ============
  if (step === 'recognized' && recognizedUser) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2">¡Bienvenido!</h2>
        
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 mt-4 text-center">
          <p className="text-2xl font-semibold text-cyan-400">{recognizedUser.name}</p>
          <p className="text-slate-400 mt-1">{recognizedUser.specialty}</p>
          <p className="text-slate-500 text-sm mt-2 font-mono">{recognizedUser.license}</p>
        </div>
        
        <div className="mt-8 flex items-center gap-2 text-cyan-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Iniciando sesión...</span>
        </div>
      </div>
    );
  }

  // ============ PANTALLA DE NO REGISTRADO ============
  if (step === 'not_registered') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-6">
          <User className="w-12 h-12 text-slate-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">No Registrado</h2>
        <p className="text-slate-400 text-center mb-8 max-w-xs">
          Tu rostro no está en el sistema. Regístrate para acceder.
        </p>
        
        <div className="w-full max-w-xs space-y-3">
          <Button 
            onClick={() => router.push('/registro-facial')} 
            className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Registrarme
          </Button>
          
          <Button 
            variant="outline" 
            onClick={retry} 
            className="w-full h-12 bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Intentar de Nuevo
          </Button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA DE ERROR ============
  if (step === 'verification_failed' || step === 'no_face_detected') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6">
          <XCircle className="w-12 h-12 text-red-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          {step === 'no_face_detected' ? 'Rostro No Detectado' : 'Verificación Fallida'}
        </h2>
        <p className="text-slate-400 text-center mb-8 max-w-xs">
          {step === 'no_face_detected' 
            ? 'Asegúrate de tener buena iluminación y mirar a la cámara.'
            : 'No pudimos verificar tu identidad. Intenta de nuevo.'}
        </p>
        
        <div className="w-full max-w-xs space-y-3">
          <Button 
            onClick={retry} 
            className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Intentar de Nuevo
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => setStep('manual_login')} 
            className="w-full text-slate-400 hover:text-white"
          >
            Ingresar con Licencia
          </Button>
        </div>
      </div>
    );
  }

  // ============ PANTALLA DE LOGIN MANUAL ============
  if (step === 'manual_login') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-6">
          <KeyRound className="w-10 h-10 text-cyan-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-1">Acceso Manual</h2>
        <p className="text-slate-400 text-sm mb-8">Ingrese su licencia médica</p>
        
        <form onSubmit={handleManualLogin} className="w-full max-w-xs space-y-4">
          <Input
            type="text"
            placeholder="Ej: DOC-123456789"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            className="h-14 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 rounded-xl text-center font-mono text-lg"
          />
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl" 
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
          </Button>
        </form>
        
        <Button 
          variant="ghost" 
          onClick={retry} 
          className="mt-6 text-slate-400 hover:text-white"
        >
          ← Volver a Face ID
        </Button>
      </div>
    );
  }

  return null;
}
