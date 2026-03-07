import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { calculateDirectAttainment } from './src/services/attainmentCalculator.js'

// Import Auth Service
import { registerUser, loginUser } from './src/routes/authRoutes.js'
import { protect, requireAdmin } from './src/middleware/authMiddleware.js'

const app = express()
const prisma = new PrismaClient()

// Middleware
app.use(cors({ origin: 'http://localhost:5173' })) // Allow Vite frontend
app.use(express.json())

// --- Routes ---

// 0. Authentication
app.post('/api/auth/register', registerUser)
app.post('/api/auth/login', loginUser)

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

// 2.a Get Students (Filtered by classId if provided)
app.get('/api/students', async (req, res) => {
  try {
    const { classId } = req.query
    const whereClause = classId ? { academicClassId: classId } : {}
    
    const students = await prisma.student.findMany({
      where: whereClause,
      orderBy: { rollNo: 'asc' }
    })
    res.json(students)
  } catch (error) {
    console.error('Fetch students error:', error)
    res.status(500).json({ error: 'Failed to fetch students.' })
  }
})

// 2b. Get Academic Classes for Dropdown
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

// 2c. Delete an Academic Class (Protected, Admin Only)
app.delete('/api/academic-classes/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await prisma.academicClass.delete({ where: { id } })
    res.json({ message: 'Academic Class deleted securely.' })
  } catch (error) {
    console.error('Delete class error:', error)
    res.status(500).json({ error: 'Failed to delete class.' })
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

// 4b. Update a Course (Protected)
app.put('/api/courses/:id', protect, async (req, res) => {
  try {
    const { id } = req.params
    const { name, theoryCredits, practicalCredits } = req.body

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        name,
        theoryCredits: theoryCredits ? Number(theoryCredits) : undefined,
        practicalCredits: practicalCredits ? Number(practicalCredits) : undefined
      }
    })
    res.json(updatedCourse)
  } catch (error) {
    console.error('Update course error:', error)
    res.status(500).json({ error: 'Failed to update course.' })
  }
})

// 4c. Delete a Course (Protected, Cascades Exams/Marks/Questions)
app.delete('/api/courses/:id', protect, async (req, res) => {
  try {
    const { id } = req.params

    await prisma.course.delete({
      where: { id }
    })
    
    res.json({ message: 'Course successfully deleted.' })
  } catch (error) {
    console.error('Delete course error:', error)
    res.status(500).json({ error: 'Failed to delete course. It may not exist.' })
  }
})

// 5. Get Exams for a specific course
app.get('/api/exams', async (req, res) => {
  try {
    const { courseId } = req.query
    if (!courseId) return res.status(400).json({ error: 'courseId is required' })

    const exams = await prisma.exam.findMany({
      where: { courseId },
      include: {
        questions: {
          include: {
            subQuestions: {
              include: { courseOutcome: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(exams)
  } catch (error) {
    console.error('Fetch exams error:', error)
    res.status(500).json({ error: 'Failed to fetch exams.' })
  }
})

// 6. Create Exam Blueprint (Main + Sub questions)
app.post('/api/exams/blueprint', async (req, res) => {
  try {
    const { name, courseId, totalMarks, questions } = req.body

    if (!name || !courseId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Missing required blueprint data.' })
    }

    // Create the Exam and deeply nest its questions -> subquestions
    const newExam = await prisma.exam.create({
      data: {
        name,
        totalMarks: Number(totalMarks),
        courseId,
        questions: {
          create: questions.map(mainQ => ({
            qNumber: mainQ.qNo, // e.g. "Q1"
            subQuestions: {
              create: mainQ.subQuestions.map(subQ => {
                // Determine CO mapping. In Prisma we link exactly one courseOutcomeId
                // The frontend allows multiple CO strings; for now, we map the first one
                // assuming a strict 1-to-1 OBE standard, or we find its ID.
                return {
                  qNumber: subQ.qNo, // e.g. "a"
                  maxMarks: Number(subQ.marks),
                  courseOutcome: subQ.cos.length > 0 ? {
                    connect: {
                      courseId_coNumber: {
                        courseId: courseId,
                        coNumber: subQ.cos[0]
                      }
                    }
                  } : undefined
                }
              })
            }
          }))
        }
      },
      include: {
        questions: {
          include: { subQuestions: true }
        }
      }
    })

    res.status(201).json(newExam)
  } catch (error) {
    console.error('Create exam blueprint error:', error)
    res.status(500).json({ error: 'Failed to create exam blueprint.' })
  }
})

// 7. Mass Upsert Marks
app.post('/api/marks', async (req, res) => {
  try {
    const { marks } = req.body

    if (!marks || !Array.isArray(marks)) {
      return res.status(400).json({ error: 'A valid marks array is required.' })
    }

    // Use Prisma transaction to perform individual upserts 
    // This allows us to update exist marks or create new ones dynamically based on the composite unique key
    const upsertPromises = marks.map((entry) => 
      prisma.mark.upsert({
        where: {
          studentId_questionId: {
            studentId: entry.studentId,
            questionId: entry.questionId
          }
        },
        update: {
          obtainedMarks: entry.obtainedMarks
        },
        create: {
          studentId: entry.studentId,
          questionId: entry.questionId,
          obtainedMarks: entry.obtainedMarks
        }
      })
    )

    await prisma.$transaction(upsertPromises)

    res.json({ message: 'Marks successfully saved!', count: marks.length })
  } catch (error) {
    console.error('Mass insert error:', error)
    res.status(500).json({ error: 'Failed to save marks into database.' })
  }
})

// 8. Get NBA Direct Attainment Report for a Course
app.get('/api/reports/attainment/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params
    if (!courseId) return res.status(400).json({ error: 'Course ID missing' })

    const attainmentData = await calculateDirectAttainment(courseId)
    
    res.json({
      courseId,
      timestamp: new Date().toISOString(),
      report: attainmentData
    })
  } catch (error) {
    console.error('Attainment calc error:', error)
    res.status(500).json({ error: error.message || 'Failed to calculate attainment' })
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
