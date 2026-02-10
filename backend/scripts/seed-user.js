/**
 * Seed script - create a default user for first-time login
 * Run: node scripts/seed-user.js
 * Default: email admin@example.com, password admin123 (change in production)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emailhistory';
const DEFAULT_EMAIL = process.env.SEED_EMAIL || 'admin@example.com';
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'admin123';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    const existing = await User.findOne({ email: DEFAULT_EMAIL });
    if (existing) {
      console.log('User already exists:', DEFAULT_EMAIL);
      process.exit(0);
      return;
    }
    await User.create({ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD });
    console.log('User created:', DEFAULT_EMAIL, '(password:', DEFAULT_PASSWORD + ')');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
