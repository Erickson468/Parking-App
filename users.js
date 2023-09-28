const express = require("express");
const con = require('./db');
const bcrypt = require('bcrypt'); // For hashing passwords
const jwt = require('jsonwebtoken');

const users = express.Router();
const tokenExpiration = '30d';

//USER REGISTRATION

users.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hashing the password
        const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        const values = [username, hashedPassword, email];

        con.query(sql, values, (err, result) => {
            if (err) {
                console.error('Error registering user:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            return res.status(201).json({ message: 'User registered successfully' });
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// USER AUTHORISATION
users.post('/account', async (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM users WHERE username = ?';
    con.query(sql, [username], async (err, result) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = result[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_KEY_US, { expiresIn: tokenExpiration });

        res.json({ message: 'Login successful', token });
    });
});

// RESET THE PASSWORD

users.post('/reset-password', async (req, res) => {
    const { email } = req.body;

    //check email
    const sqlCheckEmail = 'SELECT * FROM users WHERE email = ?';
    con.query(sqlCheckEmail, [email], async (err, result) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'Email not found' });
        }

        // temporary password
        const temporaryPassword = generateTemporaryPassword(); 
        const hashedTemporaryPassword = await bcrypt.hash(temporaryPassword, 10);
        const userId = result[0].id;
        const sqlUpdatePassword = 'UPDATE users SET password = ? WHERE id = ?';
        con.query(sqlUpdatePassword, [hashedTemporaryPassword, userId], (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            console.log('Temporary Password:', temporaryPassword);

            return res.json({ message: 'Temporary password sent to the email' });
        });
    });
});

function generateTemporaryPassword() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let temporaryPassword = '';
    for (let i = 0; i < 10; i++) {
        temporaryPassword += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return temporaryPassword;
}

// CHANGE PASSWORD

users.post('/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    try {
        // Check user 
        const sqlCheckUser = 'SELECT * FROM users WHERE id = ?';
        con.query(sqlCheckUser, [userId], async (err, result) => {
            if (err) {
                console.error('Error querying database:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const user = result[0];
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);

            if (!isValidPassword) {
                return res.status(401).json({ message: 'Invalid current password' });
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // Update the password in the database
            const sqlUpdatePassword = 'UPDATE users SET password = ? WHERE id = ?';
            con.query(sqlUpdatePassword, [hashedNewPassword, userId], (err, result) => {
                if (err) {
                    console.error('Error updating password:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }

                return res.json({ message: 'Password changed successfully' });
            });
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// SUPERUSER REGISTRATION
users.post('/register-superuser', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10); 
        const sql = 'INSERT INTO superusers (username, password, email) VALUES (?, ?, ?)';
        const values = [username, hashedPassword, email];

        con.query(sql, values, (err, result) => {
            if (err) {
                console.error('Error registering superuser:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            return res.status(201).json({ message: 'Superuser registered successfully' });
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// SUPERUSER AUTHORISATION
users.post('/login-superuser', async (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM superusers WHERE username = ?';
    con.query(sql, [username], async (err, result) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = result[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username, isSuperuser: true }, process.env.JWT_TOK_US, { expiresIn: tokenExpiration });

        res.json({ message: 'Login successful', token });
    });
});



module.exports = users;