import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { calculateAttainment } from './src/services/attainmentCalculator.js'

// Import Auth Service
import { registerUser, loginUser } from './src/routes/authRoutes.js'
import { protect, requireAdmin, requireTeacherOrAdmin } from './src/middleware/authMiddleware.js'
import bcrypt from 'bcryptjs'

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

// Admin Approvals (GET pending)
app.get('/api/admin/pending-users', protect, requireAdmin, async (req, res) => {
  try {
    const pending = await prisma.user.findMany({
      where: { role: { in: ['TEACHER', 'STUDENT'] }, isApproved: false },
      select: { id: true, fullName: true, email: true, department: true, role: true, rollNo: true }
    });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending users.' });
  }
});

// Admin Approval
app.put('/api/admin/approve-user/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({ where: { id }, data: { isApproved: true } });
    res.json({ message: 'User approved successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve user.' });
  }
});

// Global Settings (Parity)
app.get('/api/admin/settings', async (req, res) => {
  try {
    let settings = await prisma.globalSettings.findUnique({ where: { id: "1" } });
    if (!settings) {
      settings = await prisma.globalSettings.create({ data: { id: "1", activeParity: 'ODD' } });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

app.put('/api/admin/settings', protect, requireAdmin, async (req, res) => {
  try {
    const { activeParity } = req.body;
    if (!['ODD', 'EVEN'].includes(activeParity)) {
      return res.status(400).json({ error: 'Invalid parity value' });
    }
    const settings = await prisma.globalSettings.upsert({
      where: { id: "1" },
      update: { activeParity },
      create: { id: "1", activeParity }
    });
    res.json(settings);
  } catch (err) {
    console.error('Settings update error:', err)
    res.status(500).json({ error: err.message || 'Failed to update settings.' });
  }
});

// 2. Bulk Upload Students (from CSV)
app.post('/api/students/bulk-upload', protect, requireTeacherOrAdmin, async (req, res) => {
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

// 3. Get all Courses (with optional Department & Semester filters)
app.get('/api/courses', async (req, res) => {
  try {
    const { department, semester } = req.query
    
    const whereClause = {}
    if (department) whereClause.department = department
    if (semester) whereClause.semester = parseInt(semester)

    const courses = await prisma.course.findMany({
      where: whereClause,
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
app.post('/api/courses', protect, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { code, name, category, department, semester, theoryCredits, practicalCredits, academicClassId, courseOutcomes } = req.body

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
        category: category || 'Major',
        department: department || 'BCA',
        semester: semester ? Number(semester) : 1,
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
app.put('/api/courses/:id', protect, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, category, theoryCredits, practicalCredits } = req.body

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        name,
        category,
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
app.delete('/api/courses/:id', protect, requireTeacherOrAdmin, async (req, res) => {
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

// 4d. Purge All Courses (DANGEROUS: Clears all DB Data linked to courses)
app.delete('/api/courses/clear-all', protect, requireAdmin, async (req, res) => {
  try {
    await prisma.course.deleteMany({})
    res.json({ message: 'All courses and cascading OBE data purged successfully.' })
  } catch (error) {
    console.error('Purge courses error:', error)
    res.status(500).json({ error: 'Failed to purge courses.' })
  }
})

// 4e. Seed entire BCA Curriculum
app.post('/api/courses/seed-bca', protect, requireAdmin, async (req, res) => {
  try {
    // Requires at least one Academic Class to act as the holder
    let defaultClass = await prisma.academicClass.findFirst()
    if (!defaultClass) {
      defaultClass = await prisma.academicClass.create({ data: { name: 'FYBCA' } })
    }

    const bcaCourses = [
      // Semester 1
      { code: 'CSA-100', name: 'Problem Solving and Programming', category: 'Major', department: 'BCA', semester: 1, theoryCredits: 3, practicalCredits: 1 },
      { code: 'MAT-111', name: 'Elementary Mathematics', category: 'Minor', department: 'BCA', semester: 1, theoryCredits: 4, practicalCredits: 0 },
      { code: 'PSY-131', name: 'Psychology of Adjustment', category: 'MC', department: 'BCA', semester: 1, theoryCredits: 3, practicalCredits: 0 },
      { code: 'ENG-151', name: 'Communicative English: Spoken and Written', category: 'AEC', department: 'BCA', semester: 1, theoryCredits: 2, practicalCredits: 0 },
      { code: 'CSA-142', name: 'Python Programming', category: 'SEC', department: 'BCA', semester: 1, theoryCredits: 1, practicalCredits: 2 },
      { code: 'VAC-101', name: 'Environmental Studies II', category: 'VAC', department: 'BCA', semester: 1, theoryCredits: 2, practicalCredits: 0 },
      { code: 'VAC-108', name: 'Introduction to Folktales of India', category: 'VAC', department: 'BCA', semester: 1, theoryCredits: 2, practicalCredits: 0 },
      
      // Semester 2
      { code: 'MAT-100', name: 'Foundational Mathematics', category: 'Major', department: 'BCA', semester: 2, theoryCredits: 3, practicalCredits: 1 },
      { code: 'CSA-111', name: 'Computer System Fundamentals', category: 'Minor', department: 'BCA', semester: 2, theoryCredits: 4, practicalCredits: 0 },
      { code: 'PSY-132', name: 'Environmental Psychology', category: 'MC', department: 'BCA', semester: 2, theoryCredits: 3, practicalCredits: 0 },
      { code: 'ENG-152', name: 'Digital Content Creation in English', category: 'AEC', department: 'BCA', semester: 2, theoryCredits: 2, practicalCredits: 0 },
      { code: 'CSA-143', name: 'Data Analytics Using Spreadsheets', category: 'SEC', department: 'BCA', semester: 2, theoryCredits: 1, practicalCredits: 2 },
      { code: 'VAC-111', name: 'E-Waste Management', category: 'VAC', department: 'BCA', semester: 2, theoryCredits: 2, practicalCredits: 0 },
      { code: 'VAC-117', name: 'Youth Empowerment using Mind Mapping', category: 'VAC', department: 'BCA', semester: 2, theoryCredits: 2, practicalCredits: 0 },
      
      // Semester 3
      { code: 'CSA-200', name: 'Data Structures', category: 'Major', department: 'BCA', semester: 3, theoryCredits: 3, practicalCredits: 1 },
      { code: 'CSA-201', name: 'Database Management Systems', category: 'Major', department: 'BCA', semester: 3, theoryCredits: 3, practicalCredits: 1 },
      { code: 'CSA-211', name: 'Reasoning Techniques', category: 'Minor', department: 'BCA', semester: 3, theoryCredits: 3, practicalCredits: 1 },
      { code: 'PSY-231', name: 'Relationship Psychology', category: 'MC', department: 'BCA', semester: 3, theoryCredits: 3, practicalCredits: 0 },
      { code: 'HIN-251', name: 'सम्प्रेषण कौशल (Communication Skill)', category: 'AEC', department: 'BCA', semester: 3, theoryCredits: 2, practicalCredits: 0 },
      { code: 'CSA-241', name: 'Multimedia Applications', category: 'SEC', department: 'BCA', semester: 3, theoryCredits: 1, practicalCredits: 2 },

      // Semester 4
      { code: 'CSA-202', name: 'Web App Development', category: 'Major', department: 'BCA', semester: 4, theoryCredits: 1, practicalCredits: 3 },
      { code: 'CSA-203', name: 'Agile Methodologies', category: 'Major', department: 'BCA', semester: 4, theoryCredits: 3, practicalCredits: 1 },
      { code: 'CSA-204', name: 'Object Oriented Concepts', category: 'Major', department: 'BCA', semester: 4, theoryCredits: 3, practicalCredits: 1 },
      { code: 'CSA-205', name: 'Web Technology', category: 'Major', department: 'BCA', semester: 4, theoryCredits: 2, practicalCredits: 0 },
      { code: 'CSA-221', name: 'Digital Marketing Fundamentals', category: 'Minor', department: 'BCA', semester: 4, theoryCredits: 3, practicalCredits: 1 },
      { code: 'HIN-252', name: 'संभाषण कला (Sambhashan kala)', category: 'AEC', department: 'BCA', semester: 4, theoryCredits: 2, practicalCredits: 0 },

      // Semester 5
      { code: 'CSA-300', name: 'UI- UX Design', category: 'Major', department: 'BCA', semester: 5, theoryCredits: 3, practicalCredits: 1 },
      { code: 'CSA-301', name: 'Full Stack Development', category: 'Major', department: 'BCA', semester: 5, theoryCredits: 1, practicalCredits: 3 },
      { code: 'CSA-302', name: 'Cloud Computing', category: 'Major', department: 'BCA', semester: 5, theoryCredits: 3, practicalCredits: 1 },
      { code: 'CSA-303', name: 'Internet Technologies', category: 'Major', department: 'BCA', semester: 5, theoryCredits: 2, practicalCredits: 0 },
      { code: 'CSA-321', name: '(Internship) (VET)', category: 'Minor', department: 'BCA', semester: 5, theoryCredits: 4, practicalCredits: 0 },
      { code: 'CSA-361', name: '(Summer Internship)', category: 'I', department: 'BCA', semester: 5, theoryCredits: 2, practicalCredits: 0 },

      // Semester 6
      { code: 'CSA-304', name: 'Cyber Security', category: 'Major', department: 'BCA', semester: 6, theoryCredits: 3, practicalCredits: 1 },
      { code: 'CSA-305', name: 'Mobile App Development', category: 'Major', department: 'BCA', semester: 6, theoryCredits: 1, practicalCredits: 3 },
      { code: 'CSA-306', name: 'Machine Learning', category: 'Major', department: 'BCA', semester: 6, theoryCredits: 3, practicalCredits: 1 },
      { code: 'CSA-307', name: 'Project', category: 'Major', department: 'BCA', semester: 6, theoryCredits: 4, practicalCredits: 0 },
      { code: 'CSA-322', name: 'Social Media Marketing & Analytics (VET)', category: 'Minor', department: 'BCA', semester: 6, theoryCredits: 3, practicalCredits: 1 },
    ]

    const seededRecords = await prisma.course.createMany({
      data: bcaCourses.map(c => ({ ...c, academicClassId: defaultClass.id })),
      skipDuplicates: true
    })

    res.json({ message: 'Successfully seeded the entire BCA curriculum.', seededCount: seededRecords.count })
  } catch (error) {
    console.error('Seed BCA courses error:', error)
    res.status(500).json({ error: 'Failed to execute the BCA curriculum seed script.' })
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
app.post('/api/exams/blueprint', protect, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { name, courseId, totalMarks, questions } = req.body

    if (!name || !courseId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Missing required blueprint data.' })
    }

    // Wrap in a transaction to ensure atomic saves, with a 15-second wide threshold
    const newExam = await prisma.$transaction(async (tx) => {
      // 1. Fetch available COs globally to instantly drop 30+ sequential queries
      const courseCOs = await tx.courseOutcome.findMany({ where: { courseId } })

      // 2. Create the base Exam
      const exam = await tx.exam.create({
        data: {
          name,
          totalMarks: Number(totalMarks),
          courseId
        }
      })

      // 3. Iterate through main questions sequentially
      for (const mainQ of questions) {
        const parent = await tx.question.create({
          data: {
            qNumber: mainQ.qNo,
            examId: exam.id
          }
        })

        // 4. Iterate through sub-questions mapping efficiently
        if (mainQ.subQuestions && mainQ.subQuestions.length > 0) {
          for (const subQ of mainQ.subQuestions) {
            
            // Resolve CO ID directly from memory buffer
            let courseOutcomeId = null
            if (subQ.cos && subQ.cos.length > 0) {
               const matchingCO = courseCOs.find(co => co.coNumber === subQ.cos[0])
               if (matchingCO) courseOutcomeId = matchingCO.id
            }

            await tx.question.create({
              data: {
                qNumber: subQ.qNo,
                maxMarks: Number(subQ.marks),
                examId: exam.id, 
                parentQuestionId: parent.id, 
                courseOutcomeId
              }
            })
          }
        }
      }

      return exam
    }, { timeout: 15000, maxWait: 15000 })

    res.status(201).json(newExam)
  } catch (error) {
    console.error('Create exam blueprint error:', error)
    
    // DEBUG TRAP: Save the exact payload and error to disk for analysis
    try {
      require('fs').writeFileSync(
        require('path').join(__dirname, 'blueprint_crash.json'), 
        JSON.stringify({ body: req.body, error: error.message || String(error), stack: error.stack }, null, 2)
      )
    } catch (e) { /* ignore */ }

    // Send the exact stack trace to the frontend so the user alert tells us EXACTLY what broke!
    res.status(500).json({ error: error.message || String(error) })
  }
})

app.delete('/api/exams/:id', protect, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await prisma.exam.delete({
      where: { id }
    })
    res.json({ message: 'Exam blueprint deleted successfully' })
  } catch (error) {
    console.error('Delete exam error:', error)
    res.status(500).json({ error: 'Failed to delete exam blueprint.' })
  }
})

// --- PHASE 24 GRID ENDPOINTS ---

app.get('/api/courses/:id/enrollments-exams', protect, async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        academicClass: {
          include: { 
            students: { orderBy: { rollNo: 'asc' } } 
          }
        },
        exams: {
          include: {
            questions: {
              where: { parentQuestionId: null },
              orderBy: { qNumber: 'asc' },
              include: {
                subQuestions: {
                  orderBy: { qNumber: 'asc' },
                  include: { courseOutcome: true, marks: true }
                }
              }
            }
          }
        }
      }
    })
    
    if (!course) return res.status(404).json({ error: 'Course not found' })

    res.json({
      students: course.academicClass?.students || [],
      exams: course.exams || []
    })
  } catch (err) {
    console.error('Enrollments fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch course data' })
  }
})

app.post('/api/mappings/co-po', protect, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { mappings } = req.body
    if (!mappings || !Array.isArray(mappings)) return res.status(400).json({ error: 'Invalid mappings data' })

    const upsertPromises = mappings.map(mapping => {
      // If correlationLevel is 0, we can ideally delete it. But for upsert, let's let it be saved as 0 or handle logic later.
      if (mapping.type === 'PO') {
        return prisma.cO_PO_Mapping.upsert({
          where: {
            courseOutcomeId_programOutcomeId: {
              courseOutcomeId: mapping.courseOutcomeId,
              programOutcomeId: mapping.targetId
            }
          },
          update: { correlationLevel: mapping.correlationLevel },
          create: {
            courseOutcomeId: mapping.courseOutcomeId,
            programOutcomeId: mapping.targetId,
            correlationLevel: mapping.correlationLevel
          }
        })
      } else {
        return prisma.cO_PSO_Mapping.upsert({
          where: {
            courseOutcomeId_programSpecificOutcomeId: {
              courseOutcomeId: mapping.courseOutcomeId,
              programSpecificOutcomeId: mapping.targetId
            }
          },
          update: { correlationLevel: mapping.correlationLevel },
          create: {
            courseOutcomeId: mapping.courseOutcomeId,
            programSpecificOutcomeId: mapping.targetId,
            correlationLevel: mapping.correlationLevel
          }
        })
      }
    })

    await prisma.$transaction(upsertPromises)
    res.json({ message: 'Mappings saved successfully' })
  } catch(error) {
    console.error('Save mappings error:', error)
    res.status(500).json({ error: 'Failed to save mappings' })
  }
})

// 7. Mass Upsert Marks
app.post('/api/marks', protect, requireTeacherOrAdmin, async (req, res) => {
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

    const attainmentData = await calculateAttainment(courseId)
    
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

// 9. Detailed Grid Report Endpoint (For Excel-like rendered table)
app.get('/api/reports/detailed/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params
    
    // Fetch Course & Enrolled Students
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        academicClass: {
          include: {
            students: { orderBy: { rollNo: 'asc' } }
          }
        }
      }
    })
    
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const students = course.academicClass.students

    // Fetch all exams logically tied to course, including nested questions & marks
    const exams = await prisma.exam.findMany({
      where: { courseId },
      include: {
        questions: {
          include: {
            subQuestions: {
              include: { marks: true, courseOutcome: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Prepare arrays
    const flatQuestions = []
    const marksGrid = {} // studentId -> { questionId -> obtainedMarks }
    const calculations = {} // questionId -> { threshold, passedCount, passPct, level, co }
    const totalStudentsCount = students.length

    // Initialize student matrix
    students.forEach(s => { marksGrid[s.id] = {} })

    // Process questions
    exams.forEach(exam => {
      exam.questions.forEach(mainQ => {
        mainQ.subQuestions.forEach(subQ => {
          flatQuestions.push({
            id: subQ.id,
            label: `${exam.name} - ${mainQ.qNumber}${subQ.qNumber}`,
            maxMarks: subQ.maxMarks
          })

          const thresholdMark = subQ.maxMarks * 0.40
          let passedCount = 0

          subQ.marks.forEach(markRecord => {
            // Fill student grid cell
            if (marksGrid[markRecord.studentId]) {
              marksGrid[markRecord.studentId][subQ.id] = markRecord.obtainedMarks
            }
            // Math calculate pass logic
            if (markRecord.obtainedMarks >= thresholdMark) {
               passedCount++
            }
          })

          const passPct = totalStudentsCount > 0 ? (passedCount / totalStudentsCount) * 100 : 0
          
          let level = 0
          if (passPct > 70) level = 3
          else if (passPct > 60) level = 2
          else if (passPct >= 50) level = 1

          calculations[subQ.id] = {
            thresholdMark,
            passedCount,
            passPct: passPct.toFixed(2),
            level,
            co: subQ.courseOutcome?.coNumber || 'N/A'
          }
        })
      })
    })

    res.json({
      courseDetails: { code: course.code, name: course.name, category: course.category },
      students: students.map(s => ({ id: s.id, rollNo: s.rollNo, name: s.name })),
      questions: flatQuestions,
      marksGrid,
      calculations
    })

  } catch (error) {
    console.error('Detailed Report Error:', error)
    res.status(500).json({ error: 'Failed to aggregate detailed grid calculation data.' })
  }
})

// 10. Master Dashboard Analytics (Protected)
app.get('/api/dashboard', protect, async (req, res) => {
  try {
    // 1. Get exact active entities count
    const totalStudents = await prisma.student.count()
    const activeCourses = await prisma.course.count()

    // 2. Fetch all courses logically to run the mass attainment engine
    const courses = await prisma.course.findMany({ select: { id: true, name: true } })
    
    let totalAssessedCOs = 0
    let sumOfAllFinalCOLevels = 0
    let targetMetCount = 0

    // Compute institution-wide Recharts data map per Course
    const chartData = []

    // Parallelize all 37+ course calculations simultaneously
    const courseResults = await Promise.all(
      courses.map(async (course) => {
        try {
          const result = await calculateAttainment(course.id)
          return { course, result }
        } catch (err) {
          console.warn(`Dashboard aggregation warning for Course ${course.id}:`, err.message)
          return { course, result: null }
        }
      })
    )

    for (const { course, result } of courseResults) {
      if (!result) continue;

      let courseCoTotalLevel = 0
      let courseAssessedCos = 0

      result.coAttainment.forEach(co => {
        if (co.timesAssessed > 0) {
          courseAssessedCos++
          totalAssessedCOs++
          sumOfAllFinalCOLevels += co.finalAttainmentLevel
          courseCoTotalLevel += co.finalAttainmentLevel
          
          if (co.directAttainmentPercentage >= co.targetThresholdPct) {
            targetMetCount++
          }
        }
      })

      if (courseAssessedCos > 0) {
        const avgLevel = courseCoTotalLevel / courseAssessedCos
        chartData.push({
          name: course.name.substring(0, 15) + (course.name.length > 15 ? '...' : ''),
          Attainment: Number(avgLevel.toFixed(2)),
          Target: 2.0
        })
      }
    }

    // 3. Mathematical Global Averages
    const avgCoAttainment = totalAssessedCOs > 0 ? (sumOfAllFinalCOLevels / totalAssessedCOs) : 0

    // Construct Recharts Payload
    res.json({
      stats: [
        { title: 'Total Students', value: totalStudents },
        { title: 'Active Courses', value: activeCourses },
        { title: 'Avg CO Attainment', value: `${avgCoAttainment.toFixed(2)} / 3.0` },
        { title: 'COs Meeting Target', value: targetMetCount }
      ],
      chartData: chartData
    })
  } catch (error) {
    console.error('Dashboard aggregation error:', error)
    res.status(500).json({ error: 'Failed to aggregate dashboard analytics' })
  }
})


// 10. Fetch Program Outcomes & PSOs
app.get('/api/pos', protect, async (req, res) => {
  try {
    const pos = await prisma.programOutcome.findMany({ orderBy: { code: 'asc' } })
    const psos = await prisma.programSpecificOutcome.findMany({ orderBy: { code: 'asc' } })
    
    // Custom sort to ensure PO1 comes before PO10
    const sortOutcomes = (outcomes) => {
      return outcomes.sort((a, b) => {
        const numA = parseInt(a.code.replace(/\D/g, ''))
        const numB = parseInt(b.code.replace(/\D/g, ''))
        return numA - numB
      })
    }
    
    res.json({
      pos: sortOutcomes(pos),
      psos: sortOutcomes(psos)
    })
  } catch (error) {
    console.error('Fetch POs error:', error)
    res.status(500).json({ error: 'Failed to fetch program outcomes.' })
  }
})

// 11. Fetch Existing CO-PO Mappings for a Course
app.get('/api/mappings/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params
    
    // We fetch the COs for this course and include their specific coPoMappings and coPsoMappings
    const courseOutcomes = await prisma.courseOutcome.findMany({
      where: { courseId },
      include: { 
        coPoMappings: true,
        coPsoMappings: true
      },
      orderBy: { coNumber: 'asc' }
    })
    
    res.json(courseOutcomes)
  } catch (error) {
    console.error('Fetch mappings error:', error)
    res.status(500).json({ error: 'Failed to fetch existing mappings.' })
  }
})

// 12. Save CO-PO Mappings (Mass Upsert)
app.post('/api/mappings', protect, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { mappings } = req.body
    
    if (!mappings || !Array.isArray(mappings)) {
      return res.status(400).json({ error: 'A valid mappings array is required.' })
    }

    // mappings expected shape: [{ courseOutcomeId, programOutcomeId, correlationLevel }]
    const upsertPromises = mappings.map((entry) => 
      prisma.cO_PO_Mapping.upsert({
        where: {
          courseOutcomeId_programOutcomeId: {
            courseOutcomeId: entry.courseOutcomeId,
            programOutcomeId: entry.programOutcomeId
          }
        },
        update: {
          correlationLevel: entry.correlationLevel
        },
        create: {
          courseOutcomeId: entry.courseOutcomeId,
          programOutcomeId: entry.programOutcomeId,
          correlationLevel: entry.correlationLevel
        }
      })
    )

    await prisma.$transaction(upsertPromises)

    res.json({ message: 'Mappings successfully saved!', count: mappings.length })
  } catch (error) {
    console.error('Save mappings error:', error)
    res.status(500).json({ error: 'Failed to securely save mappings.' })
  }
})


// 13. Save Course Exit Surveys (Mass Upsert)
app.post('/api/surveys', protect, async (req, res) => {
  try {
    const { surveys } = req.body
    
    if (!surveys || !Array.isArray(surveys)) {
      return res.status(400).json({ error: 'A valid survey responses array is required.' })
    }

    // Survey expected shape: [{ studentId, courseId, courseOutcomeId, rating }]
    // We strictly use the unique compound key studentId_courseOutcomeId
    const upsertPromises = surveys.map((entry) => 
      prisma.courseExitSurvey.upsert({
        where: {
          studentId_courseOutcomeId: {
            studentId: entry.studentId,
            courseOutcomeId: entry.courseOutcomeId
          }
        },
        update: {
          rating: entry.rating
        },
        create: {
          studentId: entry.studentId,
          courseId: entry.courseId,
          courseOutcomeId: entry.courseOutcomeId,
          rating: entry.rating
        }
      })
    )

    await prisma.$transaction(upsertPromises)

    res.json({ message: 'Survey successfully captured!', count: surveys.length })
  } catch (error) {
    console.error('Save survey error:', error)
    res.status(500).json({ error: 'Failed to securely save survey responses.' })
  }
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal Server Error' })
})

// --- Server Startup ---
const PORT = process.env.PORT || 5000

// --- STUDENT COURSE EXIT SURVEY ENDPOINTS ---

app.get('/api/student/pending-surveys', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can view pending surveys' })
    if (!user.rollNo) return res.status(400).json({ error: 'Student Roll No not found in profile' })

    const student = await prisma.student.findUnique({ where: { rollNo: user.rollNo } })
    if (!student) return res.status(404).json({ error: 'Student academic record not found in system' })

    const courses = await prisma.course.findMany({
      where: { academicClassId: student.academicClassId },
      include: {
        courseOutcomes: true,
        courseExitSurveys: {
          where: { studentId: student.id }
        }
      }
    })

    const pendingCourses = courses.filter(course => {
      return course.courseOutcomes.length > 0 && 
             course.courseExitSurveys.length < course.courseOutcomes.length
    })

    const payload = pendingCourses.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      courseOutcomes: c.courseOutcomes,
      studentId: student.id
    }))

    res.json(payload)
  } catch(error) {
    console.error('Pending surveys error:', error)
    res.status(500).json({ error: 'Failed to fetch pending surveys' })
  }
})

app.post('/api/student/submit-survey', protect, async (req, res) => {
  try {
    const { courseId, studentId, ratings } = req.body
    
    const surveyData = ratings.map(r => ({
      rating: parseInt(r.rating),
      studentId: studentId,
      courseId: courseId,
      courseOutcomeId: r.courseOutcomeId
    }))

    await prisma.courseExitSurvey.createMany({
      data: surveyData,
      skipDuplicates: true
    })

    res.json({ message: 'Survey submitted successfully' })
  } catch(error) {
    console.error('Submit survey error:', error)
    res.status(500).json({ error: 'Failed to submit survey' })
  }
})

// 18. Get Student Specific Marks List
app.get('/api/student/marks', protect, async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' })

    const userEntry = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!userEntry || !userEntry.rollNo) return res.status(400).json({ error: 'Missing Roll Number' })

    const student = await prisma.student.findUnique({ where: { rollNo: userEntry.rollNo } })
    if (!student) return res.status(404).json({ error: 'Academic record not found' })

    const targetSem = req.query.sem ? parseInt(req.query.sem) : student.currentSemester
    if (targetSem > student.currentSemester) {
       return res.status(403).json({ error: 'Cannot access future semester transcripts.' })
    }

    const courses = await prisma.course.findMany({
      where: {
        semester: targetSem,
        academicClass: {
          students: { some: { id: student.id } }
        }
      },
      include: {
        exams: {
           orderBy: { createdAt: 'asc' },
           include: {
              questions: {
                 orderBy: { qNumber: 'asc' },
                 include: {
                    subQuestions: {
                       orderBy: { qNumber: 'asc' },
                       include: {
                          courseOutcome: true,
                          marks: { where: { studentId: student.id } }
                       }
                    }
                 }
              }
           }
        }
      }
    })

    const payload = courses.map(c => {
      const results = []
      c.exams.forEach(ex => {
        ex.questions.forEach(q => {
          q.subQuestions.forEach(sq => {
            const m = sq.marks[0]
            const got = m ? m.obtainedMarks : null
            const isPass = got !== null ? got >= (sq.maxMarks * 0.40) : null
            results.push({
               examCode: ex.name,
               qLabel: `${q.qNumber}${sq.qNumber}`,
               co: sq.courseOutcome?.coNumber || 'N/A',
               max: sq.maxMarks,
               got: got,
               pass: isPass
            })
          })
        })
      })
      return { id: c.id, code: c.code, name: c.name, marksList: results }
    })

    res.json({
       currentSemester: student.currentSemester,
       targetSemester: targetSem,
       courses: payload
    })
  } catch (error) {
    console.error('Student marks fail:', error)
    res.status(500).json({ error: 'Failed' })
  }
})

const bootstrapClasses = async () => {
  try {
    const classes = [
      'FYBCA', 'SYBCA', 'TYBCA',
      'FYBA', 'SYBA', 'TYBA',
      'FYBCOM', 'SYBCOM', 'TYBCOM',
      'FYBBA', 'SYBBA', 'TYBBA'
    ]
    for (const className of classes) {
      const existing = await prisma.academicClass.findFirst({ where: { name: className } })
      if (!existing) {
        await prisma.academicClass.create({ data: { name: className } })
      }
    }
    console.log('✅ Default Academic Classes Seeded');
  } catch(e) {
    console.warn("Could not bootstrap classes:", e.message)
  }
}

const bootstrapDefaultUsers = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Admin
    await prisma.user.upsert({
      where: { email: 'admin@bridgify.com' },
      update: {},
      create: { fullName: 'System Admin', email: 'admin@bridgify.com', password: hashedPassword, role: 'ADMIN', department: 'IT', isApproved: true }
    });
    // Teacher
    await prisma.user.upsert({
      where: { email: 'teacher@bridgify.com' },
      update: {},
      create: { fullName: 'Demo Teacher', email: 'teacher@bridgify.com', password: hashedPassword, role: 'TEACHER', department: 'BCA', isApproved: true }
    });
    // Student
    await prisma.user.upsert({
      where: { email: 'student@bridgify.com' },
      update: {},
      create: { fullName: 'Demo Student', email: 'student@bridgify.com', password: hashedPassword, role: 'STUDENT', department: 'BCA', rollNo: '101', className: 'FYBCA', division: 'A' }
    });
    console.log('✅ Default RBAC Users Seeded (admin, teacher, student)');
  } catch(e) {
    console.warn("Could not bootstrap users:", e.message)
  }
}

app.listen(PORT, async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  await bootstrapClasses()
  await bootstrapDefaultUsers()
})
