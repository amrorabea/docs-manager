const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch((err) => console.log(err));


const policyRoutes = require('./routes/api/policyAPI');
const departmentRoutes = require('./routes/api/departmentAPI');
const userRoutes = require('./routes/api/userAPI');

app.use('/api/policies', policyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);