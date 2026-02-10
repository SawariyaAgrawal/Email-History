/**
 * Migration script to fix region field in existing records
 * This reads the "Region" column from data and updates the top-level region field
 * 
 * Run this ONCE with: node scripts/fix-regions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Record = require('../models/Record');

async function fixRegions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emailhistory', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get all records
    const records = await Record.find({});
    console.log(`Found ${records.length} records to check`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      // Get data as object
      const data = record.data && record.data instanceof Map 
        ? Object.fromEntries(record.data) 
        : (record.data || {});
      
      // Find the "Region" key (case-insensitive)
      const keys = Object.keys(data);
      const regionKey = keys.find((k) => String(k).toLowerCase().trim() === 'region');
      
      if (regionKey) {
        const regionValue = data[regionKey];
        if (regionValue != null && String(regionValue).trim() !== '') {
          const newRegion = String(regionValue).trim();
          
          // Update if different from current region
          if (record.region !== newRegion) {
            record.region = newRegion;
            await record.save();
            updatedCount++;
            
            if (updatedCount <= 5) {
              console.log(`Updated record ${record._id}: "${record.region}" -> "${newRegion}"`);
            }
          } else {
            skippedCount++;
          }
        }
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`- Updated: ${updatedCount} records`);
    console.log(`- Skipped (already correct): ${skippedCount} records`);
    console.log(`- Total processed: ${records.length} records`);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixRegions();
