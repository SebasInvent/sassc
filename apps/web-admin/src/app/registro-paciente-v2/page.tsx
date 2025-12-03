"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, CheckCircle, XCircle, Volume2, VolumeX, Mic, MicOff,
  Camera, User, Phone, MapPin, Calendar, Keyboard, ArrowLeft,
  RefreshCw, HelpCircle
} from 'lucide-react';
import { loadModels, detectFace, descriptorToString } from '@/lib/faceRecognition';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { VoiceVisualizer, RecordingIndicator, LiveTranscript } from '@/components/VoiceVisualizer';
import { API_URL } from '@/lib/api';

// ============ CONFIGURACIÓN ============
const VOICE_MESSAGES = {
  welcome: "Bienvenido al sistema de registro. Voy a guiarte en todo el proceso. Por favor, posiciona tu rostro en el centro de la pantalla.",
  faceDetected: "Perfecto, te veo claramente. Vamos a comenzar con tus datos.",
  askCedula: "¿Cuál es tu número de cédula?",
  confirmCedula: "Tu cédula es {value}. ¿Es correcto? Di sí o no.",
  askName: "¿Cuál es tu nombre completo?",
  confirmName: "Tu nombre es {value}. ¿Correcto?",
  askBirthDate: "¿Cuál es tu fecha de nacimiento? Dime el día, mes y año.",
  confirmBirthDate: "Tu fecha de nacimiento es {value}. ¿Correcto?",
  askGender: "¿Eres hombre o mujer?",
  confirmGender: "Registrado como {value}. ¿Correcto?",
  askPhone: "¿Cuál es tu número de teléfono celular?",
  confirmPhone: "Tu teléfono es {value}. ¿Correcto?",
  askCity: "¿En qué ciudad vives?",
  confirmCity: "Vives en {value}. ¿Correcto?",
  voiceCapture: "Ahora vamos a registrar tu voz para identificarte en el futuro.",
  voicePhrase1: "Por favor repite: Mi nombre es {name} y estoy registrándome.",
  voicePhrase2: "Ahora repite: Uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez.",
  voicePhrase3: "Por último repite: Hoy es un buen día para cuidar mi salud.",
  voiceSuccess: "Tu voz ha sido registrada correctamente.",
  faceCapture: "Excelente. Ahora registraremos tu rostro.",
  faceFront: "Mira directamente a la cámara.",
  faceLeft: "Gira ligeramente hacia tu izquierda.",
  faceRight: "Ahora hacia tu derecha.",
  faceUp: "Mira un poco hacia arriba.",
  faceDown: "Por último, mira hacia abajo.",
  faceSuccess: "Tu rostro ha sido registrado correctamente.",
  complete: "Registro completo. Bienvenido al sistema, {name}.",
  error: "Ocurrió un error. Por favor intenta de nuevo.",
  noFace: "No detectamos tu rostro. Asegúrate de estar frente a la cámara.",
  tooFar: "Acércate un poco más a la cámara.",
  tooClose: "Aléjate un poco de la cámara.",
  didntUnderstand: "No entendí. ¿Puedes repetir?",
  manualInput: "Puedes escribirlo en el teclado que aparece.",
  help: "Di repetir para escuchar de nuevo, escribir para usar el teclado, o atrás para volver.",
};

type RegistrationStep = 
  | 'loading' | 'welcome' | 'cedula' | 'name' | 'birthdate' | 'gender' | 'phone' | 'city'
  | 'voice_intro' | 'voice_1' | 'voice_2' | 'voice_3'
  | 'face_intro' | 'face_front' | 'face_left' | 'face_right' | 'face_up' | 'face_down'
  | 'processing' | 'success' | 'error';

type FaceStatus = 'no_face' | 'too_far' | 'too_close' | 'off_center' | 'perfect' | 'detecting';

interface PatientData {
  docType: string;
  docNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  phone: string;
  city: string;
  department: string;
}

// Función para hablar
const speak = (text: string, enabled: boolean = true): Promise<void> => {
  return new Promise((resolve) => {
    if (!enabled || typeof window === 'undefined') {
      resolve();
      return;
    }
    
    window.speechSynthesis?.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    const voices = window.speechSynthesis?.getVoices() || [];
    const spanishVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
    if (spanishVoice) utterance.voice = spanishVoice;
    
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    
    window.speechSynthesis?.speak(utterance);
  });
};

export default function RegistroPacienteV2Page() {
  const router = useRouter();
  
  // Estado principal
  const [step, setStep] = useState<RegistrationStep>('loading');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputValue, setManualInputValue] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [pendingValue, setPendingValue] = useState('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [error, setError] = useState('');
  
  // Datos del paciente
  const [patientData, setPatientData] = useState<PatientData>({
    docType: 'CC',
    docNumber: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    phone: '',
    city: '',
    department: '',
  });
  
  // Biometría
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('detecting');
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [faceDescriptors, setFaceDescriptors] = useState<Float32Array[]>([]);
  const [voiceSamples, setVoiceSamples] = useState<string[]>([]);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hooks de voz
  const speechRecognition = useSpeechRecognition({
    lang: 'es-ES',
    continuous: false,
    interimResults: true,
  });
  
  const voiceRecorder = useVoiceRecorder({
    onStop: (blob, url) => {
      // Se maneja en el flujo
    },
  });

  // ============ INICIALIZACIÓN ============
  useEffect(() => {
    init();
    return () => {
      cleanup();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const init = async () => {
    try {
      await loadModels();
      await startCamera();
      setStep('welcome');
      await speak(VOICE_MESSAGES.welcome, voiceEnabled);
      startFaceDetection();
    } catch (err) {
      console.error('Init error:', err);
      setStep('error');
      setError('Error al inicializar el sistema');
    }
  };

  const cleanup = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    streamRef.current = stream;
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  };

  // ============ DETECCIÓN FACIAL ============
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      
      try {
        const faceapi = await import('face-api.js');
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        ).withFaceLandmarks();
        
        if (detection) {
          const box = detection.detection.box;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          
          const faceSize = (box.width * box.height) / (videoWidth * videoHeight);
          const faceCenterX = (box.x + box.width / 2) / videoWidth;
          const faceCenterY = (box.y + box.height / 2) / videoHeight;
          
          if (faceSize < 0.03) {
            setFaceStatus('too_far');
          } else if (faceSize > 0.25) {
            setFaceStatus('too_close');
          } else if (Math.abs(faceCenterX - 0.5) > 0.15 || Math.abs(faceCenterY - 0.45) > 0.15) {
            setFaceStatus('off_center');
          } else {
            setFaceStatus('perfect');
          }
        } else {
          setFaceStatus('no_face');
        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    }, 300);
  };

  // ============ FLUJO DE VOZ ============
  const askQuestion = async (questionKey: keyof typeof VOICE_MESSAGES, replacements?: Record<string, string>) => {
    let text = VOICE_MESSAGES[questionKey];
    if (replacements) {
      Object.entries(replacements).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value);
      });
    }
    
    setCurrentQuestion(text);
    setAwaitingConfirmation(false);
    setPendingValue('');
    setShowManualInput(false);
    
    await speak(text, voiceEnabled);
    
    // Iniciar escucha
    setTimeout(() => {
      speechRecognition.startListening();
    }, 500);
  };

  const confirmValue = async (value: string, confirmKey: keyof typeof VOICE_MESSAGES) => {
    setPendingValue(value);
    setAwaitingConfirmation(true);
    
    let text = VOICE_MESSAGES[confirmKey];
    text = text.replace('{value}', value);
    
    setCurrentQuestion(text);
    await speak(text, voiceEnabled);
    
    setTimeout(() => {
      speechRecognition.startListening();
    }, 500);
  };

  // Procesar respuesta del usuario
  const processResponse = useCallback(async (transcript: string) => {
    speechRecognition.stopListening();
    
    // Detectar comandos especiales
    const command = speechRecognition.detectCommand(transcript);
    if (command === 'REPEAT') {
      // Repetir pregunta actual
      await speak(currentQuestion, voiceEnabled);
      setTimeout(() => speechRecognition.startListening(), 500);
      return;
    }
    if (command === 'MANUAL') {
      setShowManualInput(true);
      await speak(VOICE_MESSAGES.manualInput, voiceEnabled);
      return;
    }
    if (command === 'BACK') {
      goBack();
      return;
    }
    if (command === 'HELP') {
      await speak(VOICE_MESSAGES.help, voiceEnabled);
      setTimeout(() => speechRecognition.startListening(), 500);
      return;
    }

    // Si esperamos confirmación
    if (awaitingConfirmation) {
      const isConfirmed = speechRecognition.isConfirmation(transcript);
      if (isConfirmed === true) {
        // Guardar valor y avanzar
        saveValueAndAdvance(pendingValue);
      } else if (isConfirmed === false) {
        // Repetir pregunta
        setAwaitingConfirmation(false);
        await repeatCurrentStep();
      } else {
        await speak(VOICE_MESSAGES.didntUnderstand, voiceEnabled);
        setTimeout(() => speechRecognition.startListening(), 500);
      }
      return;
    }

    // Procesar según el paso actual
    switch (step) {
      case 'cedula':
        const cedula = speechRecognition.parseAsNumber(transcript);
        if (cedula.length >= 6) {
          await confirmValue(cedula, 'confirmCedula');
        } else {
          await speak(VOICE_MESSAGES.didntUnderstand, voiceEnabled);
          setTimeout(() => speechRecognition.startListening(), 500);
        }
        break;
        
      case 'name':
        if (transcript.trim().length > 2) {
          await confirmValue(transcript.trim(), 'confirmName');
        } else {
          await speak(VOICE_MESSAGES.didntUnderstand, voiceEnabled);
          setTimeout(() => speechRecognition.startListening(), 500);
        }
        break;
        
      case 'birthdate':
        const date = speechRecognition.parseAsDate(transcript);
        if (date) {
          const formatted = new Date(date).toLocaleDateString('es-ES');
          await confirmValue(formatted, 'confirmBirthDate');
        } else {
          await speak(VOICE_MESSAGES.didntUnderstand, voiceEnabled);
          setTimeout(() => speechRecognition.startListening(), 500);
        }
        break;
        
      case 'gender':
        const gender = speechRecognition.parseAsGender(transcript);
        if (gender) {
          const genderText = gender === 'M' ? 'masculino' : gender === 'F' ? 'femenino' : 'otro';
          await confirmValue(genderText, 'confirmGender');
        } else {
          await speak(VOICE_MESSAGES.didntUnderstand, voiceEnabled);
          setTimeout(() => speechRecognition.startListening(), 500);
        }
        break;
        
      case 'phone':
        const phone = speechRecognition.parseAsNumber(transcript);
        if (phone.length >= 7) {
          await confirmValue(phone, 'confirmPhone');
        } else {
          await speak(VOICE_MESSAGES.didntUnderstand, voiceEnabled);
          setTimeout(() => speechRecognition.startListening(), 500);
        }
        break;
        
      case 'city':
        if (transcript.trim().length > 2) {
          await confirmValue(transcript.trim(), 'confirmCity');
        } else {
          await speak(VOICE_MESSAGES.didntUnderstand, voiceEnabled);
          setTimeout(() => speechRecognition.startListening(), 500);
        }
        break;
    }
  }, [step, awaitingConfirmation, pendingValue, currentQuestion, voiceEnabled, speechRecognition]);

  // Guardar valor y avanzar
  const saveValueAndAdvance = async (value: string) => {
    switch (step) {
      case 'cedula':
        setPatientData(prev => ({ ...prev, docNumber: value }));
        setStep('name');
        await askQuestion('askName');
        break;
        
      case 'name':
        const nameParts = value.split(' ');
        const firstName = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
        const lastName = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');
        setPatientData(prev => ({ ...prev, firstName, lastName: lastName || firstName }));
        setStep('birthdate');
        await askQuestion('askBirthDate');
        break;
        
      case 'birthdate':
        // Convertir fecha formateada a ISO
        const parts = value.split('/');
        const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : '';
        setPatientData(prev => ({ ...prev, birthDate: isoDate || value }));
        setStep('gender');
        await askQuestion('askGender');
        break;
        
      case 'gender':
        const genderCode = value === 'masculino' ? 'M' : value === 'femenino' ? 'F' : 'O';
        setPatientData(prev => ({ ...prev, gender: genderCode }));
        setStep('phone');
        await askQuestion('askPhone');
        break;
        
      case 'phone':
        setPatientData(prev => ({ ...prev, phone: value }));
        setStep('city');
        await askQuestion('askCity');
        break;
        
      case 'city':
        setPatientData(prev => ({ ...prev, city: value, department: 'Colombia' }));
        setStep('voice_intro');
        await startVoiceCapture();
        break;
    }
  };

  const repeatCurrentStep = async () => {
    switch (step) {
      case 'cedula': await askQuestion('askCedula'); break;
      case 'name': await askQuestion('askName'); break;
      case 'birthdate': await askQuestion('askBirthDate'); break;
      case 'gender': await askQuestion('askGender'); break;
      case 'phone': await askQuestion('askPhone'); break;
      case 'city': await askQuestion('askCity'); break;
    }
  };

  const goBack = async () => {
    switch (step) {
      case 'name': setStep('cedula'); await askQuestion('askCedula'); break;
      case 'birthdate': setStep('name'); await askQuestion('askName'); break;
      case 'gender': setStep('birthdate'); await askQuestion('askBirthDate'); break;
      case 'phone': setStep('gender'); await askQuestion('askGender'); break;
      case 'city': setStep('phone'); await askQuestion('askPhone'); break;
    }
  };

  // ============ CAPTURA DE VOZ ============
  const startVoiceCapture = async () => {
    await speak(VOICE_MESSAGES.voiceCapture, voiceEnabled);
    setStep('voice_1');
    await speak(VOICE_MESSAGES.voicePhrase1.replace('{name}', patientData.firstName), voiceEnabled);
    
    // Iniciar grabación
    await voiceRecorder.startRecording();
  };

  const captureVoiceSample = async () => {
    voiceRecorder.stopRecording();
    
    // Esperar a que se procese
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (voiceRecorder.audioBase64) {
      setVoiceSamples(prev => [...prev, voiceRecorder.audioBase64!]);
    }
    
    voiceRecorder.resetRecording();
    
    // Siguiente frase
    if (step === 'voice_1') {
      setStep('voice_2');
      await speak(VOICE_MESSAGES.voicePhrase2, voiceEnabled);
      await voiceRecorder.startRecording();
    } else if (step === 'voice_2') {
      setStep('voice_3');
      await speak(VOICE_MESSAGES.voicePhrase3, voiceEnabled);
      await voiceRecorder.startRecording();
    } else if (step === 'voice_3') {
      await speak(VOICE_MESSAGES.voiceSuccess, voiceEnabled);
      setStep('face_intro');
      await startFaceCapture();
    }
  };

  // ============ CAPTURA FACIAL ============
  const startFaceCapture = async () => {
    await speak(VOICE_MESSAGES.faceCapture, voiceEnabled);
    setStep('face_front');
    await speak(VOICE_MESSAGES.faceFront, voiceEnabled);
  };

  const captureFaceImage = async () => {
    if (!videoRef.current || !canvasRef.current || faceStatus !== 'perfect') return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    // Obtener descriptor
    const descriptor = await detectFace(video);
    
    if (descriptor) {
      setFaceImages(prev => [...prev, imageBase64]);
      setFaceDescriptors(prev => [...prev, descriptor]);
      
      // Siguiente ángulo
      switch (step) {
        case 'face_front':
          setStep('face_left');
          await speak(VOICE_MESSAGES.faceLeft, voiceEnabled);
          break;
        case 'face_left':
          setStep('face_right');
          await speak(VOICE_MESSAGES.faceRight, voiceEnabled);
          break;
        case 'face_right':
          setStep('face_up');
          await speak(VOICE_MESSAGES.faceUp, voiceEnabled);
          break;
        case 'face_up':
          setStep('face_down');
          await speak(VOICE_MESSAGES.faceDown, voiceEnabled);
          break;
        case 'face_down':
          await speak(VOICE_MESSAGES.faceSuccess, voiceEnabled);
          await savePatient();
          break;
      }
    } else {
      await speak(VOICE_MESSAGES.noFace, voiceEnabled);
    }
  };

  // ============ GUARDAR PACIENTE ============
  const savePatient = async () => {
    setStep('processing');
    
    try {
      // Calcular descriptor promedio
      const avgDescriptor = new Float32Array(128);
      faceDescriptors.forEach(desc => {
        for (let i = 0; i < 128; i++) {
          avgDescriptor[i] += desc[i] / faceDescriptors.length;
        }
      });
      
      const response = await fetch(`${API_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...patientData,
          biometricRegistered: true,
          faceRegisteredAt: new Date().toISOString(),
          // Biometría
          biometric: {
            faceDescriptor128: descriptorToString(avgDescriptor),
            faceImage1: faceImages[0],
            faceImage2: faceImages[1],
            faceImage3: faceImages[2],
            faceImage4: faceImages[3],
            faceImage5: faceImages[4],
            voiceSample1: voiceSamples[0],
            voiceSample2: voiceSamples[1],
            voiceSample3: voiceSamples[2],
            registrationMethod: 'VOICE',
          },
        }),
      });
      
      if (!response.ok) throw new Error('Error al guardar');
      
      setStep('success');
      await speak(VOICE_MESSAGES.complete.replace('{name}', patientData.firstName), voiceEnabled);
      
    } catch (err) {
      console.error('Save error:', err);
      setStep('error');
      setError('Error al guardar el registro');
      await speak(VOICE_MESSAGES.error, voiceEnabled);
    }
  };

  // ============ EFECTOS ============
  // Cuando el rostro está perfecto en welcome, avanzar
  useEffect(() => {
    if (step === 'welcome' && faceStatus === 'perfect') {
      const timer = setTimeout(async () => {
        await speak(VOICE_MESSAGES.faceDetected, voiceEnabled);
        setStep('cedula');
        await askQuestion('askCedula');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, faceStatus, voiceEnabled]);

  // Procesar transcripción cuando termina
  useEffect(() => {
    if (speechRecognition.transcript && !speechRecognition.isListening) {
      processResponse(speechRecognition.transcript);
      speechRecognition.resetTranscript();
    }
  }, [speechRecognition.transcript, speechRecognition.isListening, processResponse]);

  // Manejar input manual
  const handleManualSubmit = async () => {
    if (!manualInputValue.trim()) return;
    
    setShowManualInput(false);
    await processResponse(manualInputValue);
    setManualInputValue('');
  };

  // ============ RENDER ============
  const getBorderColor = () => {
    switch (faceStatus) {
      case 'perfect': return 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.5)]';
      case 'no_face': return 'border-red-400 shadow-[0_0_40px_rgba(248,113,113,0.3)]';
      default: return 'border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.3)]';
    }
  };

  const getStepProgress = () => {
    const steps: RegistrationStep[] = ['cedula', 'name', 'birthdate', 'gender', 'phone', 'city', 'voice_1', 'voice_2', 'voice_3', 'face_front', 'face_left', 'face_right', 'face_up', 'face_down'];
    const index = steps.indexOf(step);
    return index >= 0 ? ((index + 1) / steps.length) * 100 : 0;
  };

  // Loading
  if (step === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mb-4" />
        <p className="text-slate-400">Preparando sistema...</p>
      </div>
    );
  }

  // Success
  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">¡Registro Exitoso!</h2>
        <p className="text-slate-400 text-center mb-8">
          Bienvenido al sistema, {patientData.firstName}
        </p>
        
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 text-center mb-8 max-w-sm w-full">
          <p className="text-lg font-semibold text-cyan-400">{patientData.firstName} {patientData.lastName}</p>
          <p className="text-slate-400 mt-1">{patientData.docType}: {patientData.docNumber}</p>
          <div className="flex justify-center gap-4 mt-4 text-sm text-slate-500">
            <span>✓ Rostro</span>
            <span>✓ Voz</span>
            <span>✓ Datos</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/login')}
          className="w-full max-w-sm h-14 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl"
        >
          Ir a Iniciar Sesión
        </button>
      </div>
    );
  }

  // Error
  if (step === 'error') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center mb-6">
          <XCircle className="w-12 h-12 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
        <p className="text-slate-400 text-center mb-8">{error}</p>
        
        <button
          onClick={() => window.location.reload()}
          className="w-full max-w-sm h-14 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700"
        >
          <RefreshCw className="w-5 h-5 inline mr-2" />
          Intentar de Nuevo
        </button>
      </div>
    );
  }

  // Obtener color de la barra LED basado en estado del rostro
  const getLedColor = () => {
    if (faceStatus === 'perfect') return 'led-green';
    if (faceStatus === 'no_face') return 'led-red';
    return 'led-white'; // Detectando/procesando
  };

  // Main UI
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* CSS para la barra LED */}
      <style jsx>{`
        @keyframes led-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes led-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .led-bar {
          height: 12px;
          border-radius: 6px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 30px currentColor, 0 0 60px currentColor, 0 0 90px currentColor;
          animation: led-pulse 2s ease-in-out infinite;
        }
        .led-bar::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: led-scan 2s ease-in-out infinite;
        }
        .led-green {
          background: linear-gradient(90deg, #00ff00, #22ff22, #00ff00);
          color: #00ff00;
        }
        .led-red {
          background: linear-gradient(90deg, #ff0000, #ff2222, #ff0000);
          color: #ff0000;
        }
        .led-white {
          background: linear-gradient(90deg, #ffffff, #aaffff, #ffffff);
          color: #ffffff;
        }
        .face-guide {
          border: 3px solid rgba(255,255,255,0.6);
          box-shadow: 0 0 20px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.1);
        }
        .face-guide.perfect {
          border-color: #22c55e;
          box-shadow: 0 0 30px rgba(34,197,94,0.5), inset 0 0 30px rgba(34,197,94,0.2);
        }
        .face-guide.error {
          border-color: #ef4444;
          box-shadow: 0 0 30px rgba(239,68,68,0.5), inset 0 0 30px rgba(239,68,68,0.2);
        }
      `}</style>

      {/* Video fullscreen - SIN overlay oscuro */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        autoPlay
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* === BARRA LED SUPERIOR === */}
      <div className="absolute top-0 left-0 right-0 p-3 z-50">
        <div className={`led-bar ${getLedColor()}`} />
      </div>

      {/* Header con info */}
      <div className="absolute top-6 left-0 right-0 px-4 pt-2 flex items-center justify-between z-40">
        <div className="flex items-center gap-2 text-white/80 text-xs">
          <span className="font-mono">v2.0.0</span>
        </div>
        <div className="text-white/80 text-xs font-mono">
          {new Date().toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="p-2 rounded-full bg-black/30 text-white/80"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mensaje de estado superior */}
      <div className="absolute top-16 left-0 right-0 text-center z-40">
        <p className="text-white text-lg font-medium drop-shadow-lg">
          {faceStatus === 'no_face' ? 'Detectando, por favor espere ...' :
           faceStatus === 'perfect' ? currentQuestion || 'Rostro detectado' :
           'Ajustando posición ...'}
        </p>
      </div>

      {/* === GUÍA FACIAL CIRCULAR === */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <div 
          className={`w-72 h-72 rounded-full face-guide transition-all duration-500 ${
            faceStatus === 'perfect' ? 'perfect' : 
            faceStatus === 'no_face' ? 'error' : ''
          }`}
        >
          {/* Puntos de landmarks simulados */}
          {faceStatus === 'perfect' && (
            <>
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full" />
              <div className="absolute top-1/3 left-8 w-2 h-2 bg-blue-400 rounded-full" />
              <div className="absolute top-1/3 right-8 w-2 h-2 bg-blue-400 rounded-full" />
              <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full" />
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full" />
            </>
          )}
        </div>
      </div>

      {/* === PANEL INFERIOR === */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        {/* Resultado de identificación (cuando hay rostro perfecto) */}
        {faceStatus === 'perfect' && patientData.firstName && (
          <div className="mx-4 mb-2 bg-black/60 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Registro en progreso</p>
              <p className="text-white/70">{patientData.firstName} {patientData.lastName}</p>
            </div>
          </div>
        )}

        {/* Visualizador de voz */}
        {(speechRecognition.isListening || voiceRecorder.isRecording) && (
          <div className="mx-4 mb-2">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-4">
              {voiceRecorder.isRecording ? (
                <div className="flex flex-col items-center gap-2">
                  <RecordingIndicator isRecording={true} duration={voiceRecorder.recordingTime} />
                  <VoiceVisualizer
                    waveformData={voiceRecorder.waveformData}
                    isRecording={voiceRecorder.isRecording}
                    currentVolume={voiceRecorder.currentVolume}
                    style="bars"
                  />
                </div>
              ) : (
                <LiveTranscript
                  transcript={speechRecognition.transcript}
                  interimTranscript={speechRecognition.interimTranscript}
                  isListening={speechRecognition.isListening}
                />
              )}
            </div>
          </div>
        )}

        {/* Input manual */}
        {showManualInput && (
          <div className="mx-4 mb-2 flex gap-2">
            <input
              type="text"
              value={manualInputValue}
              onChange={(e) => setManualInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              placeholder="Escribe tu respuesta..."
              className="flex-1 h-14 bg-black/60 backdrop-blur-sm border border-white/20 rounded-xl px-4 text-white placeholder:text-white/50 focus:border-green-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleManualSubmit}
              className="h-14 px-6 bg-green-500 text-white font-semibold rounded-xl"
            >
              OK
            </button>
          </div>
        )}

        {/* Botones de acción */}
        {step.startsWith('voice_') && (
          <div className="mx-4 mb-4">
            <button
              onClick={captureVoiceSample}
              disabled={!voiceRecorder.isRecording}
              className={`w-full h-14 rounded-xl font-semibold flex items-center justify-center gap-3 ${
                voiceRecorder.isRecording
                  ? 'bg-red-500 text-white'
                  : 'bg-white/20 text-white/50'
              }`}
            >
              <Mic className="w-5 h-5" />
              {voiceRecorder.isRecording ? 'Detener Grabación' : 'Preparando...'}
            </button>
          </div>
        )}

        {step.startsWith('face_') && (
          <div className="mx-4 mb-4">
            <button
              onClick={captureFaceImage}
              disabled={faceStatus !== 'perfect'}
              className={`w-full h-14 rounded-xl font-semibold flex items-center justify-center gap-3 ${
                faceStatus === 'perfect'
                  ? 'bg-green-500 text-white'
                  : 'bg-white/20 text-white/50'
              }`}
            >
              <Camera className="w-5 h-5" />
              Capturar ({faceImages.length + 1}/5)
            </button>
          </div>
        )}

        {/* Barra de información inferior */}
        <div className="bg-black/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-sassc.png" alt="SASSC" className="h-8 w-auto opacity-80" onError={(e) => e.currentTarget.style.display = 'none'} />
            <div className="text-xs text-white/60">
              <p className="font-semibold text-white/80">SASSC Medicare</p>
              <p>Sistema de Registro Biométrico</p>
            </div>
          </div>
          <div className="text-right text-xs text-white/60">
            <p className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${faceStatus === 'perfect' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
              {faceStatus === 'perfect' ? 'Conectado' : 'Detectando'}
            </p>
            <p className="font-mono text-white/40">v2.0.0</p>
          </div>
        </div>
      </div>

      {/* Botón de teclado flotante */}
      <button
        onClick={() => setShowManualInput(!showManualInput)}
        className="absolute bottom-24 right-4 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white z-50"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    </div>
  );
}
