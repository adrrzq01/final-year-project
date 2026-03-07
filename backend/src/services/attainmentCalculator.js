import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Calculates Direct Attainment for a given course across all its exams.
 * Returns an array of objects per CourseOutcome (e.g. CO1, CO2).
 */
export const calculateDirectAttainment = async (courseId) => {
  // 1. Fetch the course with its defined COs and connected Academic Class
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      courseOutcomes: true,
      academicClass: {
        include: {
          students: true // We need total students count to calculate valid percentages
        }
      }
    }
  })

  if (!course) throw new Error('Course not found')
  const totalStudents = course.academicClass.students.length

  if (totalStudents === 0) {
    return course.courseOutcomes.map(co => ({
      coNumber: co.coNumber,
      description: co.description,
      attainmentPercentage: 0,
      attainmentLevel: 0,
      message: 'No students enrolled'
    }))
  }

  // 2. Fetch all exams and their sub-questions logically mapped to this course
  const exams = await prisma.exam.findMany({
    where: { courseId },
    include: {
      questions: {
        include: {
          subQuestions: {
            // Include actual marks obtained by any student on this exact sub-question
            include: { marks: true } 
          }
        }
      }
    }
  })

  // 3. Process the Mathematics grouped by Course Outcome
  const results = course.courseOutcomes.map(co => {
    let mappingCount = 0 // How many times was this CO assessed across all exams?
    let totalPassPercentageStrides = 0 // Sum of percentages of students who beat the threshold per question

    // Scan every exam's sub-questions looking for matches to THIS Course Outcome
    exams.forEach(exam => {
      exam.questions.forEach(mainQ => {
        mainQ.subQuestions.forEach(subQ => {
          
          if (subQ.courseOutcomeId === co.id) {
            mappingCount++
            
            // Formula: Threshold Mark = Max Marks * (Target Percentage / 100)
            const thresholdMark = subQ.maxMarks * (co.targetPct / 100)
            
            // Count how many students successfully scored strictly >= the threshold
            let passingStudents = 0
            subQ.marks.forEach(markRecord => {
              if (markRecord.obtainedMarks >= thresholdMark) {
                passingStudents++
              }
            })

            // Question-Level Attainment %
            // If 60 students took test, and 45 passed threshold: (45/60)*100 = 75%
            const questionPassPct = (passingStudents / totalStudents) * 100
            totalPassPercentageStrides += questionPassPct
          }
        })
      })
    })

    // 4. Calculate Final Averaged CO Percentage
    let finalCoPercentage = 0
    if (mappingCount > 0) {
       finalCoPercentage = totalPassPercentageStrides / mappingCount
    }

    // 5. Apply standard NBA logic grading levels
    let level = 0
    if (finalCoPercentage >= 80) {
      level = 3
    } else if (finalCoPercentage >= 70) {
      level = 2
    } else if (finalCoPercentage >= 60) {
      level = 1
    }

    return {
      coNumber: co.coNumber,
      description: co.description,
      targetThresholdPct: co.targetPct,
      timesAssessed: mappingCount,
      attainmentPercentage: Number(finalCoPercentage.toFixed(2)),
      attainmentLevel: level
    }
  })

  return results
}
