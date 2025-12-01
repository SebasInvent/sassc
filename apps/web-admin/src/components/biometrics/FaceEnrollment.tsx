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
  Stethoscope,
  Eye,
  ScanFace,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  initBiometrics,
  enrollUser,
  detectLiveness,
  type EnrollmentResult,
} from '@/lib/biometrics';

type Estado = 'formulario' | 'cargando' | 'liveness' | 'capturando' | 'procesando' | 'exito' | 'error';

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', icon: Shield, color: 'bg-purple-600' },
  { value: 'ADMIN', label: 'Administrador', icon: Briefcase, color: 'bg-red-600' },
  { value: 'DOCTOR', label: 'Doctor', icon: Stethoscope, color: 'bg-blue-600' },
  { value: 'NURSE', label: 'Enfermero(a)', icon: User, color: 'bg-green-600' },
  { value: 'PHARMACIST', label: 'Farmacéutico', icon: Sparkles, color: 'bg-orange-600' },
  { value: 'RECEPTIONIST', label: 'Recepcionista', icon: BadgeCheck, color: 'bg-cyan-600' },
];

interface LivenessStatus {
  blinkDetected: boolean;
  headMovement: boolean;
  faceDetected: boolean;
  score: number;
}

export default function FaceEnrollment() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('formulario');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedLicense, setGeneratedLicense] = useState<string | null>(null);
  const [livenessStatus, setLivenessStatus] = useState<LivenessStatus>({
    blinkDetected: false,
    headMovement: false,
    faceDetected: false,
    score: 0,
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    specialty: '',
    role: 'DOCTOR',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => cleanup();
  }, []);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName) {
      setErrorMsg('Por favor ingrese su nombre y apellido');
      return;
    }

    setEstado('cargando');
    setErrorMsg(null);
    setProgress(0);

    try {
      // Initialize biometrics
      await initBiometrics((msg, prog) => {
        setStatusMessage(msg);
        setProgress(prog * 0.5);
      });

      // Start camera
      setStatusMessage('Iniciando cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      setProgress(60);
      setEstado('liveness');

    } catch (err: any) {
      setErrorMsg(err.message || 'Error inicializando');
      setEstado('error');
    }
  };

  // Setup video when entering liveness state
  useEffect(() => {
    if (estado === 'liveness' && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = async () => {
        try {
          await video.play();
          startLivenessDetection();
        } catch (e) {
          console.error('Error playing video:', e);
        }
      };
    }
  }, [estado]);

  const startLivenessDetection = () => {
    let blinkCount = 0;
    let maxYaw = 0;

    const detect = async () => {
      if (estado !== 'liveness' || !videoRef.current) return;

      const timestamp = performance.now();
      const data = await detectLiveness(videoRef.current, timestamp);

      if (data) {
        if (data.blinkDetected) blinkCount++;
        maxYaw = Math.max(maxYaw, Math.abs(data.headPose.yaw));

        const newStatus: LivenessStatus = {
          faceDetected: data.landmarksDetected > 400,
          blinkDetected: blinkCount >= 1,
          headMovement: maxYaw > 10,
          score: data.meshQuality,
        };

        setLivenessStatus(newStatus);

        // Check if all liveness requirements are met
        if (newStatus.faceDetected && newStatus.blinkDetected && newStatus.headMovement) {
          // Proceed to enrollment
          proceedToEnrollment();
          return;
        }
      }

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  const proceedToEnrollment = async () => {
    setEstado('capturando');
    setStatusMessage('Capturando rostro...');

    try {
      const result = await enrollUser(
        videoRef.current!,
        formData,
        (msg, prog) => {
          setStatusMessage(msg);
          setProgress(60 + prog * 0.4);
        }
      );

      if (result.success && result.user) {
        setGeneratedLicense(result.user.license);
        setEstado('exito');
      } else {
        setErrorMsg(result.error || 'Error en el registro');
        setEstado('error');
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Error en el registro');
      setEstado('error');
    }
  };

  const skipLiveness = () => {
    proceedToEnrollment();
  };

  const retry = () => {
    cleanup();
    setErrorMsg(null);
    setProgress(0);
    setLivenessStatus({
      blinkDetected: false,
      headMovement: false,
      faceDetected: false,
      score: 0,
    });
    setEstado('formulario');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-3">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SASSC</h1>
          <p className="text-gray-500 text-sm">Registro Biométrico V2</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Estado: Formulario */}
          {estado === 'formulario' && (
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
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
                            ? 'border-blue-600 bg-blue-50'
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Especialidad (opcional)</label>
                <Input
                  value={formData.specialty}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Medicina General, Cardiología..."
                  className="h-11"
                />
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <ScanFace className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Verificación Biométrica V2</p>
                    <p className="text-xs text-gray-600 mt-1">
                      InsightFace ArcFace 512D + Mediapipe Liveness
                    </p>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-50 rounded-xl p-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{errorMsg}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700">
                <Camera className="w-5 h-5 mr-2" />
                Iniciar Registro Facial
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

          {/* Estado: Cargando */}
          {estado === 'cargando' && (
            <div className="p-8 text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div
                  className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{Math.round(progress)}%</span>
                </div>
              </div>
              <p className="text-gray-900 font-medium">{statusMessage || 'Preparando sistema...'}</p>
            </div>
          )}

          {/* Estado: Liveness */}
          {estado === 'liveness' && (
            <div className="p-6 space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-gray-900">Verificación de Liveness</h2>
                <p className="text-sm text-gray-500">Complete las siguientes acciones</p>
              </div>

              {/* Video */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Face guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-40 h-52 rounded-full border-4 transition-all duration-300 ${
                    livenessStatus.faceDetected
                      ? 'border-green-500 shadow-lg shadow-green-500/30'
                      : 'border-white/50'
                  }`} />
                </div>
              </div>

              {/* Liveness checklist */}
              <div className="space-y-2">
                <LivenessCheck
                  label="Rostro detectado"
                  icon={<ScanFace className="w-4 h-4" />}
                  completed={livenessStatus.faceDetected}
                />
                <LivenessCheck
                  label="Parpadeo detectado"
                  icon={<Eye className="w-4 h-4" />}
                  completed={livenessStatus.blinkDetected}
                />
                <LivenessCheck
                  label="Movimiento de cabeza"
                  icon={<RefreshCw className="w-4 h-4" />}
                  completed={livenessStatus.headMovement}
                />
              </div>

              <p className="text-center text-sm text-gray-500">
                Parpadee y mueva ligeramente la cabeza
              </p>

              <Button
                onClick={skipLiveness}
                variant="outline"
                className="w-full"
              >
                Omitir y continuar
              </Button>
            </div>
          )}

          {/* Estado: Capturando */}
          {estado === 'capturando' && (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-gray-900 font-medium">{statusMessage}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
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

              <div className="bg-blue-50 rounded-xl p-3 mb-4">
                <p className="text-sm text-blue-700">
                  ✓ Embedding ArcFace 512D registrado
                </p>
              </div>

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
          Biometric V2 - InsightFace + Mediapipe
        </p>
      </div>
    </div>
  );
}

// Liveness check item component
function LivenessCheck({
  label,
  icon,
  completed,
}: {
  label: string;
  icon: React.ReactNode;
  completed: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
      completed ? 'bg-green-50' : 'bg-gray-50'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
      }`}>
        {completed ? <CheckCircle className="w-4 h-4" /> : icon}
      </div>
      <span className={`text-sm font-medium ${
        completed ? 'text-green-700' : 'text-gray-600'
      }`}>
        {label}
      </span>
      {completed && (
        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
      )}
    </div>
  );
}
