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

interface RegisteredUser {
  id: string;
  name: string;
  license: string;
  specialty: string;
  descriptor: string;
}

type Step = 'loading' | 'camera' | 'recognized' | 'not_recognized' | 'manual_login';

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
      const res = await fetch('http://localhost:3001/auth/registered-faces');
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
    setStatus('Procesando...');
    
    try {
      const descriptor = await detectFace(videoRef.current);
      
      if (!descriptor) {
        setStatus('No se detectó rostro. Intente de nuevo.');
        isProcessingRef.current = false;
        return;
      }
      
      if (registeredUsers.length === 0) {
        setStep('not_recognized');
        isProcessingRef.current = false;
        return;
      }
      
      // Comparar con todos los usuarios
      const comparisons: Array<{user: RegisteredUser, distance: number}> = [];
      
      for (const user of registeredUsers) {
        try {
          const storedDesc = stringToDescriptor(user.descriptor);
          const distance = euclideanDistance(descriptor, storedDesc);
          comparisons.push({ user, distance });
          console.log(`   ${user.name}: ${distance.toFixed(4)}`);
        } catch (e) {
          console.error(`Error con ${user.name}:`, e);
        }
      }
      
      comparisons.sort((a, b) => a.distance - b.distance);
      const best = comparisons[0];
      
      console.log(`🏆 Mejor: ${best.user.name} (${best.distance.toFixed(4)})`);
      
      if (best.distance <= 0.6) {
        stopCamera();
        setRecognizedUser(best.user);
        setStep('recognized');
        setTimeout(() => doLogin(best.user.license), 2000);
      } else {
        setStep('not_recognized');
      }
      
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
    
    isProcessingRef.current = false;
  };

  const doLogin = async (userLicense: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/auth/login', {
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
                Verificar Ahora
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

          {/* Recognized */}
          {step === 'recognized' && recognizedUser && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido!</h2>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xl font-semibold text-blue-600">{recognizedUser.name}</p>
                <p className="text-sm text-gray-500">{recognizedUser.specialty}</p>
                <p className="text-xs text-gray-400 mt-1">{recognizedUser.license}</p>
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

          {/* Not Recognized */}
          {step === 'not_recognized' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Rostro No Reconocido</h2>
              <p className="text-gray-500 mb-6">No encontramos su rostro en el sistema</p>
              
              <div className="space-y-2">
                <Button onClick={retry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar de Nuevo
                </Button>
                <Button variant="outline" onClick={() => router.push('/registro-facial')} className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Registrar Mi Rostro
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
