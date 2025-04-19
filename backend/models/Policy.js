const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    approvalDate: { type: Date, required: true },
    reviewCycleYears: { type: Number, enum: [1, 2, 3], required: true },
    approvalValidity: { type: String, required: true },
    wordFileUrl: { type: String },
    pdfFileUrl: { type: String },
    status: { type: String, enum: ['valid', 'expired'], default: 'valid' }
});

module.exports = mongoose.model('Policy', policySchema);