/**
 * Caching Utility
 * Provides memory and Redis-based caching for API responses
 */

const logger = require('./logger');

// In-memory cache
const memoryCache = new Map();

/**
 * Basic in-memory LRU cache
 */
class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = 60000) {
    // If cache is full, remove the oldest entry
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });

    // Schedule removal when expired
    setTimeout(() => {
      if (this.cache.has(key)) {
        const entry = this.cache.get(key);
        if (entry.expiresAt <= Date.now()) {
          this.cache.delete(key);
        }
      }
    }, ttl);

    return value;
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key);
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    // Move the entry to the end to mark as recently used
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get the number of items in the cache
   */
  get size() {
    return this.cache.size;
  }
}

// Create the cache instance
const cache = new LRUCache(500);

/**
 * Middleware for caching API responses
 * @param {number} duration - TTL in seconds
 * @param {Function} keyGenerator - Function to generate cache key
 */
const cacheMiddleware = (duration = 60, keyGenerator = null) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const key = keyGenerator ? 
      keyGenerator(req) : 
      `${req.originalUrl || req.url}`;
    
    // Try to get from cache
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
      logger.debug('Cache hit', { key, url: req.url });
      
      // Set cache header
      res.setHeader('X-Cache', 'HIT');
      
      return res.status(200).json(cachedResponse);
    }

    // Cache miss - store the response
    logger.debug('Cache miss', { key, url: req.url });
    res.setHeader('X-Cache', 'MISS');

    // Intercept the response to store in cache
    const originalSend = res.json;
    res.json = function(body) {
      if (res.statusCode === 200) {
        cache.set(key, body, duration * 1000);
      }
      originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Clear cache entries by pattern
 * @param {string} pattern - Pattern to match cache keys
 */
const clearCache = (pattern) => {
  const keys = Array.from(cache.cache.keys());
  let count = 0;
  
  for (const key of keys) {
    if (pattern && key.includes(pattern)) {
      cache.delete(key);
      count++;
    }
  }
  
  logger.debug(`Cleared ${count} cache entries matching pattern: ${pattern}`);
  return count;
};

/**
 * Middleware to clear cache for specific routes
 * @param {string} pattern - Pattern to match cache keys
 */
const clearCacheMiddleware = (pattern) => {
  return (req, res, next) => {
    // After response, clear cache if successful
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        clearCache(pattern);
      }
    });
    
    next();
  };
};

// Periodically clean up expired items (every 15 minutes)
setInterval(() => {
  let expiredCount = 0;
  const now = Date.now();
  
  for (const [key, entry] of cache.cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    logger.debug(`Cleared ${expiredCount} expired cache entries`);
  }
}, 15 * 60 * 1000);

module.exports = {
  cache,
  cacheMiddleware,
  clearCache,
  clearCacheMiddleware
}; 