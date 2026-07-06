import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname= dirname(__filename);

dotenv.config();
if (!process.env.MONGO_URI) {
 const rootEnv = resolve(__dirname, '../.env');
  dotenv.config({ path: rootEnv });
}

// Simple User schema for testing
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  role: String
});

const User = mongoose.model('User', userSchema);

async function testPasswordChange() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
   console.log('✅ Connected to MongoDB');

    // Find a test user (you can change this email)
   const user = await User.findOne({ email: 'test@example.com' });
    
   if (!user) {
     console.log('❌ No user found with email: test@example.com');
     console.log('Please update the email in this script or create a test user');
      await mongoose.connection.close();
     return;
    }

   console.log('📧 Found user:', user.email);
   console.log('👤 Role:', user.role);

    // Test 1: Verify current password
   const currentPassword = 'oldpassword123'; // Change this to actual password
   const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
   console.log('🔐 Current password valid:', isValid);

   if (isValid) {
      // Test 2: Change password
     const newPassword = 'newpassword456';
     const newHash = await bcrypt.hash(newPassword, 10);
      
      user.passwordHash = newHash;
      await user.save();
      
     console.log('✅ Password changed successfully!');
      
      // Test 3: Verify new password works
     const verifyNew = await bcrypt.compare(newPassword, user.passwordHash);
     console.log('✅ New password verified:', verifyNew);
    } else {
     console.log('⚠️ Skipping password change test - current password unknown');
    }

    await mongoose.connection.close();
   console.log('👋 Database connection closed');
    
  } catch (error) {
   console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testPasswordChange();
