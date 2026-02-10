/**
 * Communication / visit form - one document per record + visit date
 * Keyed by recordId + visitDate so we can load previous data and edit
 */
const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema(
  {
    recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', required: true },
    visitDate: { type: Date, required: true },
    salesOfficerVisitDate: { type: Date, default: null },
    majorMinorIrregularities: { type: String, default: '' },
    deviationNoticedNo: { type: String, default: '' },
    deviationNoticedDate: { type: Date, default: null },
    deviationNoticedNoAndDate: { type: String, default: '' },
    replyReceivedByDealerDate: { type: Date, default: null },
    replySatisfactoryYesNo: { type: String, default: '' },
    impositionOfMDGPenaltyNoticeDate: { type: Date, default: null },
    reminder1Date: { type: Date, default: null },
    reminder1ReplyDate: { type: Date, default: null },
    reminder2Date: { type: Date, default: null },
    reminder2ReplyDate: { type: Date, default: null },
    penaltyRecoverBy: { type: String, default: '' },
    penaltyRTGSDDNoAndDate: { type: String, default: '' },
    emiDates: { type: String, default: '' },
    transitionComplete: { type: String, default: '' },
  },
  { timestamps: true }
);

communicationSchema.index({ recordId: 1, visitDate: 1 }, { unique: true });

module.exports = mongoose.model('Communication', communicationSchema);
