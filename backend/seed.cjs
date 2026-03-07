import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial Admin user...')
  
  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@bridgify.edu' }
  })

  if (existingAdmin) {
    console.log('Admin already exists!')
    process.exit(0)
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash('admin123', salt)

  await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@bridgify.edu',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log('Admin Generated Successfully!')
  console.log('Email: admin@bridgify.edu')
  console.log('Password: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
