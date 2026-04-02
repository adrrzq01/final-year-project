import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_super_secret_bridgify_key'

// User Registration Route (Public initially to bootstrap)
export const registerUser = async (req, res) => {
  try {
    const { 
      fullName, email, password, role, phoneNo,
      department, rollNo, className, division, currentSemester, // Student specific
      departments, employmentType, assignedSemester, assignedCourseIds // Teacher specific
    } = req.body

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Full Name, email, password, and role are required' })
    }

    if (role === 'STUDENT' && (!department || !rollNo || !className || !division)) {
       return res.status(400).json({ error: 'Students must provide Department, Roll No, Class, and Division' })
    }
    
    if (role === 'TEACHER' && (!departments || departments.length === 0)) {
       return res.status(400).json({ error: 'Teachers must select at least one department' })
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
        fullName,
        email,
        password: hashedPassword,
        role: role,
        phoneNo,
        isApproved: role === 'ADMIN' ? true : false, // Strictly force false for TEACHER and STUDENT
        // Student Specific
        department: role === 'STUDENT' ? department : null,
        rollNo: role === 'STUDENT' ? rollNo : null,
        className: role === 'STUDENT' ? className : null,
        division: role === 'STUDENT' ? division : null,
        currentSemester: role === 'STUDENT' ? (Number(currentSemester) || 1) : 1,
        // Teacher Specific
        departments: role === 'TEACHER' ? (departments || []) : [],
        employmentType: role === 'TEACHER' ? (employmentType || 'PERMANENT') : 'PERMANENT',
        assignedSemester: role === 'TEACHER' && employmentType === 'TEMPORARY' ? Number(assignedSemester) : null,
        assignedCourseIds: role === 'TEACHER' && employmentType === 'TEMPORARY' ? assignedCourseIds : null
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

    // Auto-Deactivation Logic for Temporary Faculty
    if (user.role === 'TEACHER' && user.employmentType === 'TEMPORARY') {
      const settings = await prisma.globalSettings.findFirst()
      const activeParity = settings?.activeParity || 'ODD'
      const allowedSemesters = activeParity === 'ODD' ? [1, 3, 5] : [2, 4, 6]

      if (user.assignedSemester && !allowedSemesters.includes(user.assignedSemester)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false }
        })
        return res.status(403).json({ error: 'Term expired. Please re-register or contact Admin.' })
      }
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account is inactive. Term expired or suspended.' })
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
