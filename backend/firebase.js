const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!admin.apps.length) {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // From environment variable (production / CI)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
  } else {
    // From local JSON file (development)
    // Download from Firebase Console → Project Settings → Service accounts
    const serviceAccount = require('./firebase-service-account.json');
    credential = admin.credential.cert(serviceAccount);
  }

  admin.initializeApp({ credential });
}

const db = admin.firestore();

// Silently ignore undefined properties (no Mongoose-style strict mode)
db.settings({ ignoreUndefinedProperties: true });

/**
 * Recursively convert Firestore Timestamp objects to ISO date strings
 * so they serialize cleanly to JSON for the frontend.
 */
function convertTimestamps(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  // Firestore Timestamp: has toDate() method
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (Array.isArray(obj)) return obj.map(convertTimestamps);
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = convertTimestamps(v);
  }
  return result;
}

module.exports = { admin, db, convertTimestamps };
