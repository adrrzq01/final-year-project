import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { calculateAttainment } from './src/services/attainmentCalculator.js'

import * as fuzz from 'fuzzball'

// Import Auth Service
import { registerUser, loginUser, changePassword } from './src/routes/authRoutes.js'
import { protect, requireAdmin, requireTeacherOrAdmin } from './src/middleware/authMiddleware.js'
import bcrypt from 'bcryptjs'

// Import Calendar Engine
import { getAcademicCycle } from './src/utils/calendarEngine.js'

const app = express()
const prisma = new PrismaClient()

function getAllowedSemesters(className) {
  if (!className) return [1, 2, 3, 4, 5, 6];
  
  if (className.startsWith('FY')) return [1, 2];
  if (className.startsWith('SY')) return [3, 4];
  if (className.startsWith('TY')) return [5, 6];
  return [1, 2, 3, 4, 5, 6];
}


// Middleware
app.use(cors({ origin: 'http://localhost:5173' })) // Allow Vite frontend
app.use(express.json())

// --- Routes ---

// 0. Authentication
app.post('/api/auth/register', registerUser)
app.post('/api/auth/login', loginUser)
app.put('/api/auth/change-password', protect, changePassword)

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

// Admin Faculty Directory
app.get('/api/admin/faculty', protect, requireAdmin, async (req, res) => {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: { id: true, fullName: true, email: true, departments: true, employmentType: true, isActive: true, isApproved: true }
    });
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch faculty directory.' });
  }
});

// Admin Student Directory
app.get('/api/admin/directory/students', protect, requireAdmin, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        academicClass: true,
        marks: {
          include: {
            question: { include: { exam: true } }
          }
        }
      }
    });

    const transformed = students.map(student => {
      let totalISA = 0;
      let totalSEE = 0;

      for (let mark of student.marks) {
        if (!mark.question || !mark.question.exam) continue;
        const examName = mark.question.exam.name.toUpperCase();
        if (examName.includes('ISA')) {
          totalISA += Number(mark.obtainedMarks || 0);
        } else if (examName.includes('SEE') || examName.includes('ESE')) {
          totalSEE += Number(mark.obtainedMarks || 0);
        }
      }

      return {
        id: student.id,
        rollNo: student.rollNo,
        name: student.name,
        // Optional schema fallbacks ensuring rendering safety depending on which Phase migrations fired
        department: student.department || 'BCA',
        className: student.academicClass?.name || student.className || 'N/A',
        division: student.division || 'A',
        currentSemester: student.currentSemester || 1,
        totalISA,
        totalSEE
      };
    });

    res.json(transformed);
  } catch (err) {
    console.error('Student Directory fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch student directory payload.' });
  }
});

// Admin: Update a student's current semester
app.put('/api/admin/students/:id/semester', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentSemester } = req.body;
    if (!currentSemester || currentSemester < 1 || currentSemester > 6) {
      return res.status(400).json({ error: 'Invalid semester. Must be between 1 and 6.' });
    }
    const updated = await prisma.student.update({
      where: { id },
      data: { currentSemester: parseInt(currentSemester) }
    });
    res.json({ message: `Student semester updated to ${currentSemester}`, student: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update student semester.' });
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

// Phase 31: Advanced Admin API

// GET /api/admin/users/students
app.get('/api/admin/users/students', protect, requireAdmin, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: { academicClass: true },
      orderBy: { rollNo: 'asc' }
    });

    // Grouping by department -> className -> division
    const grouped = students.reduce((acc, student) => {
      // Use fallback defaults if fields are missing in legacy data
      const dept = student.department || 'BCA';
      const cls = student.academicClass?.name || student.className || 'Unknown Class';
      const div = student.division || 'A';

      if (!acc[dept]) acc[dept] = {};
      if (!acc[dept][cls]) acc[dept][cls] = {};
      if (!acc[dept][cls][div]) acc[dept][cls][div] = [];

      acc[dept][cls][div].push({
        id: student.id,
        rollNo: student.rollNo,
        name: student.name,
        currentSemester: student.currentSemester
      });
      return acc;
    }, {});

    res.json(grouped);
  } catch (error) {
    console.error('Fetch grouped students error:', error);
    res.status(500).json({ error: 'Failed to fetch grouped students' });
  }
});

// GET /api/admin/users/faculty
app.get('/api/admin/users/faculty', protect, requireAdmin, async (req, res) => {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: { id: true, fullName: true, email: true, departments: true, employmentType: true, isActive: true }
    });

    // Group by department
    const grouped = faculty.reduce((acc, teacher) => {
      const depts = teacher.departments && teacher.departments.length > 0 ? teacher.departments : ['Unassigned'];
      depts.forEach(d => {
        if (!acc[d]) acc[d] = [];
        acc[d].push(teacher);
      });
      return acc;
    }, {});

    res.json(grouped);
  } catch (error) {
    console.error('Fetch grouped faculty error:', error);
    res.status(500).json({ error: 'Failed to fetch grouped faculty' });
  }
});

// GET /api/admin/users/:id/academic-progress
app.get('/api/admin/users/:id/academic-progress', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ID belongs to a User (Teacher) or Student
    let user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      // Might be a student UUID
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          marks: {
            include: {
              question: {
                include: {
                  exam: {
                    include: { course: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!student) return res.status(404).json({ error: 'User/Student not found' });

      // Build hierarchical progress for Student
      const progress = {};
      student.marks.forEach(mark => {
        if (!mark.question || !mark.question.exam || !mark.question.exam.course) return;
        const exam = mark.question.exam;
        const course = exam.course;
        const semester = course.semester;
        
        let academicYear = 'First Year';
        if (semester > 4) academicYear = 'Third Year';
        else if (semester > 2) academicYear = 'Second Year';

        if (!progress[academicYear]) progress[academicYear] = {};
        if (!progress[academicYear][`Semester ${semester}`]) progress[academicYear][`Semester ${semester}`] = {};
        if (!progress[academicYear][`Semester ${semester}`][course.id]) {
           progress[academicYear][`Semester ${semester}`][course.id] = {
             code: course.code,
             name: course.name,
             exams: {}
           };
        }

        const examType = exam.name.toUpperCase().includes('SEE') ? 'SEE' : 'ISA';
        if (!progress[academicYear][`Semester ${semester}`][course.id].exams[examType]) {
          progress[academicYear][`Semester ${semester}`][course.id].exams[examType] = { obtained: 0, max: exam.totalMarks };
        }
        
        progress[academicYear][`Semester ${semester}`][course.id].exams[examType].obtained += Number(mark.obtainedMarks || 0);
      });

      return res.json({ type: 'STUDENT', progress });
    }

    // It's a Teacher
    if (user.role === 'TEACHER') {
      let courseConditions = {};
      if (user.employmentType === 'PERMANENT') {
        courseConditions = { department: { in: user.departments } };
      } else {
        const courseIds = user.assignedCourseIds ? user.assignedCourseIds.split(',') : [];
        courseConditions = { id: { in: courseIds } };
      }

      const courses = await prisma.course.findMany({
        where: courseConditions,
        include: {
          exams: { include: { questions: { include: { marks: true } } } },
          courseOutcomes: true
        }
      });

      const progress = {};
      courses.forEach(course => {
        let academicYear = 'First Year';
        if (course.semester > 4) academicYear = 'Third Year';
        else if (course.semester > 2) academicYear = 'Second Year';

        if (!progress[academicYear]) progress[academicYear] = {};
        if (!progress[academicYear][`Semester ${course.semester}`]) progress[academicYear][`Semester ${course.semester}`] = [];

        // Basic calculation for teacher overview
        let totalMarksAvailable = 0;
        let totalMarksObtained = 0;
        course.exams.forEach(ex => {
           ex.questions.forEach(q => {
             q.marks.forEach(m => {
               totalMarksObtained += Number(m.obtainedMarks || 0);
               totalMarksAvailable += Number(q.maxMarks || 0);
             });
           });
        });

        const overallAttainment = totalMarksAvailable > 0 ? ((totalMarksObtained / totalMarksAvailable) * 100).toFixed(1) : 0;

        progress[academicYear][`Semester ${course.semester}`].push({
          id: course.id,
          code: course.code,
          name: course.name,
          overallAttainment: `${overallAttainment}%`
        });
      });

      return res.json({ type: 'TEACHER', progress });
    }

    res.status(400).json({ error: 'Unsupported user role' });
  } catch (err) {
    console.error('Academic progress error:', err);
    res.status(500).json({ error: 'Failed to fetch academic progress' });
  }
});

// PUT /api/admin/users/:id
app.put('/api/admin/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Check if updating User or Student
    let user = await prisma.user.findUnique({ where: { id } });
    if (user) {
       const updatedUser = await prisma.user.update({
         where: { id },
         data: {
           fullName: data.fullName,
           department: data.department,
           isActive: data.isActive,
           employmentType: data.employmentType
         }
       });
       return res.json({ message: 'User updated', data: updatedUser });
    }

    let student = await prisma.student.findUnique({ where: { id } });
    if (student) {
       const updatedStudent = await prisma.student.update({
         where: { id },
         data: {
           name: data.name,
           rollNo: data.rollNo,
           currentSemester: data.currentSemester ? parseInt(data.currentSemester) : undefined
         }
       });
       return res.json({ message: 'Student updated', data: updatedStudent });
    }

    res.status(404).json({ error: 'Record not found' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
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
      name: s.name || s.Name,
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
app.get('/api/students', protect, async (req, res) => {
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
app.get('/api/academic-classes', protect, async (req, res) => {
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
// NOTE: No parity filtering here — Admins/Teachers must see ALL courses for management.
// Parity filtering only applies to student-facing dashboard endpoints.
app.get('/api/courses', protect, async (req, res) => {
  try {
    const { department, semester, lean } = req.query

    const whereClause = {}
    if (department) whereClause.department = department
    if (semester) whereClause.semester = parseInt(semester)

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        academicClass: true,
        // Skip courseOutcomes on lean requests (e.g. dropdown lists) — 10x faster
        courseOutcomes: lean === 'true' ? false : true,
      },
      orderBy: [{ semester: 'asc' }, { code: 'asc' }]
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

// Removed Developmental Seed Route

// 5. Get Exams for a specific course
app.get('/api/exams', protect, async (req, res) => {
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

      // 3. Iterate through main questions completely CONCURRENTLY
      // By using Promise.all, we drop execution latency from O(N) to O(1) concurrent bursts
      await Promise.all(questions.map(async (mainQ) => {
        const parent = await tx.question.create({
          data: {
            qNumber: mainQ.qNo,
            examId: exam.id
          }
        })

        // 4. Execute bulk sub-question insertions instantly per main branch
        if (mainQ.subQuestions && mainQ.subQuestions.length > 0) {
          const subQuestionsData = mainQ.subQuestions.map(subQ => {
             let courseOutcomeId = null
             if (subQ.cos && subQ.cos.length > 0) {
                const matchingCO = courseCOs.find(co => co.coNumber === subQ.cos[0])
                if (matchingCO) courseOutcomeId = matchingCO.id
             }

             return {
               qNumber: subQ.qNo,
               maxMarks: Number(subQ.marks),
               examId: exam.id, 
               parentQuestionId: parent.id, 
               courseOutcomeId
             }
          })

          // Unleash Prisma's ultra-fast batch insertions
          await tx.question.createMany({
             data: subQuestionsData
          })
        }
      }))

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

// 7a. Smart CSV Analyze / Validation Endpoint
app.post('/api/marks/csv-analyze', protect, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { courseId, examId, parsedRows } = req.body
    if (!courseId || !examId || !parsedRows || !Array.isArray(parsedRows)) {
      return res.status(400).json({ error: 'Missing Required Payload parameters.' })
    }

    // 1. Fetch valid enrolled students
    const classRel = await prisma.course.findUnique({
      where: { id: courseId },
      include: { academicClass: { include: { students: true } } }
    })
    const enrolledStudents = classRel?.academicClass?.students || []

    if (enrolledStudents.length === 0) {
      return res.status(404).json({ error: 'No students enrolled in this course.' })
    }

    // 2. Pre-process text corpus for Fuzzball choices
    // Example: "21BCA01 ||| John Doe" (Using delim to extract ID easily later)
    const choices = enrolledStudents.map(s => ({
       text: `${s.rollNo} ||| ${s.name}`,
       id: s.id,
       rollNo: s.rollNo,
       name: s.name
    }))

    // 3. Process every incoming CSV row into buckets
    const analysis = parsedRows.map((row, index) => {
      // Find keys that resemble Name and RollNo flexibly
      const keys = Object.keys(row)
      const rollKey = keys.find(k => k.toLowerCase().replace(/[\s_.-]/g, '') === 'rollno') || keys[0]
      const nameKey = keys.find(k => k.toLowerCase().includes('name')) || keys[1]
      
      const inRoll = String(row[rollKey] || '').trim()
      const inName = String(row[nameKey] || '').trim()
      const searchTarget = `${inRoll} ||| ${inName}`

      // Skip completely empty rows
      if (!inRoll && !inName) return null

      // Fuzzball exactness check
      const exactMatch = choices.find(c => c.rollNo.toLowerCase() === inRoll.toLowerCase() && c.name.toLowerCase() === inName.toLowerCase())
      
      if (exactMatch) {
         return {
            originalRow: row,
            status: 'Exact Match',
            matchedStudentId: exactMatch.id,
            matchedRoll: exactMatch.rollNo,
            matchedName: exactMatch.name
         }
      }

      // Fuzzy mapping
      // extract() returns array of tuple: [choice object, score, index]
      const fuzzyResults = fuzz.extract(searchTarget, choices, { processor: choice => choice.text, limit: 3 })
      
      // Strict thresholding
      if (fuzzyResults.length > 0) {
         const topScore = fuzzyResults[0][1]
         if (topScore >= 60) {
           return {
              originalRow: row,
              status: 'Fuzzy Match',
              suggestions: fuzzyResults.map(r => ({
                 score: r[1],
                 id: r[0].id,
                 rollNo: r[0].rollNo,
                 name: r[0].name
              }))
           }
         }
      }

      // Not found
      return {
         originalRow: row,
         status: 'Not Found',
         suggestions: []
      }
    }).filter(Boolean)

    res.json({ analysis })
  } catch(e) {
    console.error('CSV Analyze error:', e)
    res.status(500).json({ error: 'Failed to analyze CSV' })
  }
})

// 7b. Smart CSV Commit Endpoint
app.post('/api/marks/csv-commit', protect, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { cleanMarks } = req.body
    if (!cleanMarks || !Array.isArray(cleanMarks)) {
       return res.status(400).json({ error: 'Valid resolved marks array required.' })
    }

    const upsertPromises = cleanMarks.map((entry) => 
      prisma.mark.upsert({
        where: {
          studentId_questionId: {
            studentId: entry.studentId,
            questionId: entry.questionId
          }
        },
        update: { obtainedMarks: Number(entry.obtainedMarks) },
        create: {
          studentId: entry.studentId,
          questionId: entry.questionId,
          obtainedMarks: Number(entry.obtainedMarks)
        }
      })
    )

    await prisma.$transaction(upsertPromises)
    res.json({ message: 'Smart CSV marks safely committed!' })
  } catch(e) {
    console.error('CSV Commit error:', e)
    res.status(500).json({ error: 'Failed to commit parsed marks' })
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
    const settings = await prisma.globalSettings.findFirst()
    const activeParity = settings?.activeParity || 'ODD'
    const allowedSemesters = activeParity === 'ODD' ? [1, 3, 5] : [2, 4, 6]

    // 1. Get exact active entities count bound to the targeted semester array
    const totalStudents = await prisma.student.count({
      where: { currentSemester: { in: allowedSemesters } }
    })
    const activeCourses = await prisma.course.count({
      where: { semester: { in: allowedSemesters } }
    })

    // 2. Fetch all courses logically to run the mass attainment engine (isolated by parity)
    const courses = await prisma.course.findMany({ 
      where: { semester: { in: allowedSemesters } },
      select: { id: true, name: true } 
    })
    
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

    const upsertPromises = surveys.map((entry) => 
      prisma.courseExitSurvey.upsert({
        where: {
          studentId_courseOutcomeId: {
            studentId: entry.studentId,
            courseOutcomeId: entry.courseOutcomeId
          }
        },
        update: { rating: entry.rating },
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

// --- STUDENT ENDPOINTS ---

app.get('/api/student/dashboard', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' })
    if (!user.rollNo) return res.status(400).json({ error: 'Student Roll No not found' })

    const student = await prisma.student.findUnique({ 
      where: { rollNo: user.rollNo },
      include: { academicClass: true }
    })
    if (!student) return res.status(404).json({ error: 'Student record not found' })

    const targetSem = req.query.sem ? parseInt(req.query.sem) : null;
    let allowedSemesters = getAllowedSemesters(student.academicClass?.name);
    
    if (targetSem && allowedSemesters.includes(targetSem)) {
      allowedSemesters = [targetSem];
    } else if (targetSem) {
      // If they request a sem outside their current year, maybe allow it for transcript but for now we enforce their current year or just allow it.
      // The user requested: "if it 1st year the sem1 and sem2 and rest for other years".
      // Let's just allow targetSem directly.
      allowedSemesters = [targetSem];
    }

    const courses = await prisma.course.findMany({
      where: { 
        academicClassId: student.academicClassId,
        semester: { in: allowedSemesters }
      }
    })

    res.json(courses)
  } catch(error) {
    console.error('Student dashboard error:', error)
    res.status(500).json({ error: 'Failed to fetch student dashboard data' })
  }
})

app.get('/api/student/pending-surveys', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can view pending surveys' })
    if (!user.rollNo) return res.status(400).json({ error: 'Student Roll No not found in profile' })

    const student = await prisma.student.findUnique({ 
      where: { rollNo: user.rollNo },
      include: { academicClass: true }
    })
    if (!student) return res.status(404).json({ error: 'Student academic record not found in system' })

    // Use the student's exact currentSemester for surveys — not the whole year range.
    // This ensures a Sem 1 student ONLY sees Sem 1 courses pending surveys, not all FY courses.
    const activeSem = student.currentSemester

    const courses = await prisma.course.findMany({
      where: { 
        academicClassId: student.academicClassId,
        semester: activeSem
      },
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

// Student Attainment Breakdown
app.get('/api/student/attainment', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' })
    if (!user.rollNo) return res.status(400).json({ error: 'Missing Roll Number' })

    const student = await prisma.student.findUnique({
      where: { rollNo: user.rollNo },
      include: { academicClass: true }
    })
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const sem = req.query.sem ? parseInt(req.query.sem) : student.currentSemester

    // Fetch all courses for this student's class and semester, including COs and sub-questions with marks
    const courses = await prisma.course.findMany({
      where: { academicClassId: student.academicClassId, semester: sem },
      include: {
        courseOutcomes: {
          include: {
            questions: {
              where: { parentQuestionId: { not: null } },
              include: {
                marks: { where: { studentId: student.id } }
              }
            }
          }
        }
      }
    })

    const result = courses.map(course => {
      const outcomes = course.courseOutcomes.map(co => {
        const subQs = co.questions
        const totalMax = subQs.reduce((s, q) => s + (q.maxMarks || 0), 0)
        const totalScored = subQs.reduce((s, q) => {
          const m = q.marks[0]
          return s + (m ? m.obtainedMarks : 0)
        }, 0)
        const hasData = subQs.some(q => q.marks.length > 0)
        const threshold = totalMax * 0.40
        return {
          coId: co.id,
          coNumber: co.coNumber,
          description: co.description,
          marksScored: hasData ? totalScored : null,
          maxMarks: totalMax,
          isMet: hasData && totalScored >= threshold
        }
      })

      return {
        courseId: course.id,
        code: course.code,
        name: course.name,
        outcomes
      }
    })

    res.json(result)
  } catch (err) {
    console.error('Student attainment error:', err)
    res.status(500).json({ error: 'Failed to compute attainment' })
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

    const student = await prisma.student.findUnique({ 
      where: { rollNo: userEntry.rollNo },
      include: { academicClass: true }
    })
    if (!student) return res.status(404).json({ error: 'Academic record not found' })

    const allowedSemesters = getAllowedSemesters(student.academicClass?.name)
    const targetSem = req.query.sem ? parseInt(req.query.sem) : allowedSemesters[0]

    if (!allowedSemesters.includes(targetSem)) {
       return res.status(403).json({ error: 'Cannot access semester transcripts outside your academic year.' })
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

// Custom Report: Full sub-question marks matrix for a course
app.get('/api/reports/custom/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params

    // Fetch course with all exams -> questions -> sub-questions -> COs -> marks
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        courseOutcomes: { orderBy: { coNumber: 'asc' } },
        academicClass: {
          include: {
            students: { orderBy: { rollNo: 'asc' } }
          }
        },
        exams: {
          orderBy: { createdAt: 'asc' },
          include: {
            questions: {
              where: { parentQuestionId: null }, // Top-level only
              orderBy: { qNumber: 'asc' },
              include: {
                subQuestions: {
                  orderBy: { qNumber: 'asc' },
                  include: {
                    courseOutcome: true,
                    marks: { include: { student: true } }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!course) return res.status(404).json({ error: 'Course not found.' })

    const students = course.academicClass?.students || []

    // Build flat list of sub-questions (columns)
    const columns = []
    for (const exam of course.exams) {
      for (const q of exam.questions) {
        for (const sq of q.subQuestions) {
          columns.push({
            examName: exam.name,
            examId: exam.id,
            qLabel: `${q.qNumber}${sq.qNumber}`,
            subQuestionId: sq.id,
            coNumber: sq.courseOutcome?.coNumber || '-',
            coId: sq.courseOutcomeId,
            maxMarks: sq.maxMarks || 0,
          })
        }
      }
    }

    // Build marks lookup: { [studentId]: { [subQuestionId]: marks } }
    const marksMap = {}
    for (const col of columns) {
      for (const mark of col.marks || []) {
        if (!marksMap[mark.studentId]) marksMap[mark.studentId] = {}
        marksMap[mark.studentId][col.subQuestionId] = mark.obtainedMarks
      }
    }

    // Re-attach marks to columns (they're on the sq already)
    const columnsWithMarks = []
    for (const exam of course.exams) {
      for (const q of exam.questions) {
        for (const sq of q.subQuestions) {
          const marksArr = sq.marks || []
          const marksLookup = {}
          marksArr.forEach(m => { marksLookup[m.studentId] = m.obtainedMarks })
          columnsWithMarks.push({
            examName: exam.name,
            qLabel: `${q.qNumber}${sq.qNumber}`,
            subQuestionId: sq.id,
            coNumber: sq.courseOutcome?.coNumber || '-',
            coId: sq.courseOutcomeId,
            maxMarks: sq.maxMarks || 0,
            marksLookup, // { studentId: obtainedMarks }
          })
        }
      }
    }

    // Build student rows
    const studentRows = students.map(student => {
      const marks = columnsWithMarks.map(col => col.marksLookup[student.id] ?? null)
      return { rollNo: student.rollNo, name: student.name, studentId: student.id, marks }
    })

    // Calculate footer: count of students scoring >= 40% per column
    const passCountPerCol = columnsWithMarks.map((col, ci) => {
      const threshold = col.maxMarks * 0.4
      let count = 0
      studentRows.forEach(row => {
        if (row.marks[ci] !== null && row.marks[ci] >= threshold) count++
      })
      return count
    })

    // Calculate CO Attainment per CO
    // Group columns by CO
    const coGroups = {}
    columnsWithMarks.forEach((col, ci) => {
      if (!col.coId) return
      if (!coGroups[col.coId]) coGroups[col.coId] = { coNumber: col.coNumber, columns: [] }
      coGroups[col.coId].columns.push({ ci, maxMarks: col.maxMarks })
    })

    const coAttainment = {}
    for (const [coId, group] of Object.entries(coGroups)) {
      let totalPossible = 0, totalPass = 0
      group.columns.forEach(({ ci, maxMarks }) => {
        const threshold = maxMarks * 0.4
        studentRows.forEach(row => {
          if (row.marks[ci] !== null) {
            totalPossible++
            if (row.marks[ci] >= threshold) totalPass++
          }
        })
      })
      const pct = totalPossible > 0 ? (totalPass / totalPossible) * 100 : 0
      let level = 0
      if (pct >= 70) level = 3
      else if (pct >= 60) level = 2
      else if (pct >= 50) level = 1
      coAttainment[coId] = { coNumber: group.coNumber, percentage: pct, level }
    }

    res.json({
      courseName: course.name,
      courseCode: course.code,
      columns: columnsWithMarks.map(c => ({
        examName: c.examName,
        qLabel: c.qLabel,
        subQuestionId: c.subQuestionId,
        coNumber: c.coNumber,
        coId: c.coId,
        maxMarks: c.maxMarks,
      })),
      studentRows,
      passCountPerCol,
      coAttainment: Object.values(coAttainment),
    })
  } catch (error) {
    console.error('Custom report error:', error)
    res.status(500).json({ error: 'Failed to generate custom report.' })
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

const bootstrapPOsAndPSOs = async () => {
  try {
    const pos = [
      { code: 'PO1', description: 'Apply knowledge of computing fundamentals, computing specialization, mathematics, and domain knowledge appropriate for the computing specialization to the abstraction and conceptualization of computing models from defined problems and requirements.' },
      { code: 'PO2', description: 'Identify, formulate, review research literature, and analyze complex computing problems reaching substantiated conclusions using first principles of mathematics, computing sciences, and relevant domain disciplines.' },
      { code: 'PO3', description: 'Design solutions for complex computing problems and design system components or processes that meet the specified needs with appropriate consideration for the public health and safety, cultural, societal, and environmental considerations.' },
      { code: 'PO4', description: 'Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of the information to provide valid conclusions.' },
      { code: 'PO5', description: 'Create, select, and apply appropriate techniques, resources, and modern computing tools including prediction and modeling to complex computing activities with an understanding of the limitations.' },
      { code: 'PO6', description: 'Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to the professional computing practice.' },
      { code: 'PO7', description: 'Understand the impact of the professional computing solutions in societal and environmental contexts, and demonstrate the knowledge of, and need for sustainable development.' },
      { code: 'PO8', description: 'Apply ethical principles and commit to professional ethics and responsibilities and norms of the professional computing practice.' },
      { code: 'PO9', description: 'Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.' },
      { code: 'PO10', description: 'Communicate effectively with the computing community and with society at large, such as, being able to comprehend and write effective reports and design documentation, make effective presentations, and give and receive clear instructions.' },
      { code: 'PO11', description: 'Demonstrate knowledge and understanding of the computing and management principles and apply these to one\'s own work, as a member and leader in a team, to manage projects and in multidisciplinary environments.' },
      { code: 'PO12', description: 'Recognize the need for and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.' },
    ]
    const psos = [
      { code: 'PSO1', description: 'Apply programming languages, frameworks and emerging technologies to develop innovative solutions for domain-specific industry problems.' },
      { code: 'PSO2', description: 'Design and implement solutions using critical thinking, data management and systematic approaches to analyze and solve complex computational problems.' },
      { code: 'PSO3', description: 'Integrate cyber security, cloud computing, AI and machine learning technologies to build secure, scalable and intelligent systems.' },
    ]
    for (const po of pos) {
      await prisma.programOutcome.upsert({ where: { code: po.code }, update: {}, create: po })
    }
    for (const pso of psos) {
      await prisma.programSpecificOutcome.upsert({ where: { code: pso.code }, update: {}, create: pso })
    }
    console.log('✅ Program Outcomes (PO1-PO12) and PSOs (PSO1-PSO3) Seeded')
  } catch(e) {
    console.warn('Could not bootstrap POs/PSOs:', e.message)
  }
}

app.listen(PORT, async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  await bootstrapClasses()
  await bootstrapDefaultUsers()
  await bootstrapPOsAndPSOs()
})
