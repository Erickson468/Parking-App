const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. Token missing.' });
    }

    if (!token.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Invalid token format. Use "Bearer <token>".' });
    }

    const jwtToken = token.slice(7);

    jwt.verify(jwtToken, process.env.JWT_KEY_US, (err, decoded) => {
        if (err) {
            console.error('Error verifying token:', err);
            return res.status(403).json({ message: 'Invalid token. Forbidden.' });
        } else {
            console.log('Decoded User:', decoded);
            req.user = decoded;
            next();
        }
    });
}

module.exports = authenticateToken;