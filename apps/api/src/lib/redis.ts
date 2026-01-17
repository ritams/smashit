import Redis from 'ioredis';
import { createLogger } from './core.js';

const log = createLogger('Redis');
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
    log.error('Connection error', { error: err.message });
});

redis.on('connect', () => {
    log.info('Connected to Redis');
});

