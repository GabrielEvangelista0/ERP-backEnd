const http = require('http');

// Teste 1: Health check
http.get('http://localhost:4000/', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✓ Health Check:', json.message || 'OK');
    } catch (e) {
      console.log('✓ Health Check respondendo (status ' + res.statusCode + ')');
    }
  });
});

// Teste 2: Login admin
const loginRequest = http.request('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.token) {
        console.log('✓ Login Admin: OK (token obtido)');
      } else {
        console.log('✗ Login Admin: ' + (response.error || 'Erro desconhecido'));
      }
    } catch (e) {
      console.log('✗ Login Admin: Erro ao parsear resposta');
    }
  });
});

loginRequest.on('error', (e) => {
  console.log('✗ Conexão recusada:', e.message);
  process.exit(1);
});

loginRequest.write(JSON.stringify({ login: 'admin', senha: 'admin123' }));
loginRequest.end();

setTimeout(() => process.exit(0), 3000);
