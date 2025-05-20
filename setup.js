const fs = require('fs').promises;
const crypto = require('crypto');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setup() {
  console.log('Setting up the Discord Timestamp Bot...');
  
  // Create data directories
  try {
    await fs.mkdir('data', { recursive: true });
    await fs.mkdir('data/backups', { recursive: true });
    console.log('✅ Created data directories');
  } catch (error) {
    console.error('❌ Error creating directories:', error);
  }
  
  // Generate encryption key
  const encryptionKey = crypto.randomBytes(32).toString('hex');
  
  // Ask for Discord token
  rl.question('Enter your Discord bot token: ', async (token) => {
    // Create .env file
    const envContent = `TOKEN=${token}\nENCRYPTION_KEY=${encryptionKey}`;
    try {
      await fs.writeFile('.env', envContent);
      console.log('✅ Created .env file with your settings');
    } catch (error) {
      console.error('❌ Error creating .env file:', error);
    }
    
    console.log('\n==== Setup complete! ====\n');
    console.log('Your encryption key is:');
    console.log(encryptionKey);
    console.log('\nThis key has been saved to your .env file. Keep it secure!');
    console.log('\nStart the bot with: npm start');
    
    rl.close();
  });
}

setup().catch(console.error);