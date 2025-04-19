const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const verifyJWT = require('./middleware/verifyJWT');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;


mongoose.connect(process.env.MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch((err) => console.log(err));




const policyAPI = require('./routes/api/policyAPI');
const departmentAPI = require('./routes/api/departmentAPI');
const userAPI = require('./routes/api/userAPI');



app.use(verifyJWT.verifyJWT);
app.use('/policies', policyAPI);
app.use('/departments', departmentAPI);
app.use('/users', userAPI);

