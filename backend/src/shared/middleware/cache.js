import Redis from 'ioredis';

const getRedisClient = () => {
  if (!process.env.REDIS_URL) {
    return null;
  }
  
  try {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    });
  } catch {
    return null;
  }
};

const redis = getRedisClient();

export const cacheMiddleware = (keyPrefix, ttl = 300) => {
  return async (req, res, next) => {
    if (!redis) {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        try {
          await redis.setex(cacheKey, ttl, JSON.stringify(data));
        } catch (e) {
          console.error('Cache set error:', e.message);
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      next();
    }
  };
};

export const invalidateCache = async (pattern) => {
  if (!redis) return;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (e) {
    console.error('Cache invalidation error:', e.message);
  }
};

export { redis };
