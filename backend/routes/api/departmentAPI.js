const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/departmentController');
const { verifyJWT } = require('../../middleware/verifyJWT');
const { verifyAdmin } = require('../../middleware/verifyAdmin');

// Route for getting all departments
router.get('/all', verifyJWT, departmentController.getAllDepartments);

// Route for getting a single department
router.get('/department/:id', verifyJWT, departmentController.getSingleDepartment);

// Route for creating a department
router.post('/create', verifyJWT, verifyAdmin, departmentController.createDepartment);

// Route for updating a department
router.put('/update/:id', verifyJWT, verifyAdmin, departmentController.updateDepartment);

// Route for deleting a department
router.delete('/delete/:id', verifyJWT, verifyAdmin, departmentController.deleteDepartment);

module.exports = router;
