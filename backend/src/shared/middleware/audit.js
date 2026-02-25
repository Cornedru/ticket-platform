import logger from '../logger.js';

export const auditLog = (action) => {
  return async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        action,
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection?.remoteAddress
      };

      if (res.statusCode >= 400) {
        logger.warn({ ...logData, error: 'Request failed' });
      } else {
        logger.info(logData);
      }
    });

    next();
  };
};

export const adminAuditLog = (action) => {
  return async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      if (req.user?.role !== 'ADMIN') return;
      
      const duration = Date.now() - start;
      const logData = {
        type: 'ADMIN_AUDIT',
        action,
        method: req.method,
        path: req.path,
        userId: req.user.id,
        userEmail: req.user.email,
        targetId: req.params.id || req.body.id,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        body: sanitizeBody(req.body)
      };

      logger.info(logData);
    });

    next();
  };
};

function sanitizeBody(body) {
  if (!body) return {};
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}
