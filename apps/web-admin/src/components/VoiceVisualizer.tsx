"use client";

import { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  waveformData: number[];
  isRecording: boolean;
  currentVolume: number;
  className?: string;
  barColor?: string;
  backgroundColor?: string;
  style?: 'bars' | 'wave' | 'circle';
}

export function VoiceVisualizer({
  waveformData,
  isRecording,
  currentVolume,
  className = '',
  barColor = '#22d3ee', // cyan-400
  backgroundColor = 'rgba(0,0,0,0.3)',
  style = 'bars',
}: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Limpiar canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (style === 'bars') {
      drawBars(ctx, width, height, waveformData, barColor, isRecording);
    } else if (style === 'wave') {
      drawWave(ctx, width, height, waveformData, barColor, isRecording);
    } else if (style === 'circle') {
      drawCircle(ctx, width, height, currentVolume, barColor, isRecording);
    }
  }, [waveformData, isRecording, currentVolume, barColor, backgroundColor, style]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className={`rounded-lg ${className}`}
    />
  );
}

// Visualización de barras
function drawBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: number[],
  color: string,
  isActive: boolean
) {
  const barCount = 30;
  const barWidth = width / barCount - 2;
  const gap = 2;

  // Si no hay datos, mostrar barras mínimas animadas
  const displayData = data.length > 0 ? data.slice(-barCount) : 
    Array(barCount).fill(0).map(() => isActive ? Math.random() * 0.1 : 0.02);

  // Rellenar si hay menos datos
  while (displayData.length < barCount) {
    displayData.unshift(0.02);
  }

  displayData.forEach((value, i) => {
    const barHeight = Math.max(4, value * height * 0.9);
    const x = i * (barWidth + gap);
    const y = (height - barHeight) / 2;

    // Gradiente para cada barra
    const gradient = ctx.createLinearGradient(x, y + barHeight, x, y);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, adjustColor(color, 30));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 2);
    ctx.fill();
  });
}

// Visualización de onda
function drawWave(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: number[],
  color: string,
  isActive: boolean
) {
  const displayData = data.length > 0 ? data : 
    Array(50).fill(0).map(() => isActive ? Math.random() * 0.1 : 0.02);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  const sliceWidth = width / displayData.length;
  let x = 0;

  displayData.forEach((value, i) => {
    const y = (1 - value) * height / 2 + height / 4;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    x += sliceWidth;
  });

  ctx.stroke();

  // Línea espejo
  ctx.strokeStyle = adjustColor(color, -30);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  x = 0;

  displayData.forEach((value, i) => {
    const y = height - ((1 - value) * height / 2 + height / 4);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    x += sliceWidth;
  });

  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Visualización circular
function drawCircle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  volume: number,
  color: string,
  isActive: boolean
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) / 4;
  const maxRadius = Math.min(width, height) / 2 - 5;
  
  const radius = baseRadius + (volume * (maxRadius - baseRadius));

  // Círculo exterior (glow)
  if (isActive) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = adjustColor(color, -50);
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Círculo principal
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, radius
  );
  gradient.addColorStop(0, adjustColor(color, 50));
  gradient.addColorStop(1, color);
  
  ctx.fillStyle = gradient;
  ctx.fill();

  // Círculo interior
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fill();
}

// Ajustar brillo del color
function adjustColor(color: string, amount: number): string {
  // Convertir hex a RGB
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  
  return `rgb(${r}, ${g}, ${b})`;
}

// Componente de indicador de grabación
export function RecordingIndicator({ 
  isRecording, 
  duration 
}: { 
  isRecording: boolean; 
  duration: number;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${
      isRecording ? 'bg-red-500/20' : 'bg-slate-800/50'
    }`}>
      <div className={`w-3 h-3 rounded-full ${
        isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'
      }`} />
      <span className={`font-mono text-sm ${
        isRecording ? 'text-red-400' : 'text-slate-400'
      }`}>
        {isRecording ? 'GRABANDO' : 'LISTO'}
      </span>
      <span className="font-mono text-sm text-white">
        {formatTime(duration)}
      </span>
    </div>
  );
}

// Componente de transcripción en tiempo real
export function LiveTranscript({
  transcript,
  interimTranscript,
  isListening,
}: {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
}) {
  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 min-h-[60px]">
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 mt-2 rounded-full ${
          isListening ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'
        }`} />
        <div className="flex-1">
          {transcript || interimTranscript ? (
            <p className="text-white">
              {transcript}
              <span className="text-cyan-400/70">{interimTranscript}</span>
            </p>
          ) : (
            <p className="text-slate-500 italic">
              {isListening ? 'Escuchando...' : 'Di algo para comenzar'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
