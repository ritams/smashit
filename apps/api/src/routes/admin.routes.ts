import { Router } from 'express';
import { orgMiddleware } from '../middleware/org.middleware.js';
import { authMiddleware, ensureOrgAccess, adminMiddleware } from '../middleware/auth.middleware.js';
import { adminLimiter } from '../lib/core.js';
import {
    updateSettings,
    getStats,
    getMembers,
    createSpace,
    updateSpace,
    updateSpaceRules,
    bulkUpdateRules,
    deleteSpace,
} from '../controllers/admin.controller.js';

/**
 * Admin routes - all require authentication and admin role
 */
export const adminRoutes: Router = Router({ mergeParams: true });

// Apply middleware chain
adminRoutes.use(orgMiddleware);
adminRoutes.use(authMiddleware);
adminRoutes.use(ensureOrgAccess);
adminRoutes.use(adminMiddleware);

// Organization settings
adminRoutes.patch('/settings', adminLimiter, updateSettings);

// Dashboard
adminRoutes.get('/stats', getStats);
adminRoutes.get('/members', getMembers);

// Space management
adminRoutes.post('/spaces', createSpace);
adminRoutes.patch('/spaces/:spaceId', updateSpace);
adminRoutes.patch('/spaces/:spaceId/rules', updateSpaceRules);
adminRoutes.post('/spaces/rules/bulk', bulkUpdateRules);
adminRoutes.delete('/spaces/:spaceId', adminLimiter, deleteSpace);
