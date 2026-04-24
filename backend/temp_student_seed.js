import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const names = [
  "Aarav Sharma", "Diya Patel", "Rohan Gupta", "Ananya Singh", "Kabir Joshi", 
  "Isha Verma", "Dev Mehra", "Meera Desai", "Aryan Nair", "Sanya Reddy"
]

async function generateStudents() {
  console.log("Locating FYBCA Academic Class boundary...")
  
  const fybca = await prisma.academicClass.findFirst({
    where: { name: 'FYBCA' }
  })
  
  if (!fybca) {
    console.log("FYBCA Class Missing in DB!")
    return process.exit(1)
  }

  const hashedPassword = await bcrypt.hash('password123', 10)
  const csvData = ["Name,Roll No,Email"]

  for (let i = 1; i <= 10; i++) {
    const email = `fystudent${i}@gmail.com`
    const rollNo = `25BCA0${i < 10 ? '0' + i : i}`
    const name = names[i - 1]

    console.log(`Fabricating Student: ${name} [${rollNo}]`)

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: name,
        role: 'STUDENT',
        isApproved: true,
        department: 'BCA',
        className: 'FYBCA',
        division: 'A',
        currentSemester: 1,
        rollNo,
        phoneNo: `98765432${i < 10 ? '0' + i : i}`
      }
    })

    await prisma.student.create({
      data: {
        rollNo,
        name,
        currentSemester: 1,
        academicClassId: fybca.id
      }
    })

    csvData.push(`"${name}","${rollNo}","${email}"`)
  }

  // Generate the CSV locally in the root directory for the teachers to use!
  const rootDir = path.join(__dirname, '..', 'FYBCA_Students.csv')
  fs.writeFileSync(rootDir, csvData.join("\n"))
  
  console.log(`\n✅ Generated 10 Students in FYBCA. CSV dumped at: ${rootDir}`)
  process.exit(0)
}

generateStudents()
