const Policy = require('../models/Policy');
const Department = require('../models/Department');

exports.createPolicy = async (req, res) => {
    try {
        const {
            name,
            departmentId,
            approvalDate,
            reviewCycleYears,
            approvalValidity,
            wordFileUrl,
            pdfFileUrl
        } = req.body;

        const department = await Department.findById(departmentId);
        if (!department) return res.status(404).json({ message: 'Department not found' });

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
        res.status(400).json({ error: err.message });
    }
};

exports.getPolicies = async (req, res) => {
    try {
        const { departmentId } = req.query;
        const filter = departmentId ? { department: departmentId } : {};

        const policies = await Policy.find(filter).populate('department');
        res.json(policies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updatePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            department,
            approvalDate,
            reviewPeriod,
            approvalValidity,
        } = req.body;

        const updated = await Policy.findByIdAndUpdate(
            id,
            { title, department, approvalDate, reviewPeriod, approvalValidity },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: 'Policy not found' });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Error updating policy', error: err });
    }
};

exports.getPolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);
        if (!policy) return res.status(404).json({ message: 'Policy not found' });
        res.json(policy);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching policy', error: err });
    }
};