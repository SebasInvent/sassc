"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

// Tipos para Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Conversión de palabras a números
const WORD_TO_NUMBER: Record<string, string> = {
  'cero': '0', 'uno': '1', 'una': '1', 'dos': '2', 'tres': '3',
  'cuatro': '4', 'cinco': '5', 'seis': '6', 'siete': '7',
  'ocho': '8', 'nueve': '9', 'diez': '10',
};

// Convertir texto hablado a número de cédula
function parseSpokenNumber(text: string): string {
  let result = text.toLowerCase();
  
  // Reemplazar palabras por números
  Object.entries(WORD_TO_NUMBER).forEach(([word, num]) => {
    result = result.replace(new RegExp(word, 'g'), num);
  });
  
  // Eliminar todo excepto números
  return result.replace(/[^0-9]/g, '');
}

// Parsear fecha hablada
function parseSpokenDate(text: string): string | null {
  const months: Record<string, string> = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
  };
  
  const lower = text.toLowerCase();
  
  // Buscar día
  const dayMatch = lower.match(/(\d{1,2})/);
  const day = dayMatch ? dayMatch[1].padStart(2, '0') : null;
  
  // Buscar mes
  let month: string | null = null;
  for (const [name, num] of Object.entries(months)) {
    if (lower.includes(name)) {
      month = num;
      break;
    }
  }
  
  // Buscar año
  const yearMatch = lower.match(/(\d{4})/);
  const year = yearMatch ? yearMatch[1] : null;
  
  if (day && month && year) {
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

// Detectar confirmación
function isConfirmation(text: string): boolean | null {
  const lower = text.toLowerCase().trim();
  const positives = ['sí', 'si', 'correcto', 'afirmativo', 'exacto', 'así es', 'eso es', 'ok', 'vale'];
  const negatives = ['no', 'incorrecto', 'negativo', 'mal', 'error', 'equivocado'];
  
  if (positives.some(p => lower.includes(p))) return true;
  if (negatives.some(n => lower.includes(n))) return false;
  return null;
}

// Detectar género
function parseGender(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('hombre') || lower.includes('masculino') || lower.includes('varón')) return 'M';
  if (lower.includes('mujer') || lower.includes('femenino')) return 'F';
  if (lower.includes('otro')) return 'O';
  return null;
}

// Detectar comandos especiales
function detectCommand(text: string): string | null {
  const lower = text.toLowerCase().trim();
  if (lower.includes('repetir') || lower.includes('repite')) return 'REPEAT';
  if (lower.includes('escribir') || lower.includes('teclado') || lower.includes('manual')) return 'MANUAL';
  if (lower.includes('atrás') || lower.includes('anterior') || lower.includes('volver')) return 'BACK';
  if (lower.includes('ayuda') || lower.includes('help')) return 'HELP';
  return null;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  // Utilidades de parsing
  parseAsNumber: (text: string) => string;
  parseAsDate: (text: string) => string | null;
  parseAsGender: (text: string) => string | null;
  isConfirmation: (text: string) => boolean | null;
  detectCommand: (text: string) => string | null;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'es-ES',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognitionAPI);
      
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = continuous;
        recognitionRef.current.interimResults = interimResults;
        recognitionRef.current.lang = lang;
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          let interim = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
              setConfidence(result[0].confidence);
            } else {
              interim += result[0].transcript;
            }
          }
          
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            onResult?.(finalTranscript, true);
          }
          
          setInterimTranscript(interim);
          if (interim) {
            onResult?.(interim, false);
          }
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          onError?.(event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
          onEnd?.();
        };
        
        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang, continuous, interimResults, onResult, onError, onEnd]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setInterimTranscript('');
      setConfidence(0);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    confidence,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    // Utilidades
    parseAsNumber: parseSpokenNumber,
    parseAsDate: parseSpokenDate,
    parseAsGender: parseGender,
    isConfirmation,
    detectCommand,
  };
}
