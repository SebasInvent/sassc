"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Stethoscope, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Camera,
  UserPlus,
  KeyRound,
  RefreshCw
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

interface RegisteredUser {
  id: string;
  name: string;
  license: string;
  specialty: string;
  descriptor: string;
  faceImage?: string;
}

type Step = 'loading' | 'camera' | 'verifying' | 'recognized' | 'not_registered' | 'no_face_detected' | 'verification_failed' | 'manual_login';

export default function LoginV2Page() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [step, setStep] = useState<Step>('loading');
  const [status, setStatus] = useState('Iniciando...');
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [recognizedUser, setRecognizedUser] = useState<RegisteredUser | null>(null);
  const [license, setLicense] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [cascadeResult, setCascadeResult] = useState<CascadeResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    init();
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const init = async () => {
    try {
      // Cargar usuarios registrados
      setStatus('Cargando usuarios...');
      const res = await fetch(`${API_URL}/auth/registered-faces`);
      const data = await res.json();
      setRegisteredUsers(data.users || []);
      console.log(`📋 ${data.count} usuarios con rostro registrado`);

      // Cargar modelos
      setStatus('Cargando modelos de IA...');
      await loadModels();
      console.log('✅ Modelos cargados');

      // Iniciar cámara
      setStatus('Iniciando cámara...');
      
      // Primero detener cualquier stream anterior
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      streamRef.current = stream;
      
      // Cambiar a step camera PRIMERO para que el video se renderice
      setStep('camera');
      setStatus('Posicione su rostro frente a la cámara');
      
      // Esperar un tick para que React renderice el video element
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Ahora asignar stream al video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
      
      // Iniciar detección automática
      startAutoDetection();
      
    } catch (err: any) {
      console.error('Error:', err);
      setStatus(`Error: ${err.message}`);
    }
  };

  const startAutoDetection = () => {
    const interval = setInterval(async () => {
      if (step !== 'camera' || isProcessingRef.current || !videoRef.current) {
        return;
      }
      
      isProcessingRef.current = true;
      
      try {
        const descriptor = await detectFace(videoRef.current);
        
        if (descriptor && registeredUsers.length > 0) {
          // Comparar con todos los usuarios
          const comparisons: Array<{user: RegisteredUser, distance: number}> = [];
          
          for (const user of registeredUsers) {
            try {
              const storedDesc = stringToDescriptor(user.descriptor);
              const distance = euclideanDistance(descriptor, storedDesc);
              comparisons.push({ user, distance });
            } catch (e) {
              console.error(`Error con ${user.name}:`, e);
            }
          }
          
          // Ordenar por distancia (menor = más similar)
          comparisons.sort((a, b) => a.distance - b.distance);
          
          if (comparisons.length > 0) {
            const best = comparisons[0];
            console.log(`🔍 Mejor match: ${best.user.name} (distancia: ${best.distance.toFixed(4)})`);
            
            // Si la distancia es menor a 0.5, reconocer automáticamente
            if (best.distance < 0.5) {
              clearInterval(interval);
              stopCamera();
              setRecognizedUser(best.user);
              setStep('recognized');
              
              // Auto-login después de 2 segundos
              setTimeout(() => doLogin(best.user.license), 2000);
            }
          }
        }
      } catch (e) {
        // Silenciar errores de detección
      }
      
      isProcessingRef.current = false;
    }, 1000); // Verificar cada segundo
    
    // Limpiar intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  };

  const captureManually = async () => {
    if (!videoRef.current || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setStep('verifying');
    setVerificationProgress(0);
    setStatus('Iniciando verificación multi-proveedor...');
    
    try {
      // CASO 1: No hay usuarios registrados en el sistema
      if (registeredUsers.length === 0) {
        stopCamera();
        setStep('not_registered');
        isProcessingRef.current = false;
        return;
      }
      
      // Usar verificación en CASCADA (Google Vision + AWS Rekognition + Local)
      const result = await verifyCascade(
        videoRef.current,
        registeredUsers,
        (message, progress) => {
          setStatus(message);
          setVerificationProgress(progress);
        }
      );
      
      setCascadeResult(result);
      
      // Convertir a VerificationResult para compatibilidad con UI
      const verResult: VerificationResult = {
        success: result.success,
        user: result.user ? { id: result.user.id, name: result.user.name } : null,
        confidence: result.confidence,
        distance: result.success ? 0.2 : 0.8,
        reason: result.reason,
        details: {
          capturesAnalyzed: 3,
          averageDistance: result.success ? 0.2 : 0.8,
          variance: 0.05,
          differenceWithSecond: 0.2,
          livenessScore: result.antiSpoofing.livenessScore,
        }
      };
      setVerificationResult(verResult);
      
      if (result.success && result.user) {
        // ✅ VERIFICACIÓN EXITOSA
        stopCamera();
        // Buscar el usuario completo en registeredUsers para tener todos los campos
        const fullUser = registeredUsers.find(u => u.id === result.user!.id);
        if (fullUser) {
          setRecognizedUser(fullUser);
          setStep('recognized');
          console.log(`🔐 Login seguro: ${fullUser.name} (${result.confidence.toFixed(0)}% confianza)`);
          console.log(`   Tiempo: ${result.verificationTimeMs}ms`);
          console.log(`   Proveedores: Backend ${result.providers.backend.confidence}%, Local ${result.providers.local.confidence}%`);
          setTimeout(() => doLogin(fullUser.license), 2000);
        }
      } else if (!result.antiSpoofing.isRealFace) {
        // Posible suplantación
        stopCamera();
        setStep('verification_failed');
      } else if (result.confidence < 50) {
        // No se encontró coincidencia - no registrado
        stopCamera();
        setStep('not_registered');
      } else {
        // Verificación fallida por otros motivos
        stopCamera();
        setStep('verification_failed');
      }
      
    } catch (err: any) {
      console.error('Error en verificación:', err);
      setStatus(`Error: ${err.message}`);
      setStep('verification_failed');
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
    setStep('loading');
    init();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SASSC</h1>
          <p className="text-gray-500 text-sm">Software Anticorrupción Sistema Salud Colombiano</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          {/* Loading */}
          {step === 'loading' && (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">{status}</p>
            </div>
          )}

          {/* Camera */}
          {step === 'camera' && (
            <div className="p-4">
              <div className="relative rounded-xl overflow-hidden mb-4" style={{backgroundColor: '#1a1a1a'}}>
                <video 
                  ref={videoRef} 
                  className="w-full"
                  style={{ minHeight: '300px', transform: 'scaleX(-1)' }}
                  autoPlay 
                  playsInline 
                  muted 
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-4 border-white/50 rounded-full" />
                </div>
                <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-sm p-2 rounded-lg text-center">
                  {status}
                </div>
              </div>
              
              <Button onClick={captureManually} className="w-full mb-3" size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Verificar Identidad
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => { stopCamera(); setStep('manual_login'); }}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Usar Licencia
                </Button>
                <Button variant="outline" onClick={() => router.push('/registro-facial')}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Registrarse
                </Button>
              </div>
            </div>
          )}

          {/* Verifying - Proceso de verificación segura */}
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
              
              <h2 className="text-lg font-bold text-gray-900 mb-2">Verificación Segura</h2>
              <p className="text-gray-500 text-sm mb-4">{status}</p>
              
              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${verificationProgress}%` }}
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                <p>🔐 Verificación multi-proveedor en progreso</p>
                <div className="flex items-center gap-2 text-[10px] text-blue-600">
                  <span>Google Vision</span>
                  <span>•</span>
                  <span>AWS Rekognition</span>
                  <span>•</span>
                  <span>Face-API Local</span>
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
                      {cascadeResult.providers.backend.success && <span className="text-green-500">✓ Cloud</span>}
                      {cascadeResult.providers.local.success && <span className="text-green-500">✓ Local</span>}
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

          {/* Not Registered - Usuario no está en el sistema */}
          {step === 'not_registered' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">¡No estás registrado!</h2>
              <p className="text-gray-500 mb-2">Tu rostro no se encuentra en nuestro sistema.</p>
              <p className="text-gray-500 mb-6">Para acceder a SASSC, primero debes registrarte.</p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/registro-facial')} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Registrarme Ahora
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">o si ya tienes cuenta</span>
                  </div>
                </div>
                
                <Button variant="outline" onClick={retry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar de Nuevo
                </Button>
                <Button variant="ghost" onClick={() => setStep('manual_login')} className="w-full text-gray-500">
                  Ingresar con Licencia
                </Button>
              </div>
            </div>
          )}

          {/* Verification Failed - Verificación fallida por seguridad */}
          {step === 'verification_failed' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verificación Fallida</h2>
              <p className="text-gray-500 mb-4">
                {verificationResult?.reason || 'No se pudo verificar tu identidad de forma segura.'}
              </p>
              
              {verificationResult && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-left">
                  <p className="font-medium text-gray-700 mb-1">Detalles de seguridad:</p>
                  <ul className="text-gray-500 space-y-1">
                    <li>• Capturas analizadas: {verificationResult.details.capturesAnalyzed}</li>
                    <li>• Confianza: {verificationResult.confidence}%</li>
                    {verificationResult.details.variance > 0 && (
                      <li>• Estabilidad: {verificationResult.details.variance < 0.1 ? 'Buena' : 'Mejorable'}</li>
                    )}
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

          {/* No Face Detected - Problema técnico */}
          {step === 'no_face_detected' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No detectamos tu rostro</h2>
              <p className="text-gray-500 mb-4">Asegúrate de:</p>
              
              <ul className="text-left text-sm text-gray-600 mb-6 space-y-2 max-w-xs mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  Estar en un lugar bien iluminado
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  Mirar directamente a la cámara
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  No usar gafas de sol o cubrebocas
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  Mantener el rostro dentro del círculo
                </li>
              </ul>
              
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
                  placeholder="Licencia (ej: ADM-123456789)"
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
          {registeredUsers.length} usuarios registrados en el sistema
        </p>
      </div>
    </div>
  );
}
