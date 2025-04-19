const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/departmentController');

// Route for getting all departments
router.get('/', departmentController.getAllDepartments);

// Route for getting a single department
router.get('/:id', departmentController.getSingleDepartment);

// Route for creating a department
router.post('/', departmentController.createDepartment);

// Route for updating a department
router.put('/:id', departmentController.updateDepartment);

// Route for deleting a department
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;
