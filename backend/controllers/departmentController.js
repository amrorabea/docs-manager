const Department = require('../models/Department');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
const getAllDepartments = async (req, res) => {
    try {
        const departments = await Department.find();
        res.status(200).json(departments);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// @desc    Get a single department
// @route   GET /api/departments/:id
// @access  Public
const getSingleDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }
        res.status(200).json(department);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// @desc    Create a new department
// @route   POST /api/departments
// @access  Public
const createDepartment = async (req, res) => {
    const { name, description } = req.body;

    if (!name || !description) {
        return res.status(400).json({ message: 'Name and description are required' });
    }

    try {
        const newDepartment = await Department.create({ name, description });
        res.status(201).json(newDepartment);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// @desc    Delete a department
// @route   DELETE /api/departments/delete/:id
// @access  Admin only
const deleteDepartment = async (req, res) => {
    try {
        const deletedDepartment = await Department.findByIdAndDelete(req.params.id);
        if (!deletedDepartment) {
            return res.status(404).json({ message: 'Department not found' });
        }
        res.status(200).json({ message: 'Department deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// @desc    Update a department
// @route   PUT /api/departments/update/:id
// @access  Admin only
const updateDepartment = async (req, res) => {
    try {
        const updatedDepartment = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedDepartment) {
            return res.status(404).json({ message: 'Department not found' });
        }
        res.status(200).json(updatedDepartment);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

module.exports = {
    getAllDepartments,
    getSingleDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment,
};
