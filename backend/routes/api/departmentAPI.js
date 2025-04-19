const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/departmentController');

// Route for getting all departments
router.get('/all', departmentController.getAllDepartments);

// Route for getting a single department
router.get('/department/:id', departmentController.getSingleDepartment);

// Route for creating a department
router.post('/create', departmentController.createDepartment);

// Route for updating a department
router.put('/update/:id', departmentController.updateDepartment);

// Route for deleting a department
router.delete('/delete/:id', departmentController.deleteDepartment);

module.exports = router;
