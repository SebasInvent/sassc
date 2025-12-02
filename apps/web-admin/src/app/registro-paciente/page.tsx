"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  CheckCircle, 
  XCircle,
  Camera,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  User,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Droplet,
  Heart,
  Shield,
  Scan,
  RefreshCw
} from 'lucide-react';
import { 
  loadModels, 
  detectFace, 
  descriptorToString 
} from '@/lib/faceRecognition';
import { API_URL } from '@/lib/api';

// ============ SISTEMA DE VOZ ============
const VOICE_MESSAGES = {
  welcome: "Bienvenido al registro de pacientes. Comencemos con sus datos personales.",
  step1: "Ingrese su número de cédula y datos básicos.",
  step2: "Ahora ingrese su información de contacto.",
  step3: "Ingrese su dirección de residencia.",
  step4: "Ahora vamos a registrar su rostro. Posicione su cara en el centro.",
  tooFar: "Acérquese un poco más a la cámara.",
  tooClose: "Aléjese un poco de la cámara.",
  noFace: "No detectamos su rostro. Mire directamente a la cámara.",
  perfect: "Perfecto, mantenga esa posición.",
  capturing: "Capturando imagen.",
  lookLeft: "Ahora gire ligeramente hacia la izquierda.",
  lookRight: "Ahora gire ligeramente hacia la derecha.",
  lookUp: "Mire ligeramente hacia arriba.",
  lookDown: "Mire ligeramente hacia abajo.",
  success: "Registro completado exitosamente. Bienvenido al sistema.",
  error: "Ocurrió un error. Por favor intente de nuevo.",
  validating: "Validando información.",
};

// Función para hablar
const speak = (text: string, enabled: boolean = true) => {
  if (!enabled || typeof window === 'undefined') return;
  window.speechSynthesis?.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  const voices = window.speechSynthesis?.getVoices() || [];
  const spanishVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
  if (spanishVoice) utterance.voice = spanishVoice;
  
  window.speechSynthesis?.speak(utterance);
};

// Tipos de documento
const DOC_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'RC', label: 'Registro Civil' },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const REGIMEN_TYPES = [
  { value: 'CONTRIBUTIVO', label: 'Contributivo' },
  { value: 'SUBSIDIADO', label: 'Subsidiado' },
  { value: 'ESPECIAL', label: 'Especial' },
  { value: 'NO_AFILIADO', label: 'No Afiliado' },
];

type Step = 'loading' | 'form_basic' | 'form_contact' | 'form_address' | 'camera' | 'capturing' | 'processing' | 'success' | 'error';
type FaceStatus = 'no_face' | 'too_far' | 'too_close' | 'off_center' | 'perfect' | 'detecting';

const CAPTURE_ANGLES = [
  { key: 'front', label: 'Mire al frente', instruction: 'Mire directamente a la cámara' },
  { key: 'left', label: 'Gire izquierda', instruction: 'Gire ligeramente hacia la izquierda' },
  { key: 'right', label: 'Gire derecha', instruction: 'Gire ligeramente hacia la derecha' },
  { key: 'up', label: 'Mire arriba', instruction: 'Mire ligeramente hacia arriba' },
  { key: 'down', label: 'Mire abajo', instruction: 'Mire ligeramente hacia abajo' },
];

export default function RegistroPacientePage() {
  const router = useRouter();
  
  // Estado del formulario
  const [step, setStep] = useState<Step>('loading');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState('');
  
  // Datos del paciente
  const [formData, setFormData] = useState({
    docType: 'CC',
    docNumber: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    department: '',
    bloodType: '',
    regimen: 'CONTRIBUTIVO',
    allergies: '',
  });
  
  // Estado de cámara
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('detecting');
  const [faceBox, setFaceBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [captureIndex, setCaptureIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastVoiceRef = useRef<string>('');
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Función para hablar sin repetir
  const speakOnce = useCallback((key: keyof typeof VOICE_MESSAGES | string, customText?: string) => {
    const text = customText || VOICE_MESSAGES[key as keyof typeof VOICE_MESSAGES] || key;
    if (lastVoiceRef.current === text) return;
    
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    voiceTimeoutRef.current = setTimeout(() => {
      lastVoiceRef.current = text;
      speak(text, voiceEnabled);
    }, 500);
  }, [voiceEnabled]);

  useEffect(() => {
    init();
    return () => {
      stopCamera();
      window.speechSynthesis?.cancel();
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, []);

  const init = async () => {
    try {
      await loadModels();
      setStep('form_basic');
      setTimeout(() => speakOnce('welcome'), 500);
    } catch (err) {
      console.error('Error loading models:', err);
      setStep('form_basic');
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      setStep('camera');
      setInstruction('Iniciando cámara...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setTimeout(() => speakOnce('step4'), 500);
      startFaceDetection();
      
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('No se pudo acceder a la cámara');
      setStep('error');
    }
  };

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || step !== 'camera') return;
      
      try {
        const faceapi = await import('face-api.js');
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        ).withFaceLandmarks().withFaceDescriptor();
        
        if (detection) {
          const box = detection.detection.box;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          
          const faceCenterX = (box.x + box.width / 2) / videoWidth;
          const faceCenterY = (box.y + box.height / 2) / videoHeight;
          const faceSize = (box.width * box.height) / (videoWidth * videoHeight);
          
          setFaceBox({ x: box.x, y: box.y, width: box.width, height: box.height });
          
          let newStatus: FaceStatus = 'perfect';
          let newInstruction = CAPTURE_ANGLES[captureIndex]?.instruction || 'Mantenga la posición';
          
          if (faceSize < 0.03) {
            newStatus = 'too_far';
            newInstruction = 'Acérquese más a la cámara';
            speakOnce('tooFar');
          } else if (faceSize > 0.25) {
            newStatus = 'too_close';
            newInstruction = 'Aléjese un poco de la cámara';
            speakOnce('tooClose');
          } else if (Math.abs(faceCenterX - 0.5) > 0.15 || Math.abs(faceCenterY - 0.45) > 0.15) {
            newStatus = 'off_center';
            newInstruction = 'Centre su rostro en la pantalla';
          } else {
            speakOnce('perfect');
          }
          
          setFaceStatus(newStatus);
          setInstruction(newInstruction);
        } else {
          setFaceStatus('no_face');
          setFaceBox(null);
          setInstruction('Posicione su rostro frente a la cámara');
        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    }, 200);
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || faceStatus !== 'perfect') return;
    
    setStep('capturing');
    speakOnce('capturing');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    try {
      const desc = await detectFace(video);
      
      if (desc) {
        const newImages = [...capturedImages, imageBase64];
        const newDescriptors = [...capturedDescriptors, desc];
        setCapturedImages(newImages);
        setCapturedDescriptors(newDescriptors);
        
        if (newImages.length >= 5) {
          // Calcular descriptor final (promedio o frontal)
          const distances: number[] = [];
          for (let i = 0; i < newDescriptors.length; i++) {
            for (let j = i + 1; j < newDescriptors.length; j++) {
              let sum = 0;
              for (let k = 0; k < 128; k++) {
                sum += Math.pow(newDescriptors[i][k] - newDescriptors[j][k], 2);
              }
              distances.push(Math.sqrt(sum));
            }
          }
          
          const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
          const finalDescriptor = avgDistance < 0.4 ? newDescriptors[0] : 
            new Float32Array(128).map((_, i) => 
              newDescriptors.reduce((sum, d) => sum + d[i], 0) / newDescriptors.length
            );
          
          stopCamera();
          await savePatient(descriptorToString(finalDescriptor), newImages[0]);
        } else {
          setCaptureIndex(captureIndex + 1);
          setStep('camera');
          
          const nextAngle = CAPTURE_ANGLES[captureIndex + 1];
          if (nextAngle) {
            speakOnce(nextAngle.instruction);
          }
        }
      } else {
        setStep('camera');
        speakOnce('noFace');
      }
    } catch (err) {
      console.error('Capture error:', err);
      setStep('camera');
    }
  };

  const savePatient = async (descriptor: string, faceImage: string) => {
    setStep('processing');
    setInstruction('Guardando registro...');
    speakOnce('validating');
    
    try {
      const response = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          faceDescriptor: descriptor,
          faceImage: faceImage,
          biometricRegistered: true,
          faceRegisteredAt: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al registrar');
      }
      
      setStep('success');
      speakOnce('success');
      
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Error al guardar el registro');
      setStep('error');
      speakOnce('error');
    }
  };

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step === 'form_basic') {
      if (!formData.docNumber || !formData.firstName || !formData.lastName || !formData.birthDate || !formData.gender) {
        setError('Complete todos los campos obligatorios');
        return;
      }
      setError('');
      setStep('form_contact');
      speakOnce('step2');
    } else if (step === 'form_contact') {
      if (!formData.phone) {
        setError('El teléfono es obligatorio');
        return;
      }
      setError('');
      setStep('form_address');
      speakOnce('step3');
    } else if (step === 'form_address') {
      if (!formData.city || !formData.department) {
        setError('Ciudad y departamento son obligatorios');
        return;
      }
      setError('');
      startCamera();
    }
  };

  const prevStep = () => {
    if (step === 'form_contact') setStep('form_basic');
    else if (step === 'form_address') setStep('form_contact');
    else if (step === 'camera') {
      stopCamera();
      setStep('form_address');
    }
  };

  const retry = () => {
    setCapturedImages([]);
    setCapturedDescriptors([]);
    setCaptureIndex(0);
    setError('');
    startCamera();
  };

  const getBorderColor = () => {
    switch (faceStatus) {
      case 'perfect': return 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]';
      case 'no_face': return 'border-red-400 shadow-[0_0_30px_rgba(248,113,113,0.3)]';
      default: return 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)]';
    }
  };

  // ============ PANTALLA DE CARGA ============
  if (step === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border-2 border-cyan-500/50 flex items-center justify-center mb-6">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        </div>
        <p className="text-slate-400">Preparando sistema...</p>
      </div>
    );
  }

  // ============ FORMULARIO DATOS BÁSICOS ============
  if (step === 'form_basic') {
    return (
      <div className="fixed inset-0 bg-slate-950 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 p-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Registro de Paciente</h1>
                <p className="text-xs text-slate-400">Paso 1 de 4 - Datos Básicos</p>
              </div>
            </div>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i === 1 ? 'bg-cyan-500' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="max-w-lg mx-auto px-4 pb-32 space-y-4">
          {/* Tipo y número de documento */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tipo Doc.</label>
              <select
                value={formData.docType}
                onChange={(e) => updateForm('docType', e.target.value)}
                className="w-full h-12 bg-slate-800 border border-slate-700 rounded-xl text-white px-3 focus:border-cyan-500 focus:outline-none"
              >
                {DOC_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.value}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Número de Documento *</label>
              <Input
                value={formData.docNumber}
                onChange={(e) => updateForm('docNumber', e.target.value)}
                placeholder="1234567890"
                className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
              />
            </div>
          </div>

          {/* Nombres */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nombres *</label>
              <Input
                value={formData.firstName}
                onChange={(e) => updateForm('firstName', e.target.value)}
                placeholder="Juan Carlos"
                className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Apellidos *</label>
              <Input
                value={formData.lastName}
                onChange={(e) => updateForm('lastName', e.target.value)}
                placeholder="Pérez García"
                className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
              />
            </div>
          </div>

          {/* Fecha y género */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fecha de Nacimiento *</label>
              <Input
                type="date"
                value={formData.birthDate}
                onChange={(e) => updateForm('birthDate', e.target.value)}
                className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Género *</label>
              <select
                value={formData.gender}
                onChange={(e) => updateForm('gender', e.target.value)}
                className="w-full h-12 bg-slate-800 border border-slate-700 rounded-xl text-white px-3 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Seleccione...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>
          </div>

          {/* Tipo de sangre y régimen */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tipo de Sangre</label>
              <select
                value={formData.bloodType}
                onChange={(e) => updateForm('bloodType', e.target.value)}
                className="w-full h-12 bg-slate-800 border border-slate-700 rounded-xl text-white px-3 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Seleccione...</option>
                {BLOOD_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Régimen de Salud</label>
              <select
                value={formData.regimen}
                onChange={(e) => updateForm('regimen', e.target.value)}
                className="w-full h-12 bg-slate-800 border border-slate-700 rounded-xl text-white px-3 focus:border-cyan-500 focus:outline-none"
              >
                {REGIMEN_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-sm border-t border-slate-800 p-4">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={nextStep}
              className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl"
            >
              Continuar
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============ FORMULARIO CONTACTO ============
  if (step === 'form_contact') {
    return (
      <div className="fixed inset-0 bg-slate-950 overflow-auto">
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 p-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={prevStep} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Información de Contacto</h1>
                <p className="text-xs text-slate-400">Paso 2 de 4</p>
              </div>
            </div>
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= 2 ? 'bg-cyan-500' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-32 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block flex items-center gap-2">
              <Phone className="w-4 h-4" /> Teléfono *
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateForm('phone', e.target.value)}
              placeholder="3001234567"
              className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block flex items-center gap-2">
              <Mail className="w-4 h-4" /> Correo Electrónico
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => updateForm('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block flex items-center gap-2">
              <Heart className="w-4 h-4" /> Alergias Conocidas
            </label>
            <Input
              value={formData.allergies}
              onChange={(e) => updateForm('allergies', e.target.value)}
              placeholder="Penicilina, mariscos, etc."
              className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-sm border-t border-slate-800 p-4">
          <div className="max-w-lg mx-auto">
            <Button onClick={nextStep} className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl">
              Continuar <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============ FORMULARIO DIRECCIÓN ============
  if (step === 'form_address') {
    return (
      <div className="fixed inset-0 bg-slate-950 overflow-auto">
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 p-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={prevStep} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Dirección de Residencia</h1>
                <p className="text-xs text-slate-400">Paso 3 de 4</p>
              </div>
            </div>
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= 3 ? 'bg-cyan-500' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-32 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Dirección
            </label>
            <Input
              value={formData.address}
              onChange={(e) => updateForm('address', e.target.value)}
              placeholder="Calle 123 # 45-67"
              className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Ciudad *</label>
              <Input
                value={formData.city}
                onChange={(e) => updateForm('city', e.target.value)}
                placeholder="Bogotá"
                className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Departamento *</label>
              <Input
                value={formData.department}
                onChange={(e) => updateForm('department', e.target.value)}
                placeholder="Cundinamarca"
                className="h-12 bg-slate-800 border-slate-700 text-white rounded-xl"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-sm border-t border-slate-800 p-4">
          <div className="max-w-lg mx-auto">
            <Button onClick={nextStep} className="w-full h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl">
              <Camera className="w-5 h-5 mr-2" />
              Continuar a Registro Facial
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============ CÁMARA FULLSCREEN ============
  if (step === 'camera' || step === 'capturing') {
    return (
      <div className="fixed inset-0 bg-black">
        {/* Video fullscreen */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={prevStep} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-white font-bold">Registro Facial</h1>
              <p className="text-white/60 text-sm">Paso 4 de 4</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Indicador de capturas */}
        <div className="absolute top-20 left-0 right-0 flex justify-center">
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            {CAPTURE_ANGLES.map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${
                i < captureIndex ? 'bg-cyan-400' : 
                i === captureIndex ? 'bg-cyan-400 animate-pulse' : 
                'bg-white/30'
              }`} />
            ))}
          </div>
        </div>

        {/* Guía facial central */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-64 h-80 rounded-[50%] border-4 ${getBorderColor()} transition-all duration-300`}>
            <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4 border-inherit rounded-tl-xl" />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4 border-inherit rounded-tr-xl" />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4 border-inherit rounded-bl-xl" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4 border-inherit rounded-br-xl" />
          </div>
        </div>

        {/* Instrucción */}
        <div className="absolute left-0 right-0 top-1/2 mt-48 flex justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/10">
            <p className="text-white text-center font-medium">{instruction}</p>
          </div>
        </div>

        {/* Panel inferior */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
          <div className="flex justify-center mb-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              faceStatus === 'perfect' ? 'bg-green-500/20 text-green-400' :
              faceStatus === 'no_face' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                faceStatus === 'perfect' ? 'bg-green-400' :
                faceStatus === 'no_face' ? 'bg-red-400' :
                'bg-yellow-400'
              } animate-pulse`} />
              <span className="text-sm font-medium">
                {faceStatus === 'perfect' ? 'Rostro detectado' :
                 faceStatus === 'no_face' ? 'Sin rostro' :
                 faceStatus === 'too_far' ? 'Muy lejos' :
                 faceStatus === 'too_close' ? 'Muy cerca' :
                 'Ajustando...'}
              </span>
            </div>
          </div>

          <button
            onClick={captureImage}
            disabled={faceStatus !== 'perfect' || step === 'capturing'}
            className={`w-full h-16 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
              faceStatus === 'perfect' && step !== 'capturing'
                ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {step === 'capturing' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Scan className="w-6 h-6" />
                Capturar ({captureIndex + 1}/5)
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ============ PROCESANDO ============
  if (step === 'processing') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 flex items-center justify-center mb-6">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Procesando</h2>
        <p className="text-slate-400">{instruction}</p>
      </div>
    );
  }

  // ============ ÉXITO ============
  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">¡Registro Exitoso!</h2>
        <p className="text-slate-400 text-center mb-8">
          Bienvenido al sistema, {formData.firstName}
        </p>
        
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 text-center mb-8">
          <p className="text-lg font-semibold text-cyan-400">{formData.firstName} {formData.lastName}</p>
          <p className="text-slate-400 mt-1">{formData.docType}: {formData.docNumber}</p>
        </div>

        <Button
          onClick={() => router.push('/login')}
          className="w-full max-w-xs h-14 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl"
        >
          Ir a Iniciar Sesión
        </Button>
      </div>
    );
  }

  // ============ ERROR ============
  if (step === 'error') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center mb-6">
          <XCircle className="w-12 h-12 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
        <p className="text-slate-400 text-center mb-8 max-w-xs">{error}</p>
        
        <div className="w-full max-w-xs space-y-3">
          <Button onClick={retry} className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Intentar de Nuevo
          </Button>
          <Button variant="ghost" onClick={() => setStep('form_basic')} className="w-full text-slate-400 hover:text-white">
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
