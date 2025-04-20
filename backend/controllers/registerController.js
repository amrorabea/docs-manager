const User = require('../models/User');
const bcrypt = require('bcrypt'); // Add this import

const handleNewUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ 'message': 'Name, email, password, and role are required.' });

    // check for duplicate emails in the db
    const duplicate = await User.findOne({ email: email }).exec();
    if (duplicate) return res.sendStatus(409); //Conflict

    try {
        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
        
        //create and store the new user with hashed password
        const result = await User.create({
            "name": name,
            "email": email,
            "password": hashedPassword, // Store the hashed password
            "role": role
        });
        
        console.log('User created:', result);
        res.status(201).json({ 'success': `New user ${name} created!` });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ 'message': err.message });
    }
}

module.exports = { handleNewUser };