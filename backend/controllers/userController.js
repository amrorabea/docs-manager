const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(409).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword, role });
        res.status(201).json({ message: 'User created successfully', user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ message: 'Invalid password' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.json({ token });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.logoutUser = (req, res) => {
    res.clearCookie('token'); // if you're storing it in cookies
    res.json({ message: 'Logged out successfully' });
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role } = req.body; // you can add more fields if needed

        const updated = await User.findByIdAndUpdate(
            id,
            { email, role },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: 'User not found' });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Error updating user', error: err });
    }
};