import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_super_secret_bridgify_key'

// Middleware to protect routes that require authentication
export const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from header "Bearer <token>"
      token = req.headers.authorization.split(' ')[1]

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET)

      // Attach user payload to request
      req.user = decoded
      
      next()
    } catch (error) {
      console.error('Token verification failed:', error.message)
      res.status(401).json({ error: 'Not authorized, token failed' })
    }
  } else {
    res.status(401).json({ error: 'Not authorized, no token provided' })
  }
}

// Optional middleware to strictly require an ADMIN role
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next()
  } else {
    res.status(403).json({ error: 'Access forbidden: Admin clearance required' })
  }
}
