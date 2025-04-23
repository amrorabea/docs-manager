const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password, role = 'user' } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPwd = await bcrypt.hash(password, 10);

        // Create new user with default role of 'user'
        // Only allow 'admin' role if the request is from an admin
        const userRole = req.user?.role === 'admin' ? role : 'user';

        const result = await User.create({
            name,
            email,
            password: hashedPwd,
            role: userRole
        });

        res.status(201).json({ 
            success: true,
            message: 'User created successfully',
            userId: result._id
        });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ message: 'Failed to register user' });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ message: 'Invalid password' });

        // Use ACCESS_TOKEN_SECRET consistently across the application
        const accessToken = jwt.sign(
            { 
                email: user.email,
                role: user.role 
            }, 
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' } // Short-lived access token
        );

        // Create refresh token with longer expiration
        const refreshToken = jwt.sign(
            { email: user.email },
            process.env.ACCESS_TOKEN_SECRET, // Use same secret for simplicity
            { expiresIn: '7d' }
        );

        // Set refresh token in HTTP-only cookie
        res.cookie('jwt', refreshToken, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ 
            accessToken,
            user: {
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed' });
    }
};

exports.logoutUser = (req, res) => {
    // Clear the jwt cookie
    res.clearCookie('jwt', { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ message: 'Logged out successfully' });
};

exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Get the user to validate permissions
        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Security check: Only allow users to update their own data unless they're admin
        if (req.user.email !== userToUpdate.email && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: You can only update your own user data' });
        }

        // Prepare update data
        const updateData = { ...req.body };
        
        // Handle password update
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        // Only admin can change the role
        if (updateData.role && req.user.role !== 'admin') {
            delete updateData.role;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Failed to update user' });
    }
};

// Get all users (admin only - already protected by middleware)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

// Get a single user 
exports.getUser = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email }).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Security check: Only allow users to access their own data unless they're admin
        if (req.user.email !== req.params.email && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: You can only access your own user data' });
        }

        res.json(user);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
};

// Delete a user (admin only - already protected by middleware)
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const result = await User.findByIdAndDelete(userId);
        
        if (!result) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Failed to delete user' });
    }
};
