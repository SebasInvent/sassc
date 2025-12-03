import { NextRequest, NextResponse } from 'next/server';

const HUGGINGFACE_BASE = 'https://huggingface.co/InventAgency/insightface-models/resolve/main';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filename = params.path.join('/');
  
  // Solo permitir archivos específicos
  const allowedFiles = ['det_10g.onnx', 'w600k_r50.onnx'];
  if (!allowedFiles.includes(filename)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  try {
    const url = `${HUGGINGFACE_BASE}/${filename}`;
    console.log(`📦 Proxy request for: ${filename}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HuggingFace returned ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
    
  } catch (error: any) {
    console.error(`❌ Error fetching model ${filename}:`, error.message);
    return NextResponse.json({ error: 'Error fetching model' }, { status: 500 });
  }
}
