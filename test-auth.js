// Test script para verificar endpoint de autorizaciones
const fetch = require('node-fetch');

async function testAuthEndpoint() {
  try {
    console.log('🔍 Testing Authorization endpoint...\n');
    
    // Test sin autenticación
    console.log('1. Testing without auth token:');
    const res1 = await fetch('http://localhost:3001/fhir/Authorization');
    console.log(`   Status: ${res1.status}`);
    const data1 = await res1.json();
    console.log(`   Response:`, data1);
    console.log('');
    
    // Test con token de prueba (necesitarás obtener uno real)
    console.log('2. Testing with auth token (if available):');
    console.log('   You need to login first to get a valid token');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAuthEndpoint();
