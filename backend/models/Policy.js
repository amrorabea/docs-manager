const mongoose = require('mongoose');

const policySchema = new mongoose.Schema(
    {
        name: { 
            type: String, 
            required: [true, 'Policy name is required'],
            trim: true,
            maxlength: [100, 'Policy name cannot exceed 100 characters'],
            index: true // For faster searches
        },
        department: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Department', 
            required: [true, 'Department is required'],
            index: true
        },
        approvalDate: { 
            type: Date, 
            required: [true, 'Approval date is required'],
            validate: {
                validator: function(value) {
                    return value <= new Date();
                },
                message: 'Approval date cannot be in the future'
            }
        },
        reviewCycleYears: { 
            type: Number, 
            enum: {
                values: [1, 2, 3],
                message: '{VALUE} is not a valid review cycle. Must be 1, 2, or 3 years.'
            },
            required: [true, 'Review cycle is required']
        },
        approvalValidity: { 
            type: Date, 
            index: true
        },
        wordFileUrl: { 
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^(https?:\/\/|\/).*$/i.test(v);
                },
                message: props => `${props.value} is not a valid file URL`
            }
        },
        wordFileName: { // Original filename for Word document
            type: String
        },
        pdfFileUrl: { 
            type: String,
            validate: {
                validator: function(v) {
                    return !v || /^(https?:\/\/|\/).*$/i.test(v);
                },
                message: props => `${props.value} is not a valid file URL`
            }
        },
        pdfFileName: { // Original filename for PDF
            type: String
        },
        status: { 
            type: String, 
            enum: {
                values: ['valid', 'expired', 'draft'],
                message: '{VALUE} is not a valid status. Must be "valid", "expired", or "draft".'
            }, 
            default: 'valid',
            index: true
        },
        textContent: { // Extracted text content for searching
            type: String,
            index: 'text' // MongoDB text index for full-text search
        },
        lastStatusCheckDate: { // Date when status was last checked automatically
            type: Date,
            default: Date.now
        }
    },
    { 
        timestamps: true,
        // Add virtuals to JSON output
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual for calculating days until expiry
policySchema.virtual('daysUntilExpiry').get(function() {
    if (!this.approvalValidity) return null;
    const today = new Date();
    const validity = new Date(this.approvalValidity);
    const diffTime = validity - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
});

// Compound index for more efficient queries
policySchema.index({ department: 1, status: 1 });

// Text index for search functionality
policySchema.index({ name: 'text', textContent: 'text' });

// Pre-save hook to calculate approvalValidity based on approvalDate and reviewCycleYears
// but only if approvalValidity isn't already set
policySchema.pre('save', function(next) {
    // Only auto-calculate approvalValidity if it's not already set
    if ((this.isModified('approvalDate') || this.isModified('reviewCycleYears')) && !this.approvalValidity) {
        const validityDate = new Date(this.approvalDate);
        validityDate.setFullYear(validityDate.getFullYear() + this.reviewCycleYears);
        this.approvalValidity = validityDate;
    }
    
    // Check if policy is expired
    if (this.approvalValidity && new Date() > this.approvalValidity) {
        this.status = 'expired';
    }
    
    next();
});

// Method to check if policy is expired
policySchema.methods.isExpired = function() {
    return new Date() > this.approvalValidity;
};

// Method to update status based on expiry date
policySchema.methods.updateStatus = function() {
    const previousStatus = this.status;
    if (this.approvalValidity && new Date() > this.approvalValidity) {
        this.status = 'expired';
    }
    this.lastStatusCheckDate = new Date();
    return previousStatus !== this.status; // Return true if status changed
};

// Static method to update all policy statuses
policySchema.statics.updateAllStatuses = async function() {
    const policies = await this.find({
        status: { $ne: 'expired' },
        approvalValidity: { $lt: new Date() }
    });
    
    let updatedCount = 0;
    for (const policy of policies) {
        policy.status = 'expired';
        policy.lastStatusCheckDate = new Date();
        await policy.save();
        updatedCount++;
    }
    
    return updatedCount;
};

module.exports = mongoose.model('Policy', policySchema);