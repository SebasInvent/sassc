"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ScanFace, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { loadModels, detectFace, euclideanDistance, stringToDescriptor } from '@/lib/faceRecognition';
import { API_URL } from '@/lib/api';

interface FirmaBiometricaProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (firma: any) => void;
  titulo: string;
  descripcion: string;
  monto?: number;
  entidadTipo: string;
  entidadId: string;
  tipoAccion: string;
}

type Estado = 'loading' | 'ready' | 'scanning' | 'success' | 'error';

export function FirmaBiometrica({
  open,
  onClose,
  onSuccess,
  titulo,
  descripcion,
  monto,
  entidadTipo,
  entidadId,
  tipoAccion,
}: FirmaBiometricaProps) {
  const { token, user } = useAuth();
  const [estado, setEstado] = useState<Estado>('loading');
  const [mensaje, setMensaje] = useState('Iniciando cámara...');
  const [confianza, setConfianza] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);

  // Cargar modelos y cámara
  useEffect(() => {
    if (!open) return;

    const init = async () => {
      try {
        setEstado('loading');
        setMensaje('Cargando modelos de reconocimiento...');
        
        await loadModels();
        
        setMensaje('Iniciando cámara...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        setEstado('ready');
        setMensaje('Mire a la cámara para firmar');
        
        // Iniciar escaneo automático
        startScanning();
      } catch (error) {
        console.error('Error inicializando:', error);
        setEstado('error');
        setMensaje('Error al iniciar la cámara');
      }
    };

    init();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [open]);

  const startScanning = useCallback(async () => {
    if (!videoRef.current || isProcessingRef.current) return;

    const scanLoop = async () => {
      if (!open || !videoRef.current || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setEstado('scanning');
      setMensaje('Verificando identidad...');

      try {
        // Detectar rostro - detectFace retorna Float32Array directamente
        const descriptor = await detectFace(videoRef.current);
        
        if (descriptor) {
          // Obtener descriptor del usuario actual
          const practitionerRes = await fetch(
            `${API_URL}/auth/registered-faces`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (practitionerRes.ok) {
            const practitioners = await practitionerRes.json();
            const currentUser = practitioners.find((p: any) => p.id === user?.id);
            
            if (currentUser?.descriptor) {
              const storedDescriptor = stringToDescriptor(currentUser.descriptor);
              const distance = euclideanDistance(descriptor, storedDescriptor);
              const similarity = Math.max(0, Math.min(100, ((1.2 - distance) / 1.2) * 100));
              
              setConfianza(Math.round(similarity));
              
              if (distance <= 0.5) {
                // Firma exitosa
                setEstado('success');
                setMensaje('Identidad verificada');
                
                // Crear firma en el backend
                const firmaRes = await fetch(`${API_URL}/firma-biometrica`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    practitionerId: user?.id,
                    tipoAccion,
                    entidadTipo,
                    entidadId,
                    confianza: Math.round(similarity),
                  }),
                });

                if (firmaRes.ok) {
                  const firma = await firmaRes.json();
                  toast.success('Firma biométrica registrada');
                  
                  setTimeout(() => {
                    onSuccess(firma);
                  }, 1500);
                } else {
                  throw new Error('Error al registrar firma');
                }
                
                return; // Detener el loop
              }
            }
          }
        }
      } catch (error) {
        console.error('Error en escaneo:', error);
      }

      isProcessingRef.current = false;
      
      // Continuar escaneando
      if (open && estado !== 'success') {
        setTimeout(scanLoop, 500);
      }
    };

    scanLoop();
  }, [open, token, user, tipoAccion, entidadTipo, entidadId, onSuccess]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            {titulo}
          </DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Monto si aplica */}
          {monto && (
            <div className="p-4 bg-emerald-50 rounded-xl text-center">
              <p className="text-sm text-emerald-600">Monto a aprobar</p>
              <p className="text-2xl font-bold text-emerald-900">{formatCurrency(monto)}</p>
            </div>
          )}

          {/* Video de cámara */}
          <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Overlay de estado */}
            <div className="absolute inset-0 flex items-center justify-center">
              {estado === 'loading' && (
                <div className="text-center text-white">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-2" />
                  <p>{mensaje}</p>
                </div>
              )}
              
              {estado === 'scanning' && (
                <div className="absolute inset-0 border-4 border-blue-500 animate-pulse rounded-xl" />
              )}
              
              {estado === 'success' && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  </div>
                  <p className="text-white font-semibold">{mensaje}</p>
                  <p className="text-emerald-400">Confianza: {confianza}%</p>
                </div>
              )}
              
              {estado === 'error' && (
                <div className="text-center text-white">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                  <p>{mensaje}</p>
                </div>
              )}
            </div>

            {/* Marco de escaneo */}
            {(estado === 'ready' || estado === 'scanning') && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/50 rounded-full" />
                <ScanFace className="absolute h-8 w-8 text-white/70" />
              </div>
            )}
          </div>

          {/* Información del firmante */}
          <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ScanFace className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">Firmante autorizado</p>
            </div>
          </div>

          {/* Advertencia */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-amber-800 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>
              Esta firma biométrica quedará registrada como evidencia de su autorización.
              Solo firme si está seguro de aprobar esta acción.
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            {estado === 'error' && (
              <Button className="flex-1" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
