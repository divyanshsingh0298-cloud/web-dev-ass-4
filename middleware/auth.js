const jwt = require('jsonwebtoken');

// Verifies the Bearer token and attaches the payload to req.user
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Access denied. No token provided' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, username, role }
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ message });
  }
}

// Role-based access control
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden. Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
