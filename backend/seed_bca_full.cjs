// BCA Full Course Seed Script — 36 Courses across 6 Semesters with COs
// Run: node seed_bca_full.cjs

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const bcaCourses = [
  // ── SEMESTER I ──────────────────────────────────────────────────────────────
  {
    code: 'CSA-100', name: 'Problem Solving and Programming', semester: 1,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Remember the basic concepts and terminologies of problem-solving, algorithms, flowcharts, pseudo-code, language syntax, and debugging.' },
      { coNumber: 'CO2', description: 'Understand basic computing concepts, algorithm design, flowchart design, pseudo-code, programming constructs, and debugging.' },
      { coNumber: 'CO3', description: 'Apply problem-solving and programming concepts and design solutions to simpler problems using algorithms, flowcharts, and pseudocode.' },
      { coNumber: 'CO4', description: 'Code, debug, and analyze well-structured programming logic using suitable Programming language/s.' },
    ]
  },
  {
    code: 'MAT-111', name: 'Elementary Mathematics', semester: 1,
    category: 'Minor', theoryCredits: 4, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Identify the truth and falsity of a statement.' },
      { coNumber: 'CO2', description: 'Comprehend the concept of Sets, Relations, and Functions.' },
      { coNumber: 'CO3', description: 'Evaluate basic limits, Identify discontinuous functions, and Apply the techniques of differentiation.' },
      { coNumber: 'CO4', description: 'Construct the polar form of complex numbers.' },
      { coNumber: 'CO5', description: 'Compute the gradient, curl, and divergence.' },
      { coNumber: 'CO6', description: 'Formulate and Solve differential equations.' },
    ]
  },
  {
    code: 'PSY-131', name: 'Psychology of Adjustment', semester: 1,
    category: 'MC', theoryCredits: 3, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Explain contemporary perspectives regarding psychology of life adjustment.' },
      { coNumber: 'CO2', description: 'Apply skills for effective adjustment in the modern world.' },
      { coNumber: 'CO3', description: 'Harness critical perspectives regarding questions of gender, sexuality, and intimate relationships.' },
      { coNumber: 'CO4', description: 'Develop values and competences for facing challenges at work and in families.' },
    ]
  },
  {
    code: 'ENG-151', name: 'Communicative English: Spoken and Written', semester: 1,
    category: 'AEC', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Elicit and show respect for the views of others as well as be culturally sensitive.' },
      { coNumber: 'CO2', description: 'Display emotional stability and self-confidence.' },
      { coNumber: 'CO3', description: 'Apply critical thinking skills through decision-making and problem solving.' },
      { coNumber: 'CO4', description: 'Demonstrate effective written communication for an intended purpose and audience that follows genre/disciplinary conventions that reflect creation, organization, precision, and revision.' },
    ]
  },
  {
    code: 'CSA-142', name: 'Python Programming', semester: 1,
    category: 'SEC', theoryCredits: 1, practicalCredits: 2,
    cos: [
      { coNumber: 'CO1', description: 'Remember the basics of python programming.' },
      { coNumber: 'CO2', description: 'Understand the concepts and constructs of python programming.' },
      { coNumber: 'CO3', description: 'Apply python library functions and data structures.' },
      { coNumber: 'CO4', description: 'Analyse the implementation of python programming.' },
    ]
  },
  {
    code: 'VAC-101', name: 'Environmental Studies II', semester: 1,
    category: 'VAC', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Understand the impact of pollution on human welfare.' },
      { coNumber: 'CO2', description: 'Appreciate ethical issues of environmental rights and duties.' },
      { coNumber: 'CO3', description: 'Undertake preliminary field analysis of environmental damage.' },
    ]
  },
  {
    code: 'VAC-108', name: 'Introduction to Folktales of India', semester: 1,
    category: 'VAC', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Identify and analyze the key features and characteristics of folktales.' },
      { coNumber: 'CO2', description: 'Critically evaluate the role of folktales in shaping cultural identities, beliefs, and values.' },
      { coNumber: 'CO3', description: 'Demonstrate an appreciation for the diversity and richness of global folktales and develop a deeper understanding of different cultures and traditions.' },
      { coNumber: 'CO4', description: 'Apply their knowledge and skills to create their own folktales, based on the characteristics and themes of traditional tales, and share them with others.' },
    ]
  },

  // ── SEMESTER II ─────────────────────────────────────────────────────────────
  {
    code: 'MAT-100', name: 'Foundational Mathematics', semester: 2,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Infer the truth of various sentences and its equivalents and outline various properties of sets.' },
      { coNumber: 'CO2', description: 'Examine and Identify the types of relations and functions.' },
      { coNumber: 'CO3', description: 'Make use of the strong and weak induction.' },
      { coNumber: 'CO4', description: 'Solve systems of linear equations.' },
      { coNumber: 'CO5', description: 'Discuss the properties of determinants.' },
    ]
  },
  {
    code: 'CSA-111', name: 'Computer System Fundamentals', semester: 2,
    category: 'Minor', theoryCredits: 4, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Remember the basics of computers, Computer Organization, Number Systems, process management, memory management, I/O Management, and File management concepts.' },
      { coNumber: 'CO2', description: 'Understand the concepts of process management, memory systems, I/O devices, and File Management Systems.' },
      { coNumber: 'CO3', description: 'Apply the concepts of process management in handling deadlock situations.' },
      { coNumber: 'CO4', description: 'Analyse an Appropriate type of memory for a given scenario.' },
    ]
  },
  {
    code: 'PSY-132', name: 'Environmental Psychology', semester: 2,
    category: 'MC', theoryCredits: 3, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Understand various perspectives on human-environment interrelationships.' },
      { coNumber: 'CO2', description: 'Gain insight into the ways in which the environment influences feelings and experiences.' },
      { coNumber: 'CO3', description: 'Appreciate the nature connectedness.' },
      { coNumber: 'CO4', description: 'Understand the impact of climate change and behaviour.' },
      { coNumber: 'CO5', description: 'Students will understand the role of the environment on health and quality of life.' },
    ]
  },
  {
    code: 'ENG-152', name: 'Digital Content Creation in English', semester: 2,
    category: 'AEC', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Create and deliver individual presentations using a variety of digital software.' },
      { coNumber: 'CO2', description: 'Compose and present a digital story.' },
      { coNumber: 'CO3', description: 'Identify and distinguish between different genres of writing.' },
      { coNumber: 'CO4', description: 'Write a book/film review.' },
      { coNumber: 'CO5', description: 'Interpret graphic data to arrive at an informed conclusion.' },
    ]
  },
  {
    code: 'CSA-143', name: 'Data Analytics Using Spreadsheets', semester: 2,
    category: 'SEC', theoryCredits: 1, practicalCredits: 2,
    cos: [
      { coNumber: 'CO1', description: 'Demonstrate basic and advanced functions in spreadsheet applications.' },
      { coNumber: 'CO2', description: 'Apply data analysis techniques and create visualizations using charts and pivot tables.' },
      { coNumber: 'CO3', description: 'Implement data analysis tools and functions for practical applications.' },
    ]
  },
  {
    code: 'VAC-111', name: 'E-Waste Management', semester: 2,
    category: 'VAC', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Understand the environmental impacts of e-waste.' },
      { coNumber: 'CO2', description: 'Describe the process recycling of e-waste.' },
      { coNumber: 'CO3', description: 'Distinguish the role of various national and internal act and laws applicable for e-waste management and handling.' },
      { coNumber: 'CO4', description: 'Analyse the e-waste management measures proposed under national and global legislations.' },
    ]
  },
  {
    code: 'VAC-117', name: 'Youth Empowerment using Mind Mapping', semester: 2,
    category: 'VAC', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Students will become aware of their way of communication and will improvise by practice their confidence and communication skills.' },
      { coNumber: 'CO2', description: 'Students will understand how their own emotions are tied to the breath and nervous system. They will experience how the Sudarshan Kriya affects emotions, memory and overall well-being.' },
      { coNumber: 'CO3', description: 'Students will understand how to manage their interpersonal relationships with acceptance and improved communication.' },
      { coNumber: 'CO4', description: 'They will be able to navigate the roles they play in life in a very effective manner.' },
    ]
  },

  // ── SEMESTER III ─────────────────────────────────────────────────────────────
  {
    code: 'CSA-200', name: 'Data Structures', semester: 3,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Remember the basic concepts of data structure.' },
      { coNumber: 'CO2', description: 'Understand the concept of linear and non-linear data structures.' },
      { coNumber: 'CO3', description: 'Analyse various data structure types and its implementation.' },
    ]
  },
  {
    code: 'CSA-201', name: 'Database Management Systems', semester: 3,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Remember the basic concepts and terminologies of DBMS, ERD, Normalization, and Transaction Processing.' },
      { coNumber: 'CO2', description: 'Understand ER diagrams, normalization, relational schema design, relational operations, transaction processing, and SQL concepts.' },
      { coNumber: 'CO3', description: 'Apply and discuss the concepts of ER Diagram, relational model and normalization.' },
      { coNumber: 'CO4', description: 'Design relational database and formulate queries on the database and data using different SQL constructs mentioned in the syllabus.' },
    ]
  },
  {
    code: 'CSA-211', name: 'Reasoning Techniques', semester: 3,
    category: 'Minor', theoryCredits: 4, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Remember basics rules of logic and reasoning.' },
      { coNumber: 'CO2', description: 'Understand various logic and reasoning concepts and techniques.' },
      { coNumber: 'CO3', description: 'Apply the suitable reasoning techniques to solve real world problems.' },
      { coNumber: 'CO4', description: 'Analyze the obtained solution with suitable and relevant logic/reasoning.' },
    ]
  },
  {
    code: 'PSY-231', name: 'Relationship Psychology', semester: 3,
    category: 'MC', theoryCredits: 3, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Demonstrate a thorough grasp of fundamental relationship concepts, including the significance and lasting impact of early relationships.' },
      { coNumber: 'CO2', description: 'Understand the key theoretical perspectives.' },
      { coNumber: 'CO3', description: 'Apply prominent relationship theories (social exchange, attachment, social penetration) to interpret determinants of friendship, attraction, marriage stages, and professional dynamics.' },
      { coNumber: 'CO4', description: 'Develop practical skills in effective communication and collaboration.' },
      { coNumber: 'CO5', description: 'Apply emotional intelligence to navigate challenges and understand relationship breakdowns in diverse contexts.' },
    ]
  },
  {
    code: 'HIN-251', name: 'सम्प्रेषण कौशल (Communication Skill)', semester: 3,
    category: 'AEC', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'संप्रेषण कौशल और नेतृत्व की क्षमता का विकास होगा।' },
      { coNumber: 'CO2', description: 'रोज़गार के अच्छे अवसर प्राप्त कर सकेंगे।' },
      { coNumber: 'CO3', description: 'भाषा में प्रभावशाली ढंग से विचारों का आदान-प्रदान कर सकेंगे।' },
      { coNumber: 'CO4', description: 'सामूहिक संघ की भावना बढ़ेगी।' },
    ]
  },
  {
    code: 'CSA-241', name: 'Multimedia Applications', semester: 3,
    category: 'SEC', theoryCredits: 1, practicalCredits: 2,
    cos: [
      { coNumber: 'CO1', description: 'Remember the Multimedia elements.' },
      { coNumber: 'CO2', description: 'Understand methods for integrating different types of media seamlessly into multimedia projects.' },
      { coNumber: 'CO3', description: 'Apply design principles specific to multimedia, ensuring visually appealing and effective communication.' },
      { coNumber: 'CO4', description: 'Implement and execute multimedia projects applying design principles ensuring practical application of visual and interactive design concepts.' },
    ]
  },

  // ── SEMESTER IV ─────────────────────────────────────────────────────────────
  {
    code: 'CSA-202', name: 'Web App Development', semester: 4,
    category: 'Major', theoryCredits: 1, practicalCredits: 3,
    cos: [
      { coNumber: 'CO1', description: 'Understand and utilize JavaScript for dynamic web behaviours, including DOM manipulation and event handling.' },
      { coNumber: 'CO2', description: 'Apply a client-side framework for responsive, mobile-first web design components, and grid system to deliver visually appealing and user-friendly web experiences across various devices and screen sizes.' },
      { coNumber: 'CO3', description: 'Compare and setup web hosting environments, generate and install SSL certificates, and integrate them with their websites.' },
      { coNumber: 'CO4', description: 'Design dynamic and interactive web applications to process user requests, interact with databases, manage server-side logic, and generate dynamic content.' },
    ]
  },
  {
    code: 'CSA-203', name: 'Agile Methodologies', semester: 4,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Remember the practices and philosophies of Agile methodologies.' },
      { coNumber: 'CO2', description: 'Understand agile development and testing techniques.' },
      { coNumber: 'CO3', description: 'Apply best practices of agile methodologies for software development and testing.' },
    ]
  },
  {
    code: 'CSA-204', name: 'Object Oriented Concepts', semester: 4,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Remember Object-Oriented Programming concepts.' },
      { coNumber: 'CO2', description: 'Understand object-oriented paradigms: abstraction, encapsulation, inheritance, polymorphism, and apply them in problem-solving.' },
      { coNumber: 'CO3', description: 'Apply object-oriented solutions for real-world problems.' },
      { coNumber: 'CO4', description: 'Implement appropriate OO concepts in applications.' },
    ]
  },
  {
    code: 'CSA-205', name: 'Web Technology', semester: 4,
    category: 'Major', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Learn the fundamentals of web technology, scripting languages and web publication.' },
      { coNumber: 'CO2', description: 'Explain the concepts of creating dynamic and interactive web experiences using client-side scripting language.' },
      { coNumber: 'CO3', description: 'Apply client and server-side programming language that can be used to create websites and web applications.' },
      { coNumber: 'CO4', description: 'Analyse MVC Architecture for dynamic and interactive user interfaces using views and templates.' },
    ]
  },
  {
    code: 'CSA-221', name: 'Digital Marketing Fundamentals', semester: 4,
    category: 'Minor', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Understand digital landscape and build a case to leverage online channels.' },
      { coNumber: 'CO2', description: 'Analyze online campaigns successfully and develop and design Online Advertising campaigns, AdWords Campaign Management and Campaign Basics across search.' },
      { coNumber: 'CO3', description: 'Evaluate organic traffic through Search Engine Optimization and Apply advance concept of Search Engine Optimization to capture the right intent.' },
    ]
  },
  {
    code: 'HIN-252', name: 'संभाषण कला (Sambhashan Kala)', semester: 4,
    category: 'AEC', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'संभाषण के स्वरूप से अवगत होंगे।' },
      { coNumber: 'CO2', description: 'संभाषण कला के विभिन्न रूपों से परिचित होंगे।' },
      { coNumber: 'CO3', description: 'संभाषण कला कौशल की उपयोगिता को समझेंगे।' },
      { coNumber: 'CO4', description: 'संभाषण कला संवर्धन करेंगे।' },
    ]
  },

  // ── SEMESTER V ──────────────────────────────────────────────────────────────
  {
    code: 'CSA-300', name: 'UI-UX Design', semester: 5,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Remember the iterative user-centered design of graphical user interfaces and build UI for user applications.' },
      { coNumber: 'CO2', description: 'Understand the UX design of any product or application.' },
      { coNumber: 'CO3', description: 'Apply UX skills in product development.' },
      { coNumber: 'CO4', description: 'Design Wireframe and Prototype.' },
    ]
  },
  {
    code: 'CSA-301', name: 'Full Stack Development', semester: 5,
    category: 'Major', theoryCredits: 1, practicalCredits: 3,
    cos: [
      { coNumber: 'CO1', description: 'Understand JavaScript fundamentals.' },
      { coNumber: 'CO2', description: 'Write Robust Backend APIs with Node.js.' },
      { coNumber: 'CO3', description: 'Design Dynamic User Interfaces with React.js.' },
      { coNumber: 'CO4', description: 'Integrate Data Flow between Frontend and Backend applications.' },
    ]
  },
  {
    code: 'CSA-302', name: 'Cloud Computing', semester: 5,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Recall the fundamentals of cloud computing.' },
      { coNumber: 'CO2', description: 'Understand the architecture and the types of cloud service models.' },
      { coNumber: 'CO3', description: 'Apply the concepts of service models and deployment models for migration to cloud.' },
      { coNumber: 'CO4', description: 'Analyze the services and applications made available by leading Cloud Service Providers.' },
    ]
  },
  {
    code: 'CSA-303', name: 'Internet Technologies', semester: 5,
    category: 'Major', theoryCredits: 2, practicalCredits: 0,
    cos: [
      { coNumber: 'CO1', description: 'Recall the internet technologies.' },
      { coNumber: 'CO2', description: 'Understand the development of the internet, the anatomy and growth.' },
      { coNumber: 'CO3', description: 'Analyze the working of different protocols.' },
    ]
  },
  {
    code: 'CSA-321', name: 'Internship (VET)', semester: 5,
    category: 'Minor', theoryCredits: 0, practicalCredits: 4,
    cos: [
      { coNumber: 'CO1', description: 'Understand the amount of complexity, effort and planning needed in solving real-world problems.' },
      { coNumber: 'CO2', description: 'Appreciate the need of training, gap analysis, and self-development.' },
      { coNumber: 'CO3', description: 'Demonstrate professional and ethical responsibility.' },
      { coNumber: 'CO4', description: 'Design and develop solutions of the internship problem through implementation of the skills developed during the course of study.' },
    ]
  },
  {
    code: 'CSA-361', name: 'Summer Internship', semester: 5,
    category: 'I', theoryCredits: 0, practicalCredits: 2,
    cos: [
      { coNumber: 'CO1', description: 'Understand the industrial environment.' },
      { coNumber: 'CO2', description: 'Apply the concepts and skills learnt during employment and life-long learning.' },
      { coNumber: 'CO3', description: 'Inculcate discipline and work ethics.' },
    ]
  },

  // ── SEMESTER VI ─────────────────────────────────────────────────────────────
  {
    code: 'CSA-304', name: 'Cyber Security', semester: 6,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Remember Legal Framework and Countermeasures of Cyber Security.' },
      { coNumber: 'CO2', description: 'Understand the key concepts of cyber security, threat awareness and the fundamental principles of ethical hacking, techniques and tools.' },
      { coNumber: 'CO3', description: 'Apply the understanding of cyber security, threat awareness and the ethical hacking tools and techniques.' },
      { coNumber: 'CO4', description: 'Analyse the methods for authentication, access control, intrusion detection and prevention in Cyber Security.' },
    ]
  },
  {
    code: 'CSA-305', name: 'Mobile App Development', semester: 6,
    category: 'Major', theoryCredits: 1, practicalCredits: 3,
    cos: [
      { coNumber: 'CO1', description: 'Recall the installation process of Flutter, Dart and Firebase.' },
      { coNumber: 'CO2', description: 'Understand the various concepts and constructs of Mobile Application Development using Flutter, Dart and Firebase.' },
      { coNumber: 'CO3', description: 'Design and Develop animation and application using Flutter, Dart and Firebase.' },
      { coNumber: 'CO4', description: 'Debug and Analyze the programming logic.' },
    ]
  },
  {
    code: 'CSA-306', name: 'Machine Learning', semester: 6,
    category: 'Major', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Demonstrate a solid understanding of the fundamentals of Machine Learning.' },
      { coNumber: 'CO2', description: 'Apply Machine Learning algorithms proficiently to perform complex data analysis tasks.' },
      { coNumber: 'CO3', description: 'Identify and interpret interesting patterns, correlations, associations, and causal structures within diverse datasets.' },
      { coNumber: 'CO4', description: 'Solve data science problems using fundamental concepts through case studies.' },
    ]
  },
  {
    code: 'CSA-307', name: 'Project', semester: 6,
    category: 'Major', theoryCredits: 0, practicalCredits: 4,
    cos: [
      { coNumber: 'CO1', description: 'Understand the amount of complexity, effort, and planning needed in solving real-world problems.' },
      { coNumber: 'CO2', description: 'Demonstrate the need for training, gap analysis, and self-development, professional and ethical responsibility.' },
      { coNumber: 'CO3', description: 'Design and develop solutions to real-world problems adhering to coding learned during the course of study.' },
      { coNumber: 'CO4', description: 'Evaluate using quality testing standards.' },
    ]
  },
  {
    code: 'CSA-322', name: 'Social Media Marketing & Analytics (VET)', semester: 6,
    category: 'Minor', theoryCredits: 3, practicalCredits: 1,
    cos: [
      { coNumber: 'CO1', description: 'Understand social media marketing and analytics, the various channels through which it operates, and its role in marketing strategy.' },
      { coNumber: 'CO2', description: 'Develop effective ways of creating social media marketing strategy.' },
      { coNumber: 'CO3', description: 'Analyze a Video Marketing Strategy and learn YouTube Advertising.' },
      { coNumber: 'CO4', description: 'Design Facebook Ads and Instagram Ads and understand how to effectively brand their Social Media Pages.' },
    ]
  },
]

async function main() {
  console.log('🌱 Seeding BCA courses with COs...')
  let seeded = 0, skipped = 0, coCount = 0

  // Find FYBCA, SYBCA, TYBCA class IDs
  const classes = await prisma.academicClass.findMany({
    where: { name: { in: ['FYBCA', 'SYBCA', 'TYBCA'] } }
  })
  const classMap = {}
  classes.forEach(c => { classMap[c.name] = c.id })

  for (const course of bcaCourses) {
    // Map semester to class
    let academicClassId = null
    if (course.semester <= 2) academicClassId = classMap['FYBCA']
    else if (course.semester <= 4) academicClassId = classMap['SYBCA']
    else academicClassId = classMap['TYBCA']

    // Check if already exists
    const existing = await prisma.course.findFirst({ where: { code: course.code } })
    if (existing) {
      // Just make sure COs are attached, add them if missing
      const existingCOs = await prisma.courseOutcome.findMany({ where: { courseId: existing.id } })
      if (existingCOs.length === 0 && course.cos.length > 0) {
        await prisma.courseOutcome.createMany({
          data: course.cos.map((co, i) => ({
            coNumber: co.coNumber,
            description: co.description,
            targetPct: 60.0,
            courseId: existing.id,
          })),
          skipDuplicates: true
        })
        coCount += course.cos.length
        console.log(`  ↳ Added ${course.cos.length} COs to existing ${course.code}`)
      }
      skipped++
      continue
    }

    // Create the course with COs
    await prisma.course.create({
      data: {
        code: course.code,
        name: course.name,
        semester: course.semester,
        category: course.category,
        theoryCredits: course.theoryCredits,
        practicalCredits: course.practicalCredits,
        academicClassId: academicClassId,
        courseOutcomes: {
          create: course.cos.map(co => ({
            coNumber: co.coNumber,
            description: co.description,
            targetPct: 60.0,
          }))
        }
      }
    })
    coCount += course.cos.length
    seeded++
    console.log(`  ✅ ${course.code} — ${course.name} (Sem ${course.semester}, ${course.cos.length} COs)`)
  }

  console.log(`\n✅ Done! Created: ${seeded}, Already existed: ${skipped}, COs added: ${coCount}`)
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
