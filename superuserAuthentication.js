const jwt = require('jsonwebtoken');

function authenticateSuperuserToken(req, res, next) {
    let token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    console.log('Token:', token);
    try {
        const decoded = jwt.verify(token.slice(7), process.env.JWT_TOK_US);
        if (!decoded.isSuperuser) return res.status(403).json({ message: 'Permission denied' });
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
}

module.exports = authenticateSuperuserToken;