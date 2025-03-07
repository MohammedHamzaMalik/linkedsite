const authMiddleware = (req, res, next) => {
  if (!req.session.linkedinAccessToken || !req.session.linkedinId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please login first'
    });
  }
  next();
};

module.exports = authMiddleware;