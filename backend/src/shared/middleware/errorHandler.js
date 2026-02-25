export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.error('Error:', {
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: isProduction ? undefined : err.details
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized access'
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Resource already exists'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Resource not found'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  res.status(err.status || 500).json({
    error: isProduction && !err.status ? 'Internal server error' : err.message
  });
};
