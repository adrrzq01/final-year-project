import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultPOs = [
  { code: 'PO1', description: 'Engineering Knowledge: Apply knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.' },
  { code: 'PO2', description: 'Problem Analysis: Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions.' },
  { code: 'PO3', description: 'Design/Development of Solutions: Design solutions for complex engineering problems and design system components or processes that meet specified needs.' },
  { code: 'PO4', description: 'Conduct Investigations of Complex Problems: Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data.' },
  { code: 'PO5', description: 'Modern Tool Usage: Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools.' },
  { code: 'PO6', description: 'The Engineer and Society: Apply reasoning informed by contextual knowledge to assess societal, health, safety, legal and cultural issues.' },
  { code: 'PO7', description: 'Environment and Sustainability: Understand the impact of professional engineering solutions in societal and environmental contexts.' },
  { code: 'PO8', description: 'Ethics: Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice.' },
  { code: 'PO9', description: 'Individual and Team Work: Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.' },
  { code: 'PO10', description: 'Communication: Communicate effectively on complex engineering activities with the engineering community and with society at large.' },
  { code: 'PO11', description: 'Project Management and Finance: Demonstrate knowledge and understanding of engineering and management principles and apply these to ones own work.' },
  { code: 'PO12', description: 'Life-long Learning: Recognize the need for, and have the preparation and ability to engage in independent and life-long learning.' }
]

const defaultPSOs = [
  { code: 'PSO1', description: 'Professional Skills: The ability to understand, analyze and develop computer programs in the areas related to algorithms, system software, multimedia, web design, Big Data Analytics.' },
  { code: 'PSO2', description: 'Problem-Solving Skills: The ability to apply standard practices and strategies in software project development using open-ended programming environments.' }
]

async function main() {
  console.log('Seeding Standard NBA Program Outcomes (POs) and PSOs...')
  
  for (const po of defaultPOs) {
    await prisma.programOutcome.upsert({
      where: { code: po.code },
      update: {},
      create: {
        code: po.code,
        description: po.description
      }
    })
  }
  
  for (const pso of defaultPSOs) {
    await prisma.programSpecificOutcome.upsert({
      where: { code: pso.code },
      update: {},
      create: {
        code: pso.code,
        description: pso.description
      }
    })
  }

  console.log('Successfully seeded 12 POs and 2 PSOs!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
