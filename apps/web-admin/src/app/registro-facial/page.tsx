'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  UserPlus,
  ArrowLeft,
  Shield,
  User,
  Briefcase,
  BadgeCheck,
  Sparkles,
  Stethoscope
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
  { id: 1, instruction: 'Mire al frente', icon: '😐', description: 'Mantenga la cabeza recta' },
  { id: 2, instruction: 'Gire levemente a la izquierda', icon: '👈', description: 'Solo un poco' },
  { id: 3, instruction: 'Gire levemente a la derecha', icon: '👉', description: 'Solo un poco' },
  { id: 4, instruction: 'Incline hacia arriba', icon: '👆', description: 'Levante la barbilla' },
  { id: 5, instruction: 'Mire al frente nuevamente', icon: '😊', description: 'Última captura' },
];

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', icon: Shield, color: 'bg-purple-600' },
  { value: 'ADMIN', label: 'Administrador', icon: Briefcase, color: 'bg-red-600' },
  { value: 'DOCTOR', label: 'Doctor', icon: Stethoscope, color: 'bg-blue-600' },
  { value: 'NURSE', label: 'Enfermero(a)', icon: User, color: 'bg-green-600' },
  { value: 'PHARMACIST', label: 'Farmacéutico', icon: Sparkles, color: 'bg-orange-600' },
  { value: 'RECEPTIONIST', label: 'Recepcionista', icon: BadgeCheck, color: 'bg-cyan-600' },
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-3">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SASSC</h1>
          <p className="text-gray-500 text-sm">Registro de Usuario</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          
          {/* Estado: Formulario */}
          {estado === 'formulario' && (
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Juan"
                    className="h-11"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellido</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Pérez"
                    className="h-11"
                    required
                  />
                </div>
              </div>

              {/* Selector de Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    const isSelected = formData.role === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                        className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? `border-blue-600 bg-blue-50`
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? role.color : 'bg-gray-100'}`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <span className={`text-xs font-medium ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                          {role.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Especialidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Especialidad (opcional)</label>
                <Input
                  value={formData.specialty}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Medicina General, Cardiología..."
                  className="h-11"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  Se generará una licencia única al completar el registro facial.
                </p>
              </div>

              {errorMsg && (
                <div className="bg-red-50 rounded-xl p-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{errorMsg}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700">
                <Camera className="w-5 h-5 mr-2" />
                Continuar con Captura Facial
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/login')}
                className="w-full text-gray-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Login
              </Button>
            </form>
          )}

          {/* Estado: Cargando Modelos */}
          {estado === 'cargando_modelos' && (
            <div className="p-8 text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div 
                  className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{progress}%</span>
                </div>
              </div>
              <p className="text-gray-900 font-medium">Preparando sistema</p>
              <p className="text-gray-500 text-sm mt-1">Cargando modelos de IA...</p>
            </div>
          )}

          {/* Estado: Capturando */}
          {estado === 'capturando' && (
            <div className="p-6 space-y-4">
              {/* Instrucción de ángulo actual */}
              {capturedImages.length < 5 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{CAPTURE_ANGLES[capturedImages.length]?.icon}</div>
                  <p className="font-semibold text-blue-900">{CAPTURE_ANGLES[capturedImages.length]?.instruction}</p>
                  <p className="text-xs text-blue-600">{CAPTURE_ANGLES[capturedImages.length]?.description}</p>
                </div>
              )}

              {/* Progress - ahora 5 capturas */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Captura {capturedImages.length + 1} de 5</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`w-6 h-1.5 rounded-full ${
                        i < capturedImages.length 
                          ? 'bg-green-500' 
                          : i === capturedImages.length 
                            ? 'bg-blue-500' 
                            : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Video */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Solo visual
                />
                
                {/* Marco facial */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-40 h-52 rounded-full border-4 transition-all duration-300 ${
                    faceDetected 
                      ? 'border-green-500 shadow-lg shadow-green-500/30' 
                      : 'border-white/50'
                  }`} />
                  
                  {/* Countdown */}
                  {faceDetected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">{countdown}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className={`rounded-xl px-4 py-2.5 flex items-center gap-2 ${
                    faceDetected 
                      ? 'bg-green-500 text-white' 
                      : 'bg-amber-500 text-white'
                  }`}>
                    {faceDetected ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Rostro detectado - Capturando en {countdown}...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span className="text-sm font-medium">Posicione su rostro en el círculo</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Miniaturas */}
              {capturedImages.length > 0 && (
                <div className="flex justify-center gap-2">
                  {capturedImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img 
                        src={img} 
                        alt={`Captura ${i + 1}`} 
                        className="w-14 h-14 rounded-xl object-cover border-2 border-green-500"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-green-500 bg-white rounded-full" />
                    </div>
                  ))}
                </div>
              )}

              <Button 
                onClick={captureImage} 
                disabled={!faceDetected}
                variant="outline"
                className="w-full h-11"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capturar Manualmente
              </Button>
            </div>
          )}

          {/* Estado: Procesando */}
          {estado === 'procesando' && (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-gray-900 font-medium">Procesando registro</p>
              <p className="text-gray-500 text-sm mt-1">Guardando datos biométricos...</p>
            </div>
          )}

          {/* Estado: Éxito */}
          {estado === 'exito' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-1">¡Registro Exitoso!</h2>
              <p className="text-gray-500 mb-4">
                Bienvenido, {formData.firstName} {formData.lastName}
              </p>

              {generatedLicense && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-gray-500 text-sm mb-1">Su licencia de acceso</p>
                  <p className="text-2xl font-mono font-bold text-gray-900">
                    {generatedLicense}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    Guarde esta licencia para acceso manual
                  </p>
                </div>
              )}

              <Button 
                onClick={() => router.push('/login')}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700"
              >
                Ir al Login
              </Button>
            </div>
          )}

          {/* Estado: Error */}
          {estado === 'error' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-1">Error</h2>
              <p className="text-gray-500 mb-4">{errorMsg}</p>

              <Button onClick={retry} className="w-full h-11">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-4">
          Software Anticorrupción Sistema Salud Colombiano
        </p>
      </div>
    </div>
  );
}
