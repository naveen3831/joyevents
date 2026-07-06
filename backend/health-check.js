const http = require('http');

function checkHealth(url, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${name} is healthy`);
          resolve(true);
        } else {
          console.log(`❌ ${name} returned status ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${name} is not responding: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log(`❌ ${name} health check timed out`);
      req.destroy();
      resolve(false);
    });
  });
}

async function runHealthCheck() {
  console.log('🏥 EventFlow Health Check');
  console.log('==========================');
  
  const backendHealth = await checkHealth('http://localhost:5001/health', 'Backend API');
  const frontendHealth = await checkHealth('http://localhost:8080', 'Frontend Server');
  
  console.log('\n📊 Health Check Results:');
  console.log(`Backend API: ${backendHealth ? '✅ Healthy' : '❌ Unhealthy'}`);
  console.log(`Frontend Server: ${frontendHealth ? '✅ Healthy' : '❌ Unhealthy'}`);
  
  if (backendHealth && frontendHealth) {
    console.log('\n🎉 All services are running properly!');
    console.log('🌐 Frontend: http://localhost:8080');
    console.log('📊 Backend API: http://localhost:5001');
  } else {
    console.log('\n⚠️  Some services are not responding properly.');
    console.log('💡 Try running: node start-servers.js');
  }
}

runHealthCheck();