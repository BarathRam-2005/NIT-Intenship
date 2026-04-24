/**
 * Tenant Isolation System Middleware
 * 
 * Crucial Multi-Tenant Guard: This cleanly explicitly validates that the authenticated 
 * user actually has an active organization bound to their session. 
 * Any direct data access moving forward relies securely on `req.tenantId`.
 */
const requireTenant = (req, res, next) => {
    // Ensure `authenticateToken` middleware was invoked prior to this!
    if (!req.user || !req.user.organization_id) {
        return res.status(403).json({ 
            success: false, 
            message: 'Tenant Data Isolation Alert: User lacks an active organization connection.' 
        });
    }

    // Isolate context purely to the specified organizational bound
    req.tenantId = req.user.organization_id;
    
    next();
};

module.exports = requireTenant;
