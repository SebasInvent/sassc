"use client";

import { useState, useEffect } from 'react';

interface EncounterTimerProps {
  start: string;
  end: string | null;
}

export function EncounterTimer({ start, end }: EncounterTimerProps) {
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (end) {
      // Si el encuentro ha terminado, calcula la duración total
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      const diff = Math.floor((endTime - startTime) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setDuration(`Duración total: ${minutes}m ${seconds}s`);
    } else {
      // Si el encuentro está en progreso, inicia un temporizador
      const interval = setInterval(() => {
        const startTime = new Date(start).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - startTime) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setDuration(`En progreso: ${minutes}m ${seconds.toString().padStart(2, '0')}s`);
      }, 1000);

      return () => clearInterval(interval); // Limpia el intervalo al desmontar
    }
  }, [start, end]);

  return <p className="text-sm text-gray-500 font-mono">{duration}</p>;
}