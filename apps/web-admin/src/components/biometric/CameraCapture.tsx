'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onCancel?: () => void;
  isProcessing?: boolean;
}

export function CameraCapture({ onCapture, onCancel, isProcessing = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Detener stream anterior si existe
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar frame del video en el canvas (espejado)
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);

    // Convertir a base64
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    // Enviar solo la parte base64 sin el prefijo data:image/jpeg;base64,
    const base64Data = imageBase64.split(',')[1];
    onCapture(base64Data);
  };

  const handleCancel = () => {
    stopCamera();
    onCancel?.();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Camera className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <div className="flex gap-2">
          <Button onClick={startCamera} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
          {onCancel && (
            <Button onClick={handleCancel} variant="ghost">
              Cancelar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Video container */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900 mb-4" style={{ maxWidth: '400px' }}>
        <video
          ref={videoRef}
          className="w-full"
          style={{ transform: 'scaleX(-1)', minHeight: '300px' }}
          autoPlay
          playsInline
          muted
        />
        
        {/* Overlay con guía circular */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-4 border-white/50 rounded-full" />
        </div>

        {/* Indicador de estado */}
        <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-sm p-2 rounded-lg text-center">
          {isProcessing ? 'Procesando...' : isReady ? 'Posiciona tu rostro en el círculo' : 'Iniciando cámara...'}
        </div>
      </div>

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Botones de acción */}
      <div className="flex gap-2 w-full max-w-xs">
        <Button
          onClick={captureImage}
          disabled={!isReady || isProcessing}
          className="flex-1"
          size="lg"
        >
          <Camera className="w-5 h-5 mr-2" />
          {isProcessing ? 'Verificando...' : 'Capturar'}
        </Button>
        
        {onCancel && (
          <Button onClick={handleCancel} variant="outline" size="lg">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
