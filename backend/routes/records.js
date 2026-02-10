/**
 * Records API - fetch all records and single record by ID
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const Record = require('../models/Record');
const auth = require('../middleware/auth');
const router = express.Router();

const DEBUG_LOG = path.join(__dirname, '..', '..', 'debug-records.log');
function logToFile(loc, msg, data) {
  try {
    const line = JSON.stringify({ location: loc, message: msg, data, timestamp: Date.now(), hypothesisId: 'H2-H4' }) + '\n';
    fs.appendFileSync(DEBUG_LOG, line);
  } catch (e) { console.error('logToFile', e); }
}

// All routes require authentication
router.use(auth);

// Get region from record: prioritize top-level region field first
function getRegionFromRecord(record) {
  // First check top-level region field
  const top = record.region != null ? String(record.region).trim() : '';
  if (top) return top;
  
  // If not found, check in data Map/Object for "Region" key (exact match, case-insensitive)
  const data = record.data && record.data instanceof Map ? Object.fromEntries(record.data) : (record.data || {});
  const keys = Object.keys(data);
  
  // Look for exact "region" key first
  let regionKey = keys.find((k) => String(k).toLowerCase().trim() === 'region');
  
  // If not found, look for key containing "region"
  if (regionKey == null) {
    regionKey = keys.find((k) => String(k).toLowerCase().includes('region'));
  }
  
  const val = regionKey != null ? data[regionKey] : null;
  return val != null ? String(val).trim() : '';
}

// GET /api/records - Only show results matching the regional office selected at login (or all if region is "All")
router.get('/', async (req, res) => {
  try {
    const region = req.query.region;
    const regionTrimmed = region ? String(region).trim() : '';
    const matchRegion = regionTrimmed && regionTrimmed.toLowerCase() !== 'all' ? regionTrimmed : null;
    
    // #region agent log
    const logPayload = { region, regionTrimmed, matchRegion };
    logToFile('records.js:GET-query', 'Region query params', logPayload);
    console.log('[DEBUG records] GET-query', logPayload);
    // #endregion

    const records = await Record.find({})
      .sort({ createdAt: -1 })
      .lean();

    let filtered = records;
    if (matchRegion) {
      const sampleRegions = records.slice(0, 5).map((r) => ({ 
        id: r._id,
        top: r.region, 
        fromGetter: getRegionFromRecord(r), 
        dataKeys: r.data && r.data instanceof Map ? Array.from(r.data.keys()) : (r.data ? Object.keys(r.data) : []),
        dataRegionValue: r.data && r.data instanceof Map ? r.data.get('Region') : (r.data ? r.data['Region'] : null)
      }));
      
      // #region agent log
      const beforePayload = { totalRecords: records.length, matchRegion, sampleRegions };
      logToFile('records.js:before-filter', 'Total records and sample getRegionFromRecord', beforePayload);
      console.log('[DEBUG records] before-filter', JSON.stringify(beforePayload, null, 2));
      // #endregion
      
      // Filter with case-insensitive comparison
      filtered = records.filter((r) => {
        const recRegion = getRegionFromRecord(r);
        const match = recRegion.toLowerCase() === matchRegion.toLowerCase();
        return match;
      });
      
      // #region agent log
      const afterPayload = { filteredCount: filtered.length, matchRegion };
      logToFile('records.js:after-filter', 'Filtered count', afterPayload);
      console.log('[DEBUG records] after-filter', afterPayload);
      // #endregion
    }

    const normalized = filtered.map((r) => ({
      _id: r._id,
      data: r.data && r.data instanceof Map ? Object.fromEntries(r.data) : r.data,
      sourceFile: r.sourceFile,
      rowIndex: r.rowIndex,
      region: r.region,
      lastVisitDate: r.lastVisitDate,
      createdAt: r.createdAt,
    }));

    res.json(normalized);
  } catch (err) {
    console.error('Fetch records error:', err);
    res.status(500).json({ error: 'Failed to fetch records.' });
  }
});

// GET /api/records/:id - Fetch a single record by ID
router.get('/:id', async (req, res) => {
  try {
    const record = await Record.findOne({ _id: req.params.id }).lean();

    if (!record) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const data = record.data && record.data instanceof Map
      ? Object.fromEntries(record.data)
      : record.data;

    res.json({
      _id: record._id,
      data,
      sourceFile: record.sourceFile,
      rowIndex: record.rowIndex,
      region: record.region,
      lastVisitDate: record.lastVisitDate,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid record ID.' });
    }
    console.error('Fetch record error:', err);
    res.status(500).json({ error: 'Failed to fetch record.' });
  }
});

// PATCH /api/records/:id - Update lastVisitDate
router.patch('/:id', async (req, res) => {
  try {
    const { lastVisitDate } = req.body;
    const record = await Record.findOneAndUpdate(
      { _id: req.params.id },
      { lastVisitDate: lastVisitDate ? new Date(lastVisitDate) : null },
      { new: true }
    ).lean();

    if (!record) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    res.json({
      _id: record._id,
      lastVisitDate: record.lastVisitDate,
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid record ID.' });
    }
    console.error('Update record error:', err);
    res.status(500).json({ error: 'Failed to update record.' });
  }
});

module.exports = router;
