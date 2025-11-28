'use client';

import { useState, useEffect } from 'react';
import { Camera, Monitor, Smartphone, Video } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface CameraSelectorProps {
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  disabled?: boolean;
}

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

export function CameraSelector({ 
  selectedDeviceId, 
  onDeviceChange,
  disabled = false 
}: CameraSelectorProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    setLoading(true);
    setError(null);

    try {
      // Primero solicitar permiso de cámara para obtener labels
      await navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          // Detener el stream inmediatamente, solo lo necesitamos para permisos
          stream.getTracks().forEach(track => track.stop());
        });

      // Ahora enumerar dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Cámara ${index + 1}`,
          kind: device.kind,
        }));

      setCameras(videoDevices);

      // Si no hay cámara seleccionada, seleccionar la primera
      if (!selectedDeviceId && videoDevices.length > 0) {
        onDeviceChange(videoDevices[0].deviceId);
      }
    } catch (err: any) {
      console.error('Error loading cameras:', err);
      if (err.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Por favor, permite el acceso a la cámara.');
      } else {
        setError('No se pudieron cargar las cámaras disponibles.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCameraIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('front') || lowerLabel.includes('facetime') || lowerLabel.includes('integrad')) {
      return <Monitor className="w-4 h-4" />;
    }
    if (lowerLabel.includes('back') || lowerLabel.includes('rear')) {
      return <Smartphone className="w-4 h-4" />;
    }
    if (lowerLabel.includes('usb') || lowerLabel.includes('external')) {
      return <Video className="w-4 h-4" />;
    }
    return <Camera className="w-4 h-4" />;
  };

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="camera-select" className="flex items-center gap-2">
        <Camera className="w-4 h-4" />
        Seleccionar Cámara
      </Label>
      <Select 
        value={selectedDeviceId} 
        onValueChange={onDeviceChange}
        disabled={disabled || loading}
      >
        <SelectTrigger id="camera-select" className="w-full">
          <SelectValue placeholder={loading ? "Cargando cámaras..." : "Seleccione una cámara"} />
        </SelectTrigger>
        <SelectContent>
          {cameras.map((camera) => (
            <SelectItem key={camera.deviceId} value={camera.deviceId}>
              <div className="flex items-center gap-2">
                {getCameraIcon(camera.label)}
                <span>{camera.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {cameras.length === 0 && !loading && (
        <p className="text-xs text-gray-500">
          No se detectaron cámaras. Conecta una cámara y recarga la página.
        </p>
      )}
      {cameras.length > 1 && (
        <p className="text-xs text-gray-500">
          {cameras.length} cámaras detectadas
        </p>
      )}
    </div>
  );
}
