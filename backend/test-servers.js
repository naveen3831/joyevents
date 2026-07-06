console.log('🧪 Testing EventFlow Servers');
console.log('==============================');

// Test if servers are accessible
const testUrls = [
  { name: 'Backend Health', url: 'http://localhost:5001/health' },
  { name: 'Frontend', url: 'http://localhost:8080' }
];

async function testServer(name, url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`✅ ${name}: Working (${response.status})`);
      return true;
    } else {
      console.log(`❌ ${name}: Error ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('Testing server connectivity...\n');
  
  for (const test of testUrls) {
    await testServer(test.name, test.url);
  }
  
  console.log('\n🎯 Servers Status:');
  console.log('Backend API: http://localhost:5001');
  console.log('Frontend App: http://localhost:8080');
  console.log('\n💡 If servers are not responding, run: npm start');
}

runTests();