const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const verifyJWT = require('./middleware/verifyJWT');
require('dotenv').config();
const helmet = require('helmet');
const compression = require('compression');
const app = express();
app.use(helmet());
app.use(compression());

app.use(cors({
    origin: 'http://localhost:3000', // Specify your frontend origin exactly
    credentials: true,               // Allow credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;


mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch((err) => console.log(err));




const policyAPI = require('./routes/api/policyAPI');
const departmentAPI = require('./routes/api/departmentAPI');
const userAPI = require('./routes/api/userAPI');

const rootRoutes = require('./routes/rootRoute');
const registerRoutes = require('./routes/registerRoute');
const authRoutes = require('./routes/authRoute');
const refreshRoutes = require('./routes/refreshRoute');
const logoutRoutes = require('./routes/logoutRoute');

app.use('/', rootRoutes);
app.use('/register', registerRoutes);
app.use('/auth', authRoutes);
app.use('/refresh', refreshRoutes);
app.use('/logout', logoutRoutes);

app.use(verifyJWT.verifyJWT);

app.use('/api/policies', policyAPI);
app.use('/api/departments', departmentAPI);
app.use('/api/users', userAPI);

