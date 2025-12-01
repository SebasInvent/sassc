'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Camera,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  UserPlus,
  KeyRound,
  Stethoscope,
  Shield,
  ScanFace,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  initBiometrics,
  verifyCascade,
  getRegisteredUsers,
  cleanupBiometrics,
  type CascadeResult,
  type RegisteredUser,
} from '@/lib/biometrics';
import { API_URL } from '@/lib/api';

type Step = 'loading' | 'camera' | 'verifying' | 'recognized' | 'not_registered' | 'verification_failed' | 'manual_login';

export default function FaceLogin() {
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('loading');
  const [status, setStatus] = useState('Iniciando...');
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [recognizedUser, setRecognizedUser] = useState<RegisteredUser | null>(null);
  const [cascadeResult, setCascadeResult] = useState<CascadeResult | null>(null);
  const [license, setLicense] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    init();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const init = async () => {
    try {
      // Load registered users
      setStatus('Cargando usuarios...');
      const users = await getRegisteredUsers();
      setRegisteredUsers(users);
      console.log(`📋 ${users.length} usuarios registrados (V2)`);

      // Initialize biometrics
      setStatus('Cargando modelos biométricos...');
      await initBiometrics((msg, prog) => {
        setStatus(msg);
      });

      // Start camera
      setStatus('Iniciando cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      setStep('camera');
      setStatus('Posicione su rostro frente a la cámara');

      // Wait for video element to render
      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }

    } catch (err: any) {
      console.error('Init error:', err);
      setStatus(`Error: ${err.message}`);
    }
  };

  const startVerification = async () => {
    if (isProcessingRef.current || !videoRef.current) return;
    if (registeredUsers.length === 0) {
      setStep('not_registered');
      return;
    }

    isProcessingRef.current = true;
    setStep('verifying');
    setVerificationProgress(0);

    try {
      const result = await verifyCascade(
        videoRef.current,
        registeredUsers,
        (msg, prog) => {
          setStatus(msg);
          setVerificationProgress(prog);
        }
      );

      setCascadeResult(result);

      if (result.success && result.user) {
        setRecognizedUser(result.user);
        setStep('recognized');

        // Auto-login
        setLoading(true);
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ license: result.user.license }),
        });

        if (loginResponse.ok) {
          const data = await loginResponse.json();
          login(data.access_token, data.user);
          cleanup();
          router.push('/dashboard');
        } else {
          setError('Error al iniciar sesión');
          setLoading(false);
        }

      } else {
        setStep('verification_failed');
      }

    } catch (err: any) {
      console.error('Verification error:', err);
      setStep('verification_failed');
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license }),
      });

      if (response.ok) {
        const data = await response.json();
        login(data.access_token, data.user);
        cleanup();
        router.push('/dashboard');
      } else {
        const err = await response.json();
        setError(err.message || 'Licencia inválida');
      }
    } catch (err: any) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    isProcessingRef.current = false;
    setCascadeResult(null);
    setRecognizedUser(null);
    setError('');
    setStep('camera');
    setStatus('Posicione su rostro frente a la cámara');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-3">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SASSC</h1>
          <p className="text-gray-500 text-sm">Sistema Anticorrupción Salud</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* Loading */}
          {step === 'loading' && (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-gray-900 font-medium">{status}</p>
            </div>
          )}

          {/* Camera */}
          {step === 'camera' && (
            <div className="p-6 space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-gray-900">Verificación Facial</h2>
                <p className="text-sm text-gray-500">InsightFace + Mediapipe</p>
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
                  <div className="w-40 h-52 rounded-full border-4 border-white/50" />
                </div>

                {/* Status */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-black/50 backdrop-blur rounded-xl px-4 py-2 text-center">
                    <p className="text-white text-sm">{status}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={startVerification}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              >
                <ScanFace className="w-5 h-5 mr-2" />
                Verificar Identidad
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => { cleanup(); setStep('manual_login'); }}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Usar Licencia
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/registro-facial')}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Registrarse
                </Button>
              </div>
            </div>
          )}

          {/* Verifying */}
          {step === 'verifying' && (
            <div className="p-8 text-center">
              <div className="relative mb-6">
                <video
                  ref={videoRef}
                  className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-blue-500"
                  style={{ transform: 'scaleX(-1)' }}
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                    Verificando...
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-900 mb-2">Verificación en Cascada</h2>
              <p className="text-gray-500 text-sm mb-4">{status}</p>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${verificationProgress}%` }}
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                <p>🔐 Verificación multi-capa en progreso</p>
                <div className="flex items-center gap-2 text-[10px] text-blue-600">
                  <span>Mediapipe</span>
                  <span>•</span>
                  <span>Anti-Spoof</span>
                  <span>•</span>
                  <span>InsightFace</span>
                  <span>•</span>
                  <span>AWS Backup</span>
                </div>
              </div>
            </div>
          )}

          {/* Recognized */}
          {step === 'recognized' && recognizedUser && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Identidad Verificada!</h2>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xl font-semibold text-blue-600">{recognizedUser.name}</p>
                <p className="text-sm text-gray-500">{recognizedUser.specialty}</p>
                <p className="text-xs text-gray-400 mt-1">{recognizedUser.license}</p>
                {cascadeResult && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      🔐 {cascadeResult.confidence.toFixed(0)}% confianza
                    </span>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
                      <span>⏱️ {cascadeResult.verificationTimeMs}ms</span>
                      <span className="text-green-500">✓ ArcFace {cascadeResult.arcfaceScore.toFixed(0)}%</span>
                      {cascadeResult.awsSimilarity !== null && (
                        <span className="text-green-500">✓ AWS {cascadeResult.awsSimilarity.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {loading ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                <p className="text-green-600">Redirigiendo al dashboard...</p>
              )}
            </div>
          )}

          {/* Not Registered */}
          {step === 'not_registered' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Sin usuarios registrados</h2>
              <p className="text-gray-500 mb-6">No hay usuarios con biometría V2 registrada.</p>

              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/registro-facial')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Registrarme Ahora
                </Button>
                <Button variant="outline" onClick={() => setStep('manual_login')} className="w-full">
                  Ingresar con Licencia
                </Button>
              </div>
            </div>
          )}

          {/* Verification Failed */}
          {step === 'verification_failed' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verificación Fallida</h2>
              <p className="text-gray-500 mb-4">
                {cascadeResult?.reason || 'No se pudo verificar tu identidad.'}
              </p>

              {cascadeResult && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-left">
                  <p className="font-medium text-gray-700 mb-2">Detalles:</p>
                  <ul className="text-gray-500 space-y-1">
                    <li>• Decisión: {cascadeResult.decision}</li>
                    <li>• Liveness: {cascadeResult.livenessScore.toFixed(0)}%</li>
                    <li>• Anti-Spoof: {(100 - cascadeResult.spoofScore).toFixed(0)}%</li>
                    <li>• ArcFace: {cascadeResult.arcfaceScore.toFixed(0)}%</li>
                    {cascadeResult.awsSimilarity !== null && (
                      <li>• AWS: {cascadeResult.awsSimilarity.toFixed(0)}%</li>
                    )}
                    <li>• Tiempo: {cascadeResult.verificationTimeMs}ms</li>
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <Button onClick={retry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar de Nuevo
                </Button>
                <Button variant="ghost" onClick={() => setStep('manual_login')} className="w-full">
                  Ingresar con Licencia
                </Button>
              </div>
            </div>
          )}

          {/* Manual Login */}
          {step === 'manual_login' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Ingreso con Licencia</h2>

              <form onSubmit={handleManualLogin} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Licencia (ej: DOC-123456789)"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  className="h-12"
                />

                {error && (
                  <p className="text-red-600 text-sm text-center">{error}</p>
                )}

                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
                </Button>
              </form>

              <Button variant="ghost" onClick={retry} className="w-full mt-4">
                ← Volver a Face ID
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-4">
          {registeredUsers.length} usuarios registrados (V2)
        </p>
      </div>
    </div>
  );
}
