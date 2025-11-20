/**
 * Admin Utility Script - Refresh Curated Jobs
 *
 * Triggers POST /api/jobs/sync to replay the curated job catalog
 * into the database. No external API keys required.
 *
 * USAGE:
 *   1. Ensure the backend server is running (npm run dev:server)
 *   2. Sign in to the app and copy your JWT from localStorage
 *   3. Run: node server/scripts/sync-jobs.mjs YOUR_JWT_TOKEN
 */

const API_BASE_URL = 'http://localhost:4000';

async function syncJobs(token) {
  if (!token) {
    console.error('❌ ERROR: No JWT token provided!');
    console.log('\n📝 How to get your JWT token:');
    console.log('   1. Open your app in browser: http://localhost:8080');
    console.log('   2. Sign in to your account');
    console.log('   3. Open browser DevTools (F12)');
    console.log('   4. Go to Console tab');
    console.log('   5. Type: localStorage.getItem("token")');
    console.log('   6. Copy the token (without quotes)');
    console.log('   7. Run: node server/scripts/sync-jobs.mjs YOUR_TOKEN_HERE\n');
    process.exit(1);
  }

  console.log('🔄 Refreshing curated jobs catalog...\n');

  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ SUCCESS! Curated jobs refreshed.\n');
    if (data.message) {
      console.log(`ℹ️  API Response: ${data.message}\n`);
    }
    console.log('🎉 Visit the Jobs page: http://localhost:8080/jobs\n');

  } catch (error) {
  console.error('❌ ERROR: Failed to refresh curated jobs!\n');
    
    if (error.message.includes('401')) {
      console.error('🔒 Authentication Error:');
      console.error('   Your JWT token is invalid or expired.');
      console.error('   Please login again and get a fresh token.\n');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('🔌 Connection Error:');
      console.error('   Backend server is not running!');
      console.error('   Start it with: npm run dev:server\n');
    } else {
      console.error('💥 Unexpected Error:');
      console.error(`   ${error.message}\n`);
    }

    process.exit(1);
  }
}

// Get token from command line argument
const token = process.argv[2];
syncJobs(token);
