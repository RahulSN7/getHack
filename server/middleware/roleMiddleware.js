// ---------------------------------------------------------------------------
// server/middleware/roleMiddleware.js — Role Authorization Middleware
// Enforces server-side authorization check based on authenticated DB user.role.
// ---------------------------------------------------------------------------

const requireRole = (allowedRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated. Please log in." });
    }

    if (req.user.role !== allowedRole) {
      return res.status(403).json({
        message: `Access denied. ${allowedRole.charAt(0).toUpperCase() + allowedRole.slice(1)} role required.`,
      });
    }

    next();
  };
};

const requireOrganizer = requireRole("organizer");
const requireParticipant = requireRole("participant");

module.exports = {
  requireRole,
  requireOrganizer,
  requireParticipant,
};
