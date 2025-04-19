const mongoose = require('mongoose');

const policySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
        approvalDate: { type: Date, required: true },
        reviewCycleYears: { type: Number, enum: [1, 2, 3], required: true },
        approvalValidity: { type: Date, required: true }, // Changed to Date
        wordFileUrl: { type: String },
        pdfFileUrl: { type: String },
        status: { type: String, enum: ['valid', 'expired'], default: 'valid' }
    },
    { timestamps: true } // Add automatic createdAt and updatedAt fields
);

module.exports = mongoose.model('Policy', policySchema);