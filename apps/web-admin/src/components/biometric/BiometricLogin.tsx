'use client';

import { useState } from 'react';
import { Camera, Fingerprint, Scan, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CameraCapture } from './CameraCapture';
import { useBiometricLogin } from '@/hooks/useBiometric';

interface BiometricLoginProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}

export function BiometricLogin({ onSuccess, onError }: BiometricLoginProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [method, setMethod] = useState<'FACIAL' | 'FINGERPRINT' | 'RA08'>('FACIAL');
  const { login, isLoggingIn } = useBiometricLogin();

  const handleFacialLogin = async (imageBase64: string) => {
    try {
      const result = await login({
        method: 'FACIAL',
        faceImageBase64: imageBase64,
      });

      if (result.success && result.user) {
        onSuccess?.(result.user);
      } else if (result.isNotRegistered) {
        // Persona no registrada - el hook ya muestra el toast con el link
        onError?.('No estás registrado en el sistema. Por favor, procede al registro.');
      } else {
        onError?.('No se pudo verificar tu identidad. Intenta de nuevo.');
      }
    } catch (error: any) {
      // El hook ya maneja el toast, solo propagamos el error
      const errorMsg = error.response?.data?.isNotRegistered 
        ? 'No estás registrado en el sistema'
        : (error.message || 'Error en login biométrico');
      onError?.(errorMsg);
    } finally {
      setShowCamera(false);
    }
  };

  const handleFingerprintLogin = async () => {
    // TODO: Implementar captura de huella dactilar
    onError?.('Captura de huella dactilar no implementada aún');
  };

  const handleRA08Login = async () => {
    // TODO: Implementar login con dispositivo RA08
    onError?.('Login con RA08 no implementado aún');
  };

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login Biométrico</CardTitle>
          <CardDescription>
            Selecciona tu método de autenticación preferido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={method} onValueChange={(v) => setMethod(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="FACIAL">
                <Camera className="h-4 w-4 mr-2" />
                Facial
              </TabsTrigger>
              <TabsTrigger value="FINGERPRINT">
                <Fingerprint className="h-4 w-4 mr-2" />
                Huella
              </TabsTrigger>
              <TabsTrigger value="RA08">
                <Scan className="h-4 w-4 mr-2" />
                RA08
              </TabsTrigger>
            </TabsList>

            <TabsContent value="FACIAL" className="space-y-4 mt-4">
              <div className="text-center space-y-4">
                <div className="mx-auto w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
                  <Camera className="h-16 w-16 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Reconocimiento Facial</h3>
                  <p className="text-sm text-muted-foreground">
                    Captura tu rostro para iniciar sesión
                  </p>
                </div>
                <Button
                  onClick={() => setShowCamera(true)}
                  disabled={isLoggingIn}
                  className="w-full"
                  size="lg"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Iniciar Captura
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="FINGERPRINT" className="space-y-4 mt-4">
              <div className="text-center space-y-4">
                <div className="mx-auto w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
                  <Fingerprint className="h-16 w-16 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Huella Dactilar</h3>
                  <p className="text-sm text-muted-foreground">
                    Coloca tu dedo en el lector
                  </p>
                </div>
                <Button
                  onClick={handleFingerprintLogin}
                  disabled={isLoggingIn}
                  className="w-full"
                  size="lg"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-4 w-4 mr-2" />
                      Escanear Huella
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="RA08" className="space-y-4 mt-4">
              <div className="text-center space-y-4">
                <div className="mx-auto w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
                  <Scan className="h-16 w-16 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Dispositivo RA08</h3>
                  <p className="text-sm text-muted-foreground">
                    Acércate al dispositivo de reconocimiento
                  </p>
                </div>
                <Button
                  onClick={handleRA08Login}
                  disabled={isLoggingIn}
                  className="w-full"
                  size="lg"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Esperando...
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      Activar Dispositivo
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showCamera && (
        <CameraCapture
          onCapture={handleFacialLogin}
          onClose={() => setShowCamera(false)}
          title="Login Facial"
          description="Posiciona tu rostro en el centro del marco para autenticarte"
        />
      )}
    </>
  );
}
