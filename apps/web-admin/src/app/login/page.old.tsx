"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Stethoscope, 
  Loader2, 
  Shield, 
  UserPlus, 
  CheckCircle,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { FaceVerificationReal } from '@/components/biometric/FaceVerificationReal';

type LoginStep = 'loading' | 'face_verification' | 'not_recognized' | 'license' | 'logging_in';

interface RegisteredFaceUser {
  id: string;
  name: string;
  license: string;
  specialty: string;
  descriptor: string;
}

interface IdentifiedUser {
  id: string;
  name: string;
  license: string;
  specialty?: string;
  role: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [license, setLicense] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<LoginStep>('loading');
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredFaceUser[]>([]);
  const [identifiedUser, setIdentifiedUser] = useState<IdentifiedUser | null>(null);

  useEffect(() => {
    loadRegisteredFaces();
  }, []);

  const loadRegisteredFaces = async () => {
    try {
      const response = await fetch('${API_URL}/auth/registered-faces');
      if (response.ok) {
        const data = await response.json();
        console.log(`📋 ${data.count} usuarios con rostro registrado`);
        setRegisteredUsers(data.users);
      }
    } catch (err) {
      console.error('Error cargando rostros:', err);
    }
    setStep('face_verification');
  };

  const handleLicenseLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!license.trim()) return;
    
    setError('');
    setLoading(true);

    try {
      const response = await fetch('${API_URL}/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Licencia no válida');
      }

      const data = await response.json();
      login(data.access_token, data.user);
      router.push('/dashboard');
      
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tu licencia.');
    } finally {
      setLoading(false);
    }
  };

  // Cuando Face ID reconoce a un usuario registrado
  const handleUserIdentified = async (user: any, similarity: number, imageBase64: string) => {
    console.log(`✅ Usuario identificado: ${user.name} (${similarity}%) - Licencia: ${user.license}`);
    
    // Guardar el usuario identificado para mostrar en pantalla
    setIdentifiedUser({
      id: user.id,
      name: user.name,
      license: user.license,
      specialty: user.specialty,
      role: user.role || 'USER'
    });
    
    if (user.license && user.license !== '') {
      // Usuario reconocido - hacer login automático con su licencia
      setStep('logging_in');
      
      try {
        const response = await fetch('${API_URL}/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ license: user.license }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('🎉 Login automático exitoso para:', user.name);
          login(data.access_token, data.user);
          
          // Pequeña pausa para mostrar el mensaje de bienvenida
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          console.error('Error en login automático');
          setLicense(user.license); // Pre-llenar la licencia
          setStep('license');
        }
      } catch (err) {
        console.error('Error de conexión:', err);
        setLicense(user.license);
        setStep('license');
      }
    } else {
      // Rostro detectado pero sin licencia asociada
      setStep('license');
    }
  };

  // Cuando no se reconoce el rostro
  const handleUnknownFace = (imageBase64: string) => {
    console.log('❌ Rostro no reconocido');
    setStep('not_recognized');
  };

  const handleFaceVerificationError = (errorMsg: string) => {
    console.error('❌ Error en verificación facial:', errorMsg);
    setError(errorMsg);
  };

  const goToRegister = () => {
    router.push('/registro-facial');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Stethoscope className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Medicare</h1>
          <p className="text-gray-500 mt-1">Sistema de Información en Salud</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Estado: Cargando */}
          {step === 'loading' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
              <p className="text-gray-500 mt-4">Cargando sistema...</p>
            </div>
          )}

          {/* PASO 1: Verificación Facial */}
          {step === 'face_verification' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">Reconocimiento Facial</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {registeredUsers.length > 0 
                    ? `${registeredUsers.length} usuarios registrados`
                    : 'No hay usuarios registrados'}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <FaceVerificationReal
                threshold={50}
                registeredUsers={registeredUsers}
                onUserIdentified={handleUserIdentified}
                onUnknownFace={handleUnknownFace}
                onError={handleFaceVerificationError}
                message="Posicione su rostro para identificarse"
              />

              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('license')}
                  className="w-full"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Usar Licencia
                </Button>
                <Button 
                  variant="outline"
                  onClick={goToRegister}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Registrarse
                </Button>
              </div>
            </div>
          )}

          {/* Estado: Logging in (Face ID exitoso) */}
          {step === 'logging_in' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-gray-900">¡Bienvenido!</p>
                {identifiedUser && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xl font-semibold text-blue-600">{identifiedUser.name}</p>
                    {identifiedUser.specialty && (
                      <p className="text-sm text-gray-500">{identifiedUser.specialty}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Licencia: {identifiedUser.license}</p>
                  </div>
                )}
                <p className="text-sm text-green-600 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirigiendo al dashboard...
                </p>
              </div>
            </div>
          )}

          {/* Estado: Rostro no reconocido */}
          {step === 'not_recognized' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Rostro No Reconocido</p>
                <p className="text-sm text-gray-500 mt-1">
                  Su rostro no está registrado en el sistema
                </p>
              </div>

              <div className="space-y-3">
                <Button onClick={goToRegister} className="w-full bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Registrar Mi Rostro
                </Button>
                <Button onClick={() => setStep('license')} variant="outline" className="w-full">
                  <KeyRound className="w-4 h-4 mr-2" />
                  Ingresar con Licencia
                </Button>
                <Button onClick={() => setStep('face_verification')} variant="ghost" className="w-full text-gray-500">
                  Reintentar Face ID
                </Button>
              </div>
            </div>
          )}

          {/* Paso: Licencia */}
          {step === 'license' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">Ingreso con Licencia</h2>
                <p className="text-gray-500 text-sm mt-1">Ingrese su licencia médica</p>
              </div>

              <form onSubmit={handleLicenseLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="license" className="text-gray-700 font-medium">
                    Licencia Médica
                  </Label>
                  <Input
                    id="license"
                    type="text"
                    placeholder="Ej: ADM-123456789"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </form>

              <div className="pt-4 border-t">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep('face_verification')}
                  className="w-full text-gray-500"
                >
                  ← Volver a Face ID
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer con botón de registro */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm mb-3">¿No tiene cuenta registrada?</p>
          <Button 
            variant="outline" 
            onClick={goToRegister}
            className="w-full"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Registrar Nueva Cuenta
          </Button>
        </div>
      </div>
    </div>
  );
}
