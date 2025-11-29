import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { API_URL } from '@/lib/api';

export async function GET() {
  const headersList = await headers();
  const authorization = headersList.get('authorization');

  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Reenviar la petición al backend con el token
    const backendUrl = process.env.BACKEND_URL || '${API_URL}';
    const backendResponse = await fetch(`${backendUrl}/dashboard/kpis`, {
      headers: {
        Authorization: authorization,
      },
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch from backend' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}