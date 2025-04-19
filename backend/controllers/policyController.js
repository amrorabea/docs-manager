const Policy = require('../models/Policy');
const Department = require('../models/Department');

// @desc    Create a new policy
// @route   POST /api/policies
// @access  Public
exports.createPolicy = async (req, res) => {
    try {
        const { name, departmentId, approvalDate, reviewCycleYears, approvalValidity, wordFileUrl, pdfFileUrl } = req.body;

        // Validate the department exists
        const department = await Department.findById(departmentId);
        if (!department) return res.status(404).json({ message: 'Department not found' });

        // Create the new policy
        const policy = await Policy.create({
            name,
            department: departmentId,
            approvalDate,
            reviewCycleYears,
            approvalValidity,
            wordFileUrl,
            pdfFileUrl
        });

        res.status(201).json(policy);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create policy', error: err.message });
    }
};

// @desc    Get all policies
// @route   GET /api/policies
// @access  Public
exports.getPolicies = async (req, res) => {
    try {
        const { departmentId } = req.query;
        const filter = departmentId ? { department: departmentId } : {};

        const policies = await Policy.find(filter).populate('department');
        res.json(policies);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching policies', error: err.message });
    }
};

// @desc    Get a single policy
// @route   GET /api/policies/:id
// @access  Public
exports.getPolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id).populate('department');
        if (!policy) return res.status(404).json({ message: 'Policy not found' });
        res.json(policy);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching policy', error: err.message });
    }
};

// @desc    Update a policy
// @route   PUT /api/policies/:id
// @access  Public
exports.updatePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, department, approvalDate, reviewCycleYears, approvalValidity, wordFileUrl, pdfFileUrl } = req.body;

        const updatedPolicy = await Policy.findByIdAndUpdate(
            id,
            { name, department, approvalDate, reviewCycleYears, approvalValidity, wordFileUrl, pdfFileUrl },
            { new: true }
        );

        if (!updatedPolicy) return res.status(404).json({ message: 'Policy not found' });

        res.json(updatedPolicy);
    } catch (err) {
        res.status(500).json({ message: 'Error updating policy', error: err.message });
    }
};

// @desc    Delete a policy
// @route   DELETE /api/policies/:id
// @access  Public
exports.deletePolicy = async (req, res) => {
    try {
        const deletedPolicy = await Policy.findByIdAndDelete(req.params.id);
        if (!deletedPolicy) return res.status(404).json({ message: 'Policy not found' });
        res.status(200).json({ message: 'Policy deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting policy', error: err.message });
    }
};
