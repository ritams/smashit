import { Router } from 'express';
import { orgMiddleware } from '../middleware/org.middleware.js';
import { authMiddleware, ensureOrgAccess, adminMiddleware } from '../middleware/auth.middleware.js';
import { adminLimiter } from '../lib/core.js';
import {
    updateSettings,
    getStats,
    getMembers,
    getFacilities,
    createFacility,
    updateFacility,
    updateFacilityRules,
    bulkUpdateFacilityRules,
    deleteFacility,
    createSpace,
    updateSpace,
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

// Facility management
adminRoutes.get('/facilities', getFacilities);
adminRoutes.post('/facilities', createFacility);
adminRoutes.patch('/facilities/:facilityId', updateFacility);
adminRoutes.patch('/facilities/:facilityId/rules', updateFacilityRules);
adminRoutes.post('/facilities/rules/bulk', bulkUpdateFacilityRules);
adminRoutes.delete('/facilities/:facilityId', adminLimiter, deleteFacility);

// Space management
adminRoutes.post('/spaces', createSpace);
adminRoutes.patch('/spaces/:spaceId', updateSpace);
adminRoutes.delete('/spaces/:spaceId', adminLimiter, deleteSpace);

