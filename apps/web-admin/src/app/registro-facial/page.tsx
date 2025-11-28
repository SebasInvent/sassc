'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  AlertCircle,
  Loader2,
  RefreshCw,
  UserPlus,
  ArrowLeft,
  Save
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  loadModels, 
  detectFace,
  detectFaceOnly,
  descriptorToString 
} from '@/lib/faceRecognition';

type Estado = 'formulario' | 'cargando_modelos' | 'capturando' | 'procesando' | 'exito' | 'error';

export default function RegistroFacialPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('formulario');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>([]);
  const [descriptor, setDescriptor] = useState<string | null>(null);
  
  // Roles disponibles
  const ROLES = [
    { value: 'SUPER_ADMIN', label: 'Super Administrador', color: 'bg-purple-500' },
    { value: 'ADMIN', label: 'Administrador', color: 'bg-red-500' },
    { value: 'DOCTOR', label: 'Doctor', color: 'bg-blue-500' },
    { value: 'NURSE', label: 'Enfermero(a)', color: 'bg-green-500' },
    { value: 'PHARMACIST', label: 'Farmacéutico', color: 'bg-orange-500' },
    { value: 'RECEPTIONIST', label: 'Recepcionista', color: 'bg-cyan-500' },
  ];

  // Datos del formulario
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    specialty: '',
    role: 'DOCTOR',
  });
  const [generatedLicense, setGeneratedLicense] = useState<string | null>(null);

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

    try {
      await loadModels();
      await startCamera();
    } catch (err: any) {
      setErrorMsg(err.message);
      setEstado('error');
    }
  };

  const startCamera = async () => {
    try {
      cleanup();

      console.log('📷 Solicitando acceso a cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      
      console.log('✅ Stream obtenido');
      streamRef.current = stream;
      
      // Cambiar estado primero para que el video element se monte
      setEstado('capturando');
      
    } catch (err: any) {
      console.error('Error cámara:', err);
      setErrorMsg(err.message || 'Error accediendo a la cámara');
      setEstado('error');
    }
  };

  // Configurar video cuando el estado cambia a 'capturando'
  useEffect(() => {
    if (estado === 'capturando' && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      
      console.log('🎥 Configurando video...');
      video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;
      
      video.onloadedmetadata = async () => {
        console.log('📐 Video listo:', video.videoWidth, 'x', video.videoHeight);
        try {
          await video.play();
          console.log('▶️ Video reproduciendo');
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
    
    console.log('🔍 Iniciando detección de rostro para registro...');
    
    detectionIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video) {
        console.log('Video ref no disponible');
        return;
      }
      
      if (estado !== 'capturando') return;
      
      if (video.readyState < 2 || video.paused) {
        console.log('Video no listo:', video.readyState);
        return;
      }

      try {
        // Usar detectFaceOnly que es más rápido
        const detected = await detectFaceOnly(video);
        console.log('Detección:', detected);
        setFaceDetected(detected);
      } catch (err) {
        console.error('Error detección:', err);
      }
    }, 600);
  };

  // Auto-captura
  useEffect(() => {
    let countdownTimer: NodeJS.Timeout | null = null;
    
    if (faceDetected && estado === 'capturando' && capturedImages.length < 3) {
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

    // Capturar imagen
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

    // Detectar y guardar descriptor
    const desc = await detectFace(video);
    
    if (desc) {
      const newImages = [...capturedImages, imageBase64];
      const newDescriptors = [...capturedDescriptors, desc];
      setCapturedImages(newImages);
      setCapturedDescriptors(newDescriptors);
      
      console.log(`📸 Captura ${newImages.length}/3 - Descriptor (primeros 5):`, Array.from(desc.slice(0, 5)).map(n => n.toFixed(4)));
      
      // Si es la tercera captura, PROMEDIAR descriptores y enviar al servidor
      if (newImages.length >= 3) {
        // Promediar los 3 descriptores para mayor precisión
        const avgDescriptor = new Float32Array(128);
        for (let i = 0; i < 128; i++) {
          avgDescriptor[i] = (newDescriptors[0][i] + newDescriptors[1][i] + newDescriptors[2][i]) / 3;
        }
        
        console.log('📊 Descriptor PROMEDIADO (primeros 5):', Array.from(avgDescriptor.slice(0, 5)).map(n => n.toFixed(4)));
        
        const descriptorStr = descriptorToString(avgDescriptor);
        setDescriptor(descriptorStr);
        setEstado('procesando');
        cleanup();
        
        // Guardar automáticamente en el servidor
        try {
          console.log('📤 Enviando registro al servidor...');
          const response = await fetch('http://localhost:3001/auth/register-new-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: formData.firstName,
              lastName: formData.lastName,
              specialty: formData.specialty || formData.role || 'General',
              role: formData.role,
              faceDescriptor: descriptorStr,
              faceImage: imageBase64,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error guardando registro');
          }

          const data = await response.json();
          console.log('✅ Registro exitoso:', data);
          setGeneratedLicense(data.user.license);
          setEstado('exito');
          
          // Redirigir después de mostrar la licencia
          setTimeout(() => {
            router.push('/login');
          }, 4000);
          
        } catch (err: any) {
          console.error('❌ Error:', err);
          setErrorMsg(err.message || 'Error guardando registro');
          setEstado('error');
        }
      }
    }
  };

  const handleSaveRegistration = async () => {
    if (!descriptor) {
      setErrorMsg('No se capturó el descriptor facial');
      return;
    }

    try {
      console.log('📤 Enviando registro al servidor...');
      const response = await fetch('http://localhost:3001/auth/register-new-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          specialty: formData.specialty || 'General',
          faceDescriptor: descriptor,
          faceImage: capturedImages[capturedImages.length - 1],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error guardando registro');
      }

      const data = await response.json();
      console.log('✅ Registro exitoso:', data);
      
      // Guardar la licencia generada para mostrarla
      setGeneratedLicense(data.user.license);
      
      // Esperar un momento para que el usuario vea su licencia
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      
    } catch (err: any) {
      console.error('❌ Error:', err);
      setErrorMsg(err.message || 'Error guardando registro');
    }
  };

  const retry = () => {
    setCapturedImages([]);
    setDescriptor(null);
    setErrorMsg(null);
    setCountdown(3);
    setEstado('formulario');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      <Card className="w-full max-w-lg backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Registro Facial
          </CardTitle>
          <CardDescription className="text-white/70">
            Registre su rostro para acceder al sistema Medicare
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Estado: Formulario */}
          {estado === 'formulario' && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-white">Nombre *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Juan"
                    className="bg-white/90"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-white">Apellido *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Pérez"
                    className="bg-white/90"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">Rol en el Sistema *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        formData.role === role.value
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/30 text-white/70 hover:border-white/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${role.color}`} />
                        <span className="text-sm font-medium">{role.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty" className="text-white">Especialidad / Área</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Medicina General, Administración, etc."
                  className="bg-white/90"
                />
              </div>

              <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-400/30">
                <p className="text-sm text-blue-200">
                  📋 Su licencia será generada automáticamente al completar el registro.
                </p>
              </div>

              {errorMsg && (
                <Alert variant="destructive" className="bg-red-500/90 border-red-400/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Continuar con Captura Facial
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-white/70 hover:text-white"
                onClick={() => router.push('/login')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Login
              </Button>
            </form>
          )}

          {/* Estado: Cargando Modelos */}
          {estado === 'cargando_modelos' && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 mx-auto text-blue-400 animate-spin" />
              <p className="text-white/80">Cargando modelos de IA...</p>
            </div>
          )}

          {/* Estado: Capturando */}
          {estado === 'capturando' && (
            <div className="space-y-4">
              <div className="text-center text-white/80 text-sm">
                Captura {capturedImages.length + 1} de 3
              </div>

              {/* Miniaturas de capturas */}
              {capturedImages.length > 0 && (
                <div className="flex justify-center gap-2">
                  {capturedImages.map((img, i) => (
                    <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-green-500">
                      <img src={img} alt={`Captura ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {Array.from({ length: 3 - capturedImages.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-16 h-16 rounded-lg border-2 border-white/30 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white/30" />
                    </div>
                  ))}
                </div>
              )}

              {/* Video */}
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
                    faceDetected ? 'border-green-500 shadow-lg shadow-green-500/50' : 'border-white/50'
                  }`} />
                </div>

                {/* Countdown */}
                {faceDetected && countdown < 3 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-7xl font-bold text-white">{countdown}</span>
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

              <Button onClick={captureImage} disabled={!faceDetected} className="w-full" size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Capturar Ahora
              </Button>
            </div>
          )}

          {/* Estado: Procesando */}
          {estado === 'procesando' && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 mx-auto text-blue-400 animate-spin" />
              <p className="text-white/80">Procesando registro facial...</p>
            </div>
          )}

          {/* Estado: Éxito */}
          {estado === 'exito' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              
              <div>
                <p className="text-xl font-bold text-white">¡Captura Exitosa!</p>
                <p className="text-white/70 mt-2">
                  {formData.firstName} {formData.lastName}, su rostro ha sido capturado.
                </p>
              </div>

              {/* Miniaturas finales */}
              <div className="flex justify-center gap-2">
                {capturedImages.map((img, i) => (
                  <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border-2 border-green-500">
                    <img src={img} alt={`Captura ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              {/* Mostrar licencia generada */}
              {generatedLicense && (
                <div className="bg-green-500/20 rounded-xl p-4 border border-green-400/30">
                  <p className="text-sm text-green-200 mb-2">Su licencia médica es:</p>
                  <p className="text-2xl font-bold text-white font-mono">{generatedLicense}</p>
                  <p className="text-xs text-green-200/70 mt-2">Redirigiendo al login en 3 segundos...</p>
                </div>
              )}

              {!generatedLicense && (
                <div className="space-y-2">
                  <Button onClick={handleSaveRegistration} className="w-full" size="lg">
                    <Save className="w-5 h-5 mr-2" />
                    Guardar y Obtener Licencia
                  </Button>
                </div>
              )}

              {errorMsg && (
                <Alert variant="destructive" className="bg-red-500/90 border-red-400/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Estado: Error */}
          {estado === 'error' && (
            <div className="text-center space-y-4 py-8">
              <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">Error</p>
                <p className="text-white/70 mt-2">{errorMsg}</p>
              </div>
              <Button onClick={retry} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
