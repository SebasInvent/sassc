"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  onDataAvailable?: (blob: Blob) => void;
  onStop?: (blob: Blob, url: string) => void;
  onError?: (error: string) => void;
}

export interface AudioAnalysis {
  pitch: number;        // Frecuencia fundamental promedio
  volume: number;       // Volumen promedio (0-1)
  duration: number;     // Duración en segundos
  waveform: number[];   // Forma de onda para visualización
}

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioBase64: string | null;
  audioAnalysis: AudioAnalysis | null;
  isSupported: boolean;
  // Visualización en tiempo real
  currentVolume: number;
  waveformData: number[];
  // Acciones
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
}

export function useVoiceRecorder(
  options: VoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const {
    mimeType = 'audio/webm;codecs=opus',
    audioBitsPerSecond = 128000,
    onDataAvailable,
    onStop,
    onError,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    setIsSupported(
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      !!window.MediaRecorder
    );
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Analizar audio en tiempo real
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const analyze = () => {
      if (!isRecording) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calcular volumen promedio
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const avg = sum / bufferLength;
      setCurrentVolume(avg / 255);
      
      // Actualizar waveform (últimos 50 valores)
      setWaveformData(prev => {
        const newData = [...prev, avg / 255];
        return newData.slice(-50);
      });
      
      animationRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      cleanup();
      chunksRef.current = [];
      setAudioBlob(null);
      setAudioUrl(null);
      setAudioBase64(null);
      setAudioAnalysis(null);
      setRecordingTime(0);
      setWaveformData([]);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Configurar análisis de audio
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Configurar grabador
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm',
        audioBitsPerSecond,
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          onDataAvailable?.(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Convertir a Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAudioBase64(base64);
        };
        reader.readAsDataURL(blob);
        
        // Análisis básico
        const analysis: AudioAnalysis = {
          pitch: 0, // Requiere análisis más complejo
          volume: currentVolume,
          duration: recordingTime,
          waveform: waveformData,
        };
        setAudioAnalysis(analysis);
        
        onStop?.(blob, url);
        cleanup();
      };

      recorder.onerror = () => {
        onError?.('Error durante la grabación');
        cleanup();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // Chunks cada 100ms
      setIsRecording(true);
      setIsPaused(false);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Iniciar análisis
      analyzeAudio();

    } catch (error: any) {
      console.error('Error starting recording:', error);
      onError?.(error.message || 'No se pudo acceder al micrófono');
    }
  }, [mimeType, audioBitsPerSecond, onDataAvailable, onStop, onError, cleanup, analyzeAudio, currentVolume, recordingTime, waveformData]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  }, [isRecording, isPaused]);

  const resetRecording = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioBase64(null);
    setAudioAnalysis(null);
    setCurrentVolume(0);
    setWaveformData([]);
    chunksRef.current = [];
  }, [cleanup]);

  return {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    audioBase64,
    audioAnalysis,
    isSupported,
    currentVolume,
    waveformData,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
