"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  loadModels, 
  detectFace, 
  euclideanDistance,
  stringToDescriptor 
} from '@/lib/faceRecognition';

export default function TestFacePage() {
  const [status, setStatus] = useState('Iniciando...');
  const [results, setResults] = useState<string[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const log = (msg: string) => {
    console.log(msg);
    setResults(prev => [...prev, msg]);
  };

  useEffect(() => {
    init();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const init = async () => {
    try {
      // Cargar usuarios registrados
      log('📋 Cargando usuarios registrados...');
      const res = await fetch('http://localhost:3001/auth/registered-faces');
      const data = await res.json();
      setRegisteredUsers(data.users || []);
      log(`✅ ${data.count} usuarios con rostro registrado`);
      
      data.users?.forEach((u: any, i: number) => {
        const desc = JSON.parse(u.descriptor);
        log(`   ${i+1}. ${u.name} - descriptor[0:3]: [${desc.slice(0,3).map((n:number) => n.toFixed(4)).join(', ')}]`);
      });

      // Cargar modelos
      log('🔄 Cargando modelos de face-api.js...');
      await loadModels();
      log('✅ Modelos cargados');

      // Iniciar cámara
      log('📷 Iniciando cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      log('✅ Cámara lista');
      setStatus('Listo - Haz clic en "Capturar y Comparar"');
    } catch (err: any) {
      log(`❌ Error: ${err.message}`);
      setStatus('Error');
    }
  };

  const captureAndCompare = async () => {
    if (!videoRef.current) return;
    
    setResults([]);
    log('📸 Capturando rostro...');
    
    const descriptor = await detectFace(videoRef.current);
    
    if (!descriptor) {
      log('❌ No se detectó ningún rostro');
      return;
    }
    
    log(`✅ Rostro detectado - descriptor length: ${descriptor.length}`);
    log(`📐 Descriptor capturado[0:5]: [${Array.from(descriptor.slice(0,5)).map(n => n.toFixed(4)).join(', ')}]`);
    setCapturedDescriptor(descriptor);
    
    if (registeredUsers.length === 0) {
      log('⚠️ No hay usuarios registrados para comparar');
      return;
    }
    
    log('\n🔍 COMPARANDO CON USUARIOS REGISTRADOS:');
    log('═'.repeat(50));
    
    const comparisons: Array<{name: string, distance: number, similarity: number}> = [];
    
    for (const user of registeredUsers) {
      try {
        const storedDesc = stringToDescriptor(user.descriptor);
        const distance = euclideanDistance(descriptor, storedDesc);
        const similarity = Math.max(0, Math.min(100, ((1.2 - distance) / 1.2) * 100));
        
        comparisons.push({ name: user.name, distance, similarity: Math.round(similarity) });
        log(`   ${user.name}: distancia=${distance.toFixed(4)}, similitud=${Math.round(similarity)}%`);
      } catch (err: any) {
        log(`   ❌ Error con ${user.name}: ${err.message}`);
      }
    }
    
    log('═'.repeat(50));
    
    // Ordenar por distancia
    comparisons.sort((a, b) => a.distance - b.distance);
    const best = comparisons[0];
    
    log(`\n🏆 MEJOR MATCH: ${best.name}`);
    log(`   Distancia: ${best.distance.toFixed(4)}`);
    log(`   Similitud: ${best.similarity}%`);
    
    if (best.distance < 0.5) {
      log(`\n✅ RESULTADO: Reconocido como ${best.name} (alta confianza)`);
    } else if (best.distance < 0.7) {
      log(`\n⚠️ RESULTADO: Posiblemente ${best.name} (confianza media)`);
    } else {
      log(`\n❌ RESULTADO: No reconocido (distancia muy alta)`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">🧪 Test de Reconocimiento Facial</h1>
      
      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="bg-black rounded-lg overflow-hidden mb-4">
            <video ref={videoRef} className="w-full" autoPlay playsInline muted />
          </div>
          <Button onClick={captureAndCompare} className="w-full" size="lg">
            📸 Capturar y Comparar
          </Button>
          <p className="text-center mt-2 text-gray-600">{status}</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 max-h-[600px] overflow-y-auto">
          <h2 className="font-bold mb-2">📋 Log de Diagnóstico:</h2>
          <pre className="text-xs font-mono whitespace-pre-wrap">
            {results.map((r, i) => (
              <div key={i} className={r.startsWith('❌') ? 'text-red-600' : r.startsWith('✅') ? 'text-green-600' : ''}>{r}</div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
