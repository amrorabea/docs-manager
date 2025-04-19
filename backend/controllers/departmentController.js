const Department = require('../models/Department');

exports.createDepartment = async (req, res) => {
    try {
        const { name } = req.body;
        const existing = await Department.findOne({ name });
        if (existing) return res.status(409).json({ message: 'Department already exists' });

        const department = await Department.create({ name });
        res.status(201).json(department);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const departments = await Department.find();
        res.json(departments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const updated = await Department.findByIdAndUpdate(
            id,
            { name },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: 'Department not found' });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Error updating department', error: err });
    }
};

exports.getDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) return res.status(404).json({ message: 'Department not found' });
        res.json(department);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching department', error: err });
    }
};