import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

// Middleware
app.use(cors({ origin: 'http://localhost:5173' })) // Allow Vite frontend
app.use(express.json())

// --- Routes ---

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bridgify API is running' })
})

// 2. Bulk Upload Students (from CSV)
app.post('/api/students/bulk-upload', async (req, res) => {
  try {
    const { students } = req.body

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty students array provided.' })
    }

    // Since users upload students for a specific class, they need an academicClassId.
    // In a real flow, the frontend passes this ID. If not provided for this early phase,
    // we'll try to find or create a default "Unassigned" class to link them to.
    let { academicClassId } = req.body

    if (!academicClassId) {
      let defaultClass = await prisma.academicClass.findFirst({
        where: { name: 'Default Batch' }
      })
      if (!defaultClass) {
        defaultClass = await prisma.academicClass.create({
          data: { name: 'Default Batch' }
        })
      }
      academicClassId = defaultClass.id
    }

    // Map the incoming data to match Prisma schema
    const formattedStudents = students.map(s => ({
      rollNo: s.rollNo,
      name: s.name,
      academicClassId: academicClassId
    }))

    // Execute bulk insert, skipping duplicates based on rollNo (unique constraint)
    const result = await prisma.student.createMany({
      data: formattedStudents,
      skipDuplicates: true,
    })

    res.status(201).json({
      message: `Successfully uploaded ${result.count} new students.`,
      count: result.count
    })

  } catch (error) {
    console.error('Bulk upload error:', error)
    res.status(500).json({ error: 'An error occurred during bulk upload.' })
  }
})

// 2a. Get Academic Classes for Dropdown
app.get('/api/academic-classes', async (req, res) => {
  try {
    const classes = await prisma.academicClass.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(classes)
  } catch (error) {
    console.error('Fetch classes error:', error)
    res.status(500).json({ error: 'Failed to fetch academic classes.' })
  }
})

// 3. Get all Courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        academicClass: true,
        courseOutcomes: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(courses)
  } catch (error) {
    console.error('Fetch courses error:', error)
    res.status(500).json({ error: 'Failed to fetch courses.' })
  }
})

// 4. Create a new Course and nested COs
app.post('/api/courses', async (req, res) => {
  try {
    const { code, name, theoryCredits, practicalCredits, academicClassId, courseOutcomes } = req.body

    if (!code || !name) {
      return res.status(400).json({ error: 'Course code and name are required.' })
    }

    if (!academicClassId) {
      return res.status(400).json({ error: 'Academic Class is required.' })
    }

    if (!courseOutcomes || !Array.isArray(courseOutcomes) || courseOutcomes.length < 4 || courseOutcomes.length > 6) {
      return res.status(400).json({ error: 'Exactly 4 to 6 Course Outcomes are required.' })
    }

    // Validate CO formats
    for (const co of courseOutcomes) {
      if (!co.coNumber || !co.description || co.targetPct == null) {
        return res.status(400).json({ error: 'Each CO must have a number, description, and target percentage.' })
      }
    }

    // Check for existing course code
    const existing = await prisma.course.findUnique({ where: { code } })
    if (existing) {
      return res.status(400).json({ error: `Course with code ${code} already exists.` })
    }

    // Map the nested COs for Prisma
    const coData = courseOutcomes.map(co => ({
      coNumber: co.coNumber,
      description: co.description,
      targetPct: Number(co.targetPct) || 75.0,
    }))

    const newCourse = await prisma.course.create({
      data: {
        code,
        name,
        theoryCredits: Number(theoryCredits) || 0,
        practicalCredits: Number(practicalCredits) || 0,
        academicClassId: academicClassId,
        courseOutcomes: {
          create: coData
        }
      },
      include: {
        academicClass: true,
        courseOutcomes: true,
      }
    })

    res.status(201).json(newCourse)
  } catch (error) {
    console.error('Create course error:', error)
    res.status(500).json({ error: 'Failed to create course.' })
  }
})


// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal Server Error' })
})

// --- Server Startup ---
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
})
