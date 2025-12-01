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
  Heart
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

// 5 capturas con instrucciones de ángulo para mejor cobertura
const CAPTURE_ANGLES = [
  { id: 1, instruction: 'Mire al frente', description: 'Mantenga la cabeza recta', angle: 0 },
  { id: 2, instruction: 'Gire a la izquierda', description: 'Levemente', angle: -15 },
  { id: 3, instruction: 'Gire a la derecha', description: 'Levemente', angle: 15 },
  { id: 4, instruction: 'Incline hacia arriba', description: 'Levante la barbilla', angle: 0 },
  { id: 5, instruction: 'Posición final', description: 'Última captura', angle: 0 },
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

  useEffect(() => {
    return () => cleanup();
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
    } catch (err: any) {
      setErrorMsg(err.message);
      setEstado('error');
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
      
      // Ahora necesitamos 5 capturas para mejor cobertura de ángulos
      if (newImages.length >= 5) {
        // Promediar los 5 descriptores para un embedding más robusto
        const avgDescriptor = new Float32Array(128);
        for (let i = 0; i < 128; i++) {
          let sum = 0;
          for (let j = 0; j < newDescriptors.length; j++) {
            sum += newDescriptors[j][i];
          }
          avgDescriptor[i] = sum / newDescriptors.length;
        }
        
        const descriptorStr = descriptorToString(avgDescriptor);
        cleanup();
        // Usar la imagen del frente (primera o última) para AWS backup
        await saveRegistration(descriptorStr, newImages[0]);
      }
    }
  };

  const saveRegistration = async (faceDescriptor: string, faceImage: string) => {
    setEstado('procesando');
    
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
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Error guardando registro');
      setEstado('error');
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-teal-500/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <canvas ref={canvasRef} className="hidden" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 mb-4 shadow-lg shadow-cyan-500/25">
            <Scan className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SASSC</h1>
          <p className="text-cyan-400/80 text-sm font-medium mt-1">Biometric Identity System</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
          
          {/* Estado: Formulario */}
          {estado === 'formulario' && (
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {/* Header */}
              <div className="text-center pb-2">
                <h2 className="text-xl font-semibold text-white">Nuevo Registro</h2>
                <p className="text-slate-400 text-sm mt-1">Complete sus datos para continuar</p>
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
                className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-200"
              >
                <Scan className="w-5 h-5 mr-2" />
                Iniciar Escaneo Facial
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/login')}
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Login
              </Button>
            </form>
          )}

          {/* Estado: Cargando Modelos */}
          {estado === 'cargando_modelos' && (
            <div className="p-10 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
                {/* Spinning ring */}
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                {/* Inner glow */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                  <Fingerprint className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <p className="text-white font-semibold text-lg">Inicializando IA</p>
              <p className="text-slate-400 text-sm mt-2">Cargando modelos biométricos...</p>
              <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-cyan-400 text-xs mt-2 font-mono">{progress}%</p>
            </div>
          )}

          {/* Estado: Capturando */}
          {estado === 'capturando' && (
            <div className="p-5 space-y-4">
              {/* Instrucción de ángulo actual */}
              {capturedImages.length < 5 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-cyan-400 text-xs font-medium uppercase tracking-wider">
                      Paso {capturedImages.length + 1} de 5
                    </span>
                  </div>
                  <p className="font-semibold text-white text-lg">{CAPTURE_ANGLES[capturedImages.length]?.instruction}</p>
                  <p className="text-slate-400 text-sm">{CAPTURE_ANGLES[capturedImages.length]?.description}</p>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      i < capturedImages.length 
                        ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' 
                        : i === capturedImages.length 
                          ? 'bg-cyan-500 animate-pulse' 
                          : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Video Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[4/3]">
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
                  <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-cyan-400/60 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-cyan-400/60 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-cyan-400/60 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-cyan-400/60 rounded-br-lg" />
                  
                  {/* Face oval guide */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-44 h-56 rounded-[50%] border-2 transition-all duration-500 ${
                      faceDetected 
                        ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]' 
                        : 'border-slate-500/50'
                    }`}>
                      {/* Scanning line animation */}
                      {faceDetected && (
                        <div className="absolute inset-0 overflow-hidden rounded-[50%]">
                          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Countdown */}
                  {faceDetected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-slate-900/80 backdrop-blur-sm border border-cyan-500/50 flex items-center justify-center">
                        <span className="text-4xl font-bold text-cyan-400 font-mono">{countdown}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status bar */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900/90 to-transparent">
                  <div className={`rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 ${
                    faceDetected 
                      ? 'bg-cyan-500/20 border border-cyan-500/30' 
                      : 'bg-slate-800/80 border border-slate-700'
                  }`}>
                    {faceDetected ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-sm font-medium text-cyan-400">Rostro detectado</span>
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-400">Buscando rostro...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Captured thumbnails */}
              {capturedImages.length > 0 && (
                <div className="flex justify-center gap-2">
                  {capturedImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img 
                        src={img} 
                        alt={`Captura ${i + 1}`} 
                        className="w-12 h-12 rounded-lg object-cover border-2 border-cyan-500/50"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Estado: Procesando */}
          {estado === 'procesando' && (
            <div className="p-10 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500 animate-spin" />
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                  <Fingerprint className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              <p className="text-white font-semibold text-lg">Procesando Biometría</p>
              <p className="text-slate-400 text-sm mt-2">Encriptando datos faciales...</p>
            </div>
          )}

          {/* Estado: Éxito */}
          {estado === 'exito' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-cyan-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">Registro Exitoso</h2>
              <p className="text-slate-400 mb-6">
                Bienvenido, {formData.firstName} {formData.lastName}
              </p>

              {generatedLicense && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-6">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Licencia de Acceso</p>
                  <p className="text-2xl font-mono font-bold text-cyan-400 tracking-wider">
                    {generatedLicense}
                  </p>
                  <p className="text-slate-500 text-xs mt-3">
                    Guarde esta licencia para acceso manual
                  </p>
                </div>
              )}

              <Button 
                onClick={() => router.push('/login')}
                className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25"
              >
                Continuar al Login
              </Button>
            </div>
          )}

          {/* Estado: Error */}
          {estado === 'error' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
              <p className="text-slate-400 mb-6">{errorMsg}</p>

              <Button 
                onClick={retry} 
                className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-slate-500 text-xs">
            Powered by <span className="text-cyan-400">SASSC</span> Biometric Engine
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Sistema de Salud Colombiano
          </p>
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
