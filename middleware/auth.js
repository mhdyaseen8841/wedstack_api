const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'wedstack-secret-key-12345';

module.exports = (req, res, next) => {
  // Support mock bypass for quick UI testing if specified
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    // If user passes a mock header for quick workspace testing
    const mockSide = req.header('x-mock-side');
    const mockWeddingId = req.header('x-mock-wedding-id');
    if (mockSide && mockWeddingId) {
      req.user = {
        userId: 'mock-user-id',
        weddingId: mockWeddingId,
        side: mockSide,
        role: mockSide === 'Shared' ? 'Planner' : mockSide
      };
      return next();
    }
    return res.status(401).json({ message: 'No authentication token, access denied' });
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No authentication token, access denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.id,
      weddingId: decoded.weddingId,
      side: decoded.side || 'Shared',
      role: decoded.role
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token verification failed, authorization denied' });
  }
};
