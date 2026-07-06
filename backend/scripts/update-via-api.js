// Script to update platform name via API call
// This requires the backend to be running

const API_URL = 'http://localhost:5001';

async function updatePlatformName() {
  try {
    // First, try to login as admin
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'admin@123'
      })
    });

    if (!loginResponse.ok) {
      console.error('Failed to login. Please check admin credentials.');
      console.log('Trying direct database update...');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    console.log('✅ Logged in as admin');

    // Update platform settings
    const updateResponse = await fetch(`${API_URL}/api/settings/platform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        platformName: 'JoyEvents',
        supportEmail: 'hello@joyevents.com'
      })
    });

    if (!updateResponse.ok) {
      console.error('Failed to update platform settings');
      return;
    }

    const updateData = await updateResponse.json();
    console.log('✅ Platform name updated to: JoyEvents');
    console.log('✅ Support email updated to: hello@joyevents.com');

    // Verify the update
    const verifyResponse = await fetch(`${API_URL}/api/settings/platform`);
    const verifyData = await verifyResponse.json();
    
    console.log('\n📋 Current Settings:');
    console.log(`Platform Name: ${verifyData.platformName}`);
    console.log(`Support Email: ${verifyData.supportEmail}`);
    console.log('\n✅ Update complete! Refresh your browser to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updatePlatformName();
