/**
 * Communications API - per-record, per-visit-date form data
 */
const express = require('express');
const Communication = require('../models/Communication');
const auth = require('../middleware/auth');
const router = express.Router({ mergeParams: true });

router.use(auth);

function toISODate(d) {
  if (!d) return null;
  const x = new Date(d);
  if (isNaN(x.getTime())) return null;
  return x.toISOString().slice(0, 10);
}

// GET /api/records/:recordId/communications - list all visit dates with forms for this record
router.get('/', async (req, res) => {
  try {
    const list = await Communication.find({ recordId: req.params.recordId })
      .sort({ visitDate: -1 })
      .select('visitDate _id')
      .lean();
    res.json(list.map((c) => ({ visitDate: toISODate(c.visitDate) || c.visitDate, _id: String(c._id) })));
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid record ID.' });
    res.status(500).json({ error: 'Failed to fetch list.' });
  }
});

// GET /api/records/:recordId/communications/by-date?visitDate=YYYY-MM-DD - get one by visit date
router.get('/by-date', async (req, res) => {
  try {
    const visitDateStr = req.query.visitDate;
    if (!visitDateStr) return res.status(400).json({ error: 'visitDate required (YYYY-MM-DD).' });
    const start = new Date(visitDateStr);
    if (isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid visitDate.' });
    start.setUTCHours(0, 0, 0, 0);
    const doc = await Communication.findOne({
      recordId: req.params.recordId,
      visitDate: start,
    }).lean();
    if (!doc) return res.json(null);
    const deviationNo = doc.deviationNoticedNo != null && doc.deviationNoticedNo !== '' ? doc.deviationNoticedNo : (doc.deviationNoticedNoAndDate || '');
    res.json({
      _id: doc._id,
      visitDate: toISODate(doc.visitDate),
      salesOfficerVisitDate: toISODate(doc.salesOfficerVisitDate),
      majorMinorIrregularities: doc.majorMinorIrregularities || '',
      deviationNoticedNo: deviationNo,
      deviationNoticedDate: toISODate(doc.deviationNoticedDate),
      replyReceivedByDealerDate: toISODate(doc.replyReceivedByDealerDate),
      replySatisfactoryYesNo: doc.replySatisfactoryYesNo || '',
      impositionOfMDGPenaltyNoticeDate: toISODate(doc.impositionOfMDGPenaltyNoticeDate),
      reminder1Date: toISODate(doc.reminder1Date),
      reminder1ReplyDate: toISODate(doc.reminder1ReplyDate),
      reminder2Date: toISODate(doc.reminder2Date),
      reminder2ReplyDate: toISODate(doc.reminder2ReplyDate),
      penaltyRecoverBy: doc.penaltyRecoverBy || '',
      penaltyRTGSDDNoAndDate: doc.penaltyRTGSDDNoAndDate || '',
      emiDates: doc.emiDates || '',
      transitionComplete: doc.transitionComplete || '',
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid record ID.' });
    res.status(500).json({ error: 'Failed to fetch.' });
  }
});

// POST /api/records/:recordId/communications - create or update (upsert by recordId + visitDate)
router.post('/', async (req, res) => {
  try {
    const recordId = req.params.recordId;
    const body = req.body;
    const visitDateStr = body.visitDate;
    if (!visitDateStr) return res.status(400).json({ error: 'visitDate required.' });
    const visitDate = new Date(visitDateStr);
    if (isNaN(visitDate.getTime())) return res.status(400).json({ error: 'Invalid visitDate.' });
    const normalized = new Date(visitDate);
    normalized.setUTCHours(0, 0, 0, 0);

    const update = {
      recordId,
      visitDate: normalized,
      salesOfficerVisitDate: body.salesOfficerVisitDate ? new Date(body.salesOfficerVisitDate) : null,
      majorMinorIrregularities: String(body.majorMinorIrregularities || '').trim(),
      deviationNoticedNo: String(body.deviationNoticedNo || '').trim(),
      deviationNoticedDate: body.deviationNoticedDate ? new Date(body.deviationNoticedDate) : null,
      replyReceivedByDealerDate: body.replyReceivedByDealerDate ? new Date(body.replyReceivedByDealerDate) : null,
      replySatisfactoryYesNo: String(body.replySatisfactoryYesNo || '').trim(),
      impositionOfMDGPenaltyNoticeDate: body.impositionOfMDGPenaltyNoticeDate ? new Date(body.impositionOfMDGPenaltyNoticeDate) : null,
      reminder1Date: body.reminder1Date ? new Date(body.reminder1Date) : null,
      reminder1ReplyDate: body.reminder1ReplyDate ? new Date(body.reminder1ReplyDate) : null,
      reminder2Date: body.reminder2Date ? new Date(body.reminder2Date) : null,
      reminder2ReplyDate: body.reminder2ReplyDate ? new Date(body.reminder2ReplyDate) : null,
      penaltyRecoverBy: String(body.penaltyRecoverBy || '').trim(),
      penaltyRTGSDDNoAndDate: String(body.penaltyRTGSDDNoAndDate || '').trim(),
      emiDates: String(body.emiDates || '').trim(),
      transitionComplete: String(body.transitionComplete || '').trim(),
    };

    const doc = await Communication.findOneAndUpdate(
      { recordId, visitDate: normalized },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ _id: doc._id, visitDate: visitDateStr });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid record ID.' });
    console.error('Communication save error:', err);
    res.status(500).json({ error: 'Failed to save.' });
  }
});

module.exports = router;
