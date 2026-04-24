/**
 * Role-Based Access Control Factory (RBAC)
 * 
 * Returns customized middleware strictly checking if the user holds 
 * the authorization needed to act on a protected resource.
 * Example hook: `router.delete('/:id', authenticateToken, requireRole('ADMIN'), controller.delete);`
 */
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        // Assumes `authenticateToken` populated req.user already
        const userRole = req.user?.role;
        
        if (!userRole || userRole !== requiredRole) {
            return res.status(403).json({ 
                success: false, 
                message: `RBAC Validation Failed: Access explicitly requires the '${requiredRole}' role.` 
            });
        }
        
        next();
    };
};

module.exports = requireRole;
