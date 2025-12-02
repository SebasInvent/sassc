'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  ArrowLeft,
  Shield,
  User,
  Briefcase,
  BadgeCheck,
  Sparkles,
  Stethoscope,
  Scan,
  Fingerprint,
  Activity,
  Heart,
  Volume2,
  VolumeX,
  UserPlus,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  loadModels, 
  detectFace,
  detectFaceOnly,
  descriptorToString 
} from '@/lib/faceRecognition';
import { API_URL } from '@/lib/api';

type Estado = 'formulario' | 'cargando_modelos' | 'capturando' | 'procesando' | 'exito' | 'error';

// ============ SISTEMA DE VOZ ============
const VOICE_MESSAGES = {
  welcome: "Bienvenido al registro biométrico. Complete sus datos para continuar.",
  startCapture: "Iniciando captura facial. Posicione su rostro en el centro.",
  lookFront: "Mire directamente al frente.",
  lookLeft: "Gire levemente a la izquierda.",
  lookRight: "Gire levemente a la derecha.",
  lookUp: "Incline la cabeza hacia arriba.",
  finalCapture: "Última captura. Mantenga la posición.",
  processing: "Procesando datos biométricos.",
  success: "Registro completado exitosamente. Bienvenido",
  error: "Ocurrió un error. Por favor intente de nuevo.",
  faceDetected: "Rostro detectado. Capturando en",
  noFace: "No detectamos su rostro. Asegúrese de estar frente a la cámara.",
};

// Función para hablar
const speak = (text: string, enabled: boolean = true) => {
  if (!enabled || typeof window === 'undefined') return;
  
  window.speechSynthesis?.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  const voices = window.speechSynthesis?.getVoices() || [];
  const spanishVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
  if (spanishVoice) utterance.voice = spanishVoice;
  
  window.speechSynthesis?.speak(utterance);
};

// 5 capturas con instrucciones de ángulo para mejor cobertura
const CAPTURE_ANGLES = [
  { id: 1, instruction: 'Mire al frente', description: 'Mantenga la cabeza recta', voiceKey: 'lookFront' as keyof typeof VOICE_MESSAGES },
  { id: 2, instruction: 'Gire a la izquierda', description: 'Levemente', voiceKey: 'lookLeft' as keyof typeof VOICE_MESSAGES },
  { id: 3, instruction: 'Gire a la derecha', description: 'Levemente', voiceKey: 'lookRight' as keyof typeof VOICE_MESSAGES },
  { id: 4, instruction: 'Incline hacia arriba', description: 'Levante la barbilla', voiceKey: 'lookUp' as keyof typeof VOICE_MESSAGES },
  { id: 5, instruction: 'Posición final', description: 'Última captura', voiceKey: 'finalCapture' as keyof typeof VOICE_MESSAGES },
];

const ROLES = [
  { value: 'DOCTOR', label: 'Médico', icon: Stethoscope },
  { value: 'NURSE', label: 'Enfermero/a', icon: Heart },
  { value: 'ADMIN', label: 'Admin', icon: Shield },
  { value: 'PHARMACIST', label: 'Farmacia', icon: Activity },
  { value: 'RECEPTIONIST', label: 'Recepción', icon: User },
  { value: 'SUPER_ADMIN', label: 'Super Admin', icon: Fingerprint },
];

export default function RegistroFacialPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('formulario');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>([]);
  const [generatedLicense, setGeneratedLicense] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const lastVoiceRef = useRef<string>('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    specialty: '',
    role: 'DOCTOR',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Función para hablar sin repetir
  const speakOnce = useCallback((key: keyof typeof VOICE_MESSAGES, customText?: string) => {
    const text = customText || VOICE_MESSAGES[key];
    if (lastVoiceRef.current === text) return;
    lastVoiceRef.current = text;
    speak(text, voiceEnabled);
  }, [voiceEnabled]);

  useEffect(() => {
    return () => {
      cleanup();
      window.speechSynthesis?.cancel();
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName) {
      setErrorMsg('Por favor ingrese su nombre y apellido');
      return;
    }

    setEstado('cargando_modelos');
    setErrorMsg(null);
    setProgress(0);

    try {
      setProgress(30);
      await loadModels();
      setProgress(60);
      await startCamera();
      setProgress(100);
      speakOnce('startCapture');
    } catch (err: any) {
      setErrorMsg(err.message);
      setEstado('error');
      speakOnce('error');
    }
  };

  const startCamera = async () => {
    try {
      cleanup();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user' 
        },
        audio: false
      });
      
      streamRef.current = stream;
      setEstado('capturando');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error accediendo a la cámara');
      setEstado('error');
    }
  };

  useEffect(() => {
    if (estado === 'capturando' && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = async () => {
        try {
          await video.play();
          startFaceDetection();
        } catch (e) {
          console.error('Error play:', e);
        }
      };
    }
  }, [estado]);

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || estado !== 'capturando') return;
      if (video.readyState < 2 || video.paused) return;

      try {
        const detected = await detectFaceOnly(video);
        setFaceDetected(detected);
      } catch (err) {
        console.error('Error detección:', err);
      }
    }, 500);
  };

  useEffect(() => {
    let countdownTimer: NodeJS.Timeout | null = null;
    
    // Ahora capturamos 5 imágenes en lugar de 3
    if (faceDetected && estado === 'capturando' && capturedImages.length < 5) {
      countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownTimer) clearInterval(countdownTimer);
            captureImage();
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
  }, [faceDetected, estado, capturedImages.length]);

  const captureImage = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    // Limitar resolución para móviles
    const maxSize = 480;
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const scale = Math.min(maxSize / videoWidth, maxSize / videoHeight, 1);
    
    canvas.width = Math.round(videoWidth * scale);
    canvas.height = Math.round(videoHeight * scale);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // NO espejamos - capturamos tal cual para que coincida en verificación
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.7);

    const desc = await detectFace(video);
    
    if (desc) {
      const newImages = [...capturedImages, imageBase64];
      const newDescriptors = [...capturedDescriptors, desc];
      setCapturedImages(newImages);
      setCapturedDescriptors(newDescriptors);
      
      console.log(`📸 Captura ${newImages.length}/5 completada`);
      
      // Necesitamos 5 capturas para mejor cobertura
      if (newImages.length >= 5) {
        // ESTRATEGIA: Usar el descriptor de la captura frontal (primera)
        // como base, pero validar consistencia con las demás
        
        // Calcular distancias entre todos los descriptores para validar consistencia
        const distances: number[] = [];
        for (let i = 0; i < newDescriptors.length; i++) {
          for (let j = i + 1; j < newDescriptors.length; j++) {
            let sum = 0;
            for (let k = 0; k < 128; k++) {
              sum += Math.pow(newDescriptors[i][k] - newDescriptors[j][k], 2);
            }
            distances.push(Math.sqrt(sum));
          }
        }
        
        const avgInternalDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        console.log(`📊 Consistencia interna: ${avgInternalDistance.toFixed(4)} (menor es mejor)`);
        
        // Usar el descriptor FRONTAL (primera captura) - es el más confiable para matching
        // El promedio puede diluir características distintivas
        const bestDescriptor = newDescriptors[0];
        
        // También calcular promedio como backup
        const avgDescriptor = new Float32Array(128);
        for (let i = 0; i < 128; i++) {
          let sum = 0;
          for (let j = 0; j < newDescriptors.length; j++) {
            sum += newDescriptors[j][i];
          }
          avgDescriptor[i] = sum / newDescriptors.length;
        }
        
        // Usar el descriptor frontal si la consistencia es buena, sino el promedio
        const finalDescriptor = avgInternalDistance < 0.4 ? bestDescriptor : avgDescriptor;
        console.log(`✅ Usando descriptor: ${avgInternalDistance < 0.4 ? 'FRONTAL' : 'PROMEDIO'}`);
        
        const descriptorStr = descriptorToString(finalDescriptor);
        cleanup();
        await saveRegistration(descriptorStr, newImages[0]);
      }
    }
  };

  const saveRegistration = async (faceDescriptor: string, faceImage: string) => {
    setEstado('procesando');
    speakOnce('processing');
    
    try {
      const response = await fetch(`${API_URL}/auth/register-new-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          specialty: formData.specialty || formData.role,
          role: formData.role,
          faceDescriptor,
          faceImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error guardando registro');
      }

      const data = await response.json();
      setGeneratedLicense(data.user.license);
      setEstado('exito');
      
      // Anunciar éxito con el nombre completo
      const fullName = `${formData.firstName} ${formData.lastName}`;
      speakOnce('success', `${VOICE_MESSAGES.success}, ${fullName}`);
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Error guardando registro');
      setEstado('error');
      speakOnce('error');
    }
  };

  const retry = () => {
    setCapturedImages([]);
    setCapturedDescriptors([]);
    setErrorMsg(null);
    setCountdown(3);
    setEstado('formulario');
  };

  const selectedRole = ROLES.find(r => r.value === formData.role);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-teal-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-r from-cyan-500/3 to-teal-500/3 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <canvas ref={canvasRef} className="hidden" />
      
      {/* Main Container - Desktop: Horizontal Layout, Mobile: Vertical */}
      <div className="w-full max-w-5xl relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl border border-slate-700/40 overflow-hidden shadow-2xl shadow-black/40">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Scan className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-none">SASSC</h1>
                <p className="text-cyan-400/70 text-xs">Biometric Registration</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Voice Toggle */}
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                title={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              
              {/* Back Button */}
              <button
                onClick={() => router.push('/login')}
                className="h-10 px-4 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
            
            {/* Left Panel - Form or Status */}
            <div className="p-6 lg:p-8 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-800/50">
              
              {/* Estado: Formulario */}
              {estado === 'formulario' && (
                <form onSubmit={handleFormSubmit} className="space-y-5 max-w-md mx-auto w-full">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1">Nuevo Registro</h2>
                    <p className="text-slate-400 text-sm">Complete sus datos para continuar con el escaneo facial</p>
                  </div>

                  {/* Nombre y Apellido */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Nombre</label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Juan"
                        className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Apellido</label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Pérez"
                        className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  {/* Selector de Rol */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Rol Profesional</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map((role) => {
                        const Icon = role.icon;
                        const isSelected = formData.role === role.value;
                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                            className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                              isSelected
                                ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                            <span className={`text-xs font-medium ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`}>
                              {role.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Especialidad */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Especialidad</label>
                    <Input
                      value={formData.specialty}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                      placeholder="Medicina General, Cardiología..."
                      className="h-12 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl"
                    />
                  </div>

                  {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-400">{errorMsg}</p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-200 group"
                  >
                    <Scan className="w-5 h-5 mr-2" />
                    Iniciar Escaneo Facial
                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </form>
              )}

              {/* Estado: Cargando Modelos */}
              {estado === 'cargando_modelos' && (
                <div className="text-center max-w-sm mx-auto">
                  <div className="relative w-28 h-28 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                      <Fingerprint className="w-10 h-10 text-cyan-400 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-xl mb-2">Inicializando IA</h3>
                  <p className="text-slate-400 text-sm mb-6">Cargando modelos biométricos...</p>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-cyan-400 text-sm mt-3 font-mono">{progress}%</p>
                </div>
              )}

              {/* Estado: Procesando */}
              {estado === 'procesando' && (
                <div className="text-center max-w-sm mx-auto">
                  <div className="relative w-28 h-28 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500 animate-spin" />
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                      <Fingerprint className="w-10 h-10 text-cyan-400" />
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-xl mb-2">Procesando Biometría</h3>
                  <p className="text-slate-400 text-sm">Encriptando datos faciales de {formData.firstName}...</p>
                </div>
              )}

              {/* Estado: Éxito */}
              {estado === 'exito' && (
                <div className="text-center max-w-sm mx-auto">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  </div>
                  
                  <h2 className="text-3xl font-bold text-white mb-2">¡Registro Exitoso!</h2>
                  <p className="text-slate-400 mb-8">
                    Bienvenido al sistema, <span className="text-cyan-400 font-semibold">{formData.firstName} {formData.lastName}</span>
                  </p>

                  {generatedLicense && (
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 mb-6">
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Su Licencia de Acceso</p>
                      <p className="text-3xl font-mono font-bold text-cyan-400 tracking-widest">
                        {generatedLicense}
                      </p>
                      <p className="text-slate-500 text-xs mt-4">
                        Guarde esta licencia para acceso manual
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={() => router.push('/login')}
                    className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25"
                  >
                    Continuar al Login
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              )}

              {/* Estado: Error */}
              {estado === 'error' && (
                <div className="text-center max-w-sm mx-auto">
                  <div className="w-24 h-24 mx-auto rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6">
                    <XCircle className="w-12 h-12 text-red-400" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
                  <p className="text-slate-400 mb-8">{errorMsg}</p>

                  <Button 
                    onClick={retry} 
                    className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reintentar
                  </Button>
                </div>
              )}

              {/* Estado: Capturando - Info Panel */}
              {estado === 'capturando' && (
                <div className="max-w-sm mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1">Captura Facial</h2>
                    <p className="text-slate-400 text-sm">Registrando a <span className="text-cyan-400">{formData.firstName} {formData.lastName}</span></p>
                  </div>

                  {/* Instrucción actual */}
                  {capturedImages.length < 5 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-cyan-400 text-xs font-medium uppercase tracking-wider">
                          Paso {capturedImages.length + 1} de 5
                        </span>
                      </div>
                      <p className="font-semibold text-white text-xl">{CAPTURE_ANGLES[capturedImages.length]?.instruction}</p>
                      <p className="text-slate-400 text-sm mt-1">{CAPTURE_ANGLES[capturedImages.length]?.description}</p>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="flex justify-center gap-3 mb-6">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          i < capturedImages.length 
                            ? 'bg-cyan-500 shadow-lg shadow-cyan-500/30' 
                            : i === capturedImages.length 
                              ? 'bg-cyan-500/20 border-2 border-cyan-500 animate-pulse' 
                              : 'bg-slate-800 border border-slate-700'
                        }`}
                      >
                        {i < capturedImages.length ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <span className={`text-sm font-bold ${i === capturedImages.length ? 'text-cyan-400' : 'text-slate-500'}`}>
                            {i + 1}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Captured thumbnails */}
                  {capturedImages.length > 0 && (
                    <div className="flex justify-center gap-2">
                      {capturedImages.map((img, i) => (
                        <div key={i} className="relative">
                          <img 
                            src={img} 
                            alt={`Captura ${i + 1}`} 
                            className="w-14 h-14 rounded-xl object-cover border-2 border-cyan-500/50"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Panel - Camera Preview or Illustration */}
            <div className="p-6 lg:p-8 flex items-center justify-center bg-slate-950/50">
              
              {/* Formulario: Ilustración */}
              {estado !== 'capturando' && (
                <div className="text-center">
                  <div className="relative w-64 h-64 mx-auto">
                    {/* Animated rings */}
                    <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-pulse" />
                    <div className="absolute inset-4 rounded-full border border-cyan-500/30" />
                    <div className="absolute inset-8 rounded-full border border-cyan-500/40" />
                    <div className="absolute inset-12 rounded-full bg-gradient-to-br from-cyan-500/10 to-teal-500/10 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <UserPlus className="w-10 h-10 text-cyan-400" />
                      </div>
                    </div>
                    {/* Floating dots */}
                    <div className="absolute top-8 right-8 w-3 h-3 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="absolute bottom-12 left-6 w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="absolute top-1/2 right-4 w-2 h-2 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <p className="text-slate-500 text-sm mt-6">Sistema de registro biométrico</p>
                </div>
              )}

              {/* Capturando: Video */}
              {estado === 'capturando' && (
                <div className="w-full max-w-md">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] shadow-2xl shadow-black/50">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Corner brackets */}
                      <div className="absolute top-4 left-4 w-14 h-14 border-l-3 border-t-3 border-cyan-400/70 rounded-tl-xl" style={{ borderWidth: '3px' }} />
                      <div className="absolute top-4 right-4 w-14 h-14 border-r-3 border-t-3 border-cyan-400/70 rounded-tr-xl" style={{ borderWidth: '3px' }} />
                      <div className="absolute bottom-4 left-4 w-14 h-14 border-l-3 border-b-3 border-cyan-400/70 rounded-bl-xl" style={{ borderWidth: '3px' }} />
                      <div className="absolute bottom-4 right-4 w-14 h-14 border-r-3 border-b-3 border-cyan-400/70 rounded-br-xl" style={{ borderWidth: '3px' }} />
                      
                      {/* Face oval guide */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-48 h-60 rounded-[50%] border-2 transition-all duration-500 ${
                          faceDetected 
                            ? 'border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.3)]' 
                            : 'border-slate-500/50'
                        }`}>
                          {faceDetected && (
                            <div className="absolute inset-0 overflow-hidden rounded-[50%]">
                              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Countdown */}
                      {faceDetected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 h-24 rounded-full bg-black/70 backdrop-blur-sm border-2 border-green-500/50 flex items-center justify-center">
                            <span className="text-5xl font-bold text-green-400 font-mono">{countdown}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                      <div className={`rounded-xl px-5 py-3 flex items-center justify-center gap-3 ${
                        faceDetected 
                          ? 'bg-green-500/20 border border-green-500/40' 
                          : 'bg-slate-800/80 border border-slate-700'
                      }`}>
                        {faceDetected ? (
                          <>
                            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-sm font-semibold text-green-400">Rostro detectado - Capturando...</span>
                          </>
                        ) : (
                          <>
                            <Scan className="w-5 h-5 text-slate-400 animate-pulse" />
                            <span className="text-sm font-medium text-slate-400">Buscando rostro...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between">
            <p className="text-slate-500 text-xs">
              Powered by <span className="text-cyan-400 font-medium">SASSC</span> Biometric Engine
            </p>
            <p className="text-slate-600 text-xs">
              Sistema de Salud Colombiano
            </p>
          </div>
        </div>
      </div>

      {/* CSS for scan animation */}
      <style jsx>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
