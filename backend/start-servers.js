const { spawn } = require('child_process');
const path = require('path');

let backendProcess = null;
let frontendProcess = null;

function startBackend() {
  console.log('🚀 Starting backend server...');
  
  backendProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname),
    stdio: 'inherit'
  });

  backendProcess.on('close', (code) => {
    console.log(`❌ Backend process exited with code ${code}`);
    if (code !== 0) {
      console.log('🔄 Restarting backend in 3 seconds...');
      setTimeout(startBackend, 3000);
    }
  });

  backendProcess.on('error', (err) => {
    console.error('❌ Backend process error:', err);
    setTimeout(startBackend, 3000);
  });
}

function startFrontend() {
  console.log('🚀 Starting frontend server...');
  
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..', 'frontend'),
    stdio: 'inherit'
  });

  frontendProcess.on('close', (code) => {
    console.log(`❌ Frontend process exited with code ${code}`);
    if (code !== 0) {
      console.log('🔄 Restarting frontend in 3 seconds...');
      setTimeout(startFrontend, 3000);
    }
  });

  frontendProcess.on('error', (err) => {
    console.error('❌ Frontend process error:', err);
    setTimeout(startFrontend, 3000);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
  
  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

// Start both servers
console.log('🎯 EventFlow Server Manager');
console.log('============================');
startBackend();
setTimeout(startFrontend, 2000); // Start frontend 2 seconds after backend

console.log('\n✅ Servers starting...');
console.log('📊 Backend will be available at: http://localhost:5001');
console.log('🌐 Frontend will be available at: http://localhost:8080');
console.log('\n💡 Press Ctrl+C to stop all servers');