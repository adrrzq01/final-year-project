import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_super_secret_bridgify_key'

// User Registration Route (Public initially to bootstrap)
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create User
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'TEACHER' // Default to teacher
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser
    res.status(201).json(userWithoutPassword)

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to register user' })
  }
}


// User Login Route (Public)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find User
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Intentionally vague error for security
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Compare Password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JSON Web Token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    )

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to process login' })
  }
}
