/**
 * Application configuration
 * All environment variables should be accessed through this file
 */

// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// App Configuration  
export const APP_NAME = 'SmashIt';

// Feature flags
export const ENABLE_SSE = true;
