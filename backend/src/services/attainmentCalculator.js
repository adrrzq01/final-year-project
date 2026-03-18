import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Calculates Direct Attainment + Indirect Attainment for a given course across all its exams
 * and then computes actual PO Attainment based on CO-PO mappings.
 */
export const calculateAttainment = async (courseId) => {
  // 1. Fetch the course, COs, PO mappings, connected Academic Class, students, and surveys
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      courseOutcomes: {
        include: {
          coPoMappings: {
            include: { programOutcome: true }
          },
          courseExitSurveys: true // To calculate indirect attainment
        }
      },
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
    return {
      coAttainment: course.courseOutcomes.map(co => ({
        coNumber: co.coNumber,
        description: co.description,
        directAttainmentPercentage: 0,
        directAttainmentLevel: 0,
        indirectAttainmentLevel: 0,
        finalAttainmentLevel: 0,
        message: 'No students enrolled'
      })),
      poAttainment: []
    }
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

  // --- CO ATTAINMENT CALCULATION ---
  const coResults = course.courseOutcomes.map(co => {
    let mappingCount = 0 // How many times was this CO assessed across all exams?
    let totalPassPercentageStrides = 0

    // Direct Attainment Scan
    exams.forEach(exam => {
      exam.questions.forEach(mainQ => {
        mainQ.subQuestions.forEach(subQ => {
          if (subQ.courseOutcomeId === co.id) {
            mappingCount++
            // New Rule: A student meets threshold if they score >= 40% of the max marks on this sub-question
            const thresholdMark = subQ.maxMarks * 0.40
            
            let passingStudents = 0
            subQ.marks.forEach(markRecord => {
              if (markRecord.obtainedMarks >= thresholdMark) {
                passingStudents++
              }
            })

            const questionPassPct = (passingStudents / totalStudents) * 100
            totalPassPercentageStrides += questionPassPct
          }
        })
      })
    })

    // Calculate Direct Average
    let directCoPercentage = 0
    if (mappingCount > 0) {
       directCoPercentage = totalPassPercentageStrides / mappingCount
    }

    // Apply custom college logic grading levels to DIRECT
    let directLevel = 0
    if (directCoPercentage > 70) directLevel = 3
    else if (directCoPercentage > 60) directLevel = 2
    else if (directCoPercentage >= 50) directLevel = 1

    // Calculate Indirect Attainment (Survey Averages)
    let indirectLevel = 0
    if (co.courseExitSurveys && co.courseExitSurveys.length > 0) {
      const sumRatings = co.courseExitSurveys.reduce((acc, survey) => acc + survey.rating, 0)
      const avgRating = sumRatings / co.courseExitSurveys.length
      
      // Round nearest integer for rating scale (1-3)
      indirectLevel = Math.round(avgRating)
    }

    // Final CO Attainment Formula: 80% Direct + 20% Indirect
    const finalCalculatedLevel = (0.8 * directLevel) + (0.2 * indirectLevel)
    
    // We round to 2 decimals for cleaner display
    const finalAttainmentLevel = Number(finalCalculatedLevel.toFixed(2))

    return {
      id: co.id, // Needed for PO mapping lookup below
      coNumber: co.coNumber,
      description: co.description,
      targetThresholdPct: co.targetPct,
      timesAssessed: mappingCount,
      directAttainmentPercentage: Number(directCoPercentage.toFixed(2)),
      directAttainmentLevel: directLevel,
      indirectAttainmentLevel: indirectLevel,
      finalAttainmentLevel: finalAttainmentLevel,
      coPoMappings: co.coPoMappings // Carry forward for PO Math
    }
  })

  // --- PO ATTAINMENT CALCULATION ---
  // Formula per mapped CO: (Final CO Attainment Level * correlationLevel) / 3
  // Final PO Attainment: Average of all these mathematically scaled CO links mapped to the particular PO
  const poAccumulator = {} // { 'PO1': { sum: number, count: number, name: string } }

  coResults.forEach(co => {
    co.coPoMappings.forEach(mapping => {
      const poCode = mapping.programOutcome.code
      const poDesc = mapping.programOutcome.description
      
      const scaledPoValue = (co.finalAttainmentLevel * mapping.correlationLevel) / 3

      if (!poAccumulator[poCode]) {
        poAccumulator[poCode] = { sum: 0, count: 0, description: poDesc }
      }
      
      poAccumulator[poCode].sum += scaledPoValue
      poAccumulator[poCode].count += 1
    })
  })

  // Finalize PO array
  const poResults = Object.keys(poAccumulator).map(poCode => {
    const rawPoAverage = poAccumulator[poCode].sum / poAccumulator[poCode].count
    return {
      po: poCode,
      description: poAccumulator[poCode].description,
      attainmentLevel: Number(rawPoAverage.toFixed(2))
    }
  })

  // Sort POs logically (PO1, PO2... PO10...)
  poResults.sort((a, b) => {
    const numA = parseInt(a.po.replace(/\D/g, ''))
    const numB = parseInt(b.po.replace(/\D/g, ''))
    return numA - numB
  })

  return {
    coAttainment: coResults,
    poAttainment: poResults
  }
}
