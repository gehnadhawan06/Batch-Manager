import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teacherPasswordHash = await bcrypt.hash("teacher123", 10);
  const studentPasswordHash = await bcrypt.hash("student123", 10);

  await prisma.user.upsert({
    where: { email: "praveen@igdtuw.ac.in" },
    update: {
      name: "Prof. Praveen",
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      branch: "IT",
      section: "1",
      batch: "2024",
    },
    create: {
      name: "Prof. Praveen",
      email: "praveen@igdtuw.ac.in",
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      branch: "IT",
      section: "1",
      batch: "2024",
    },
  });

  await prisma.user.upsert({
    where: { email: "001btit24@igdtuw.ac.in" },
    update: {
      name: "Demo Student",
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      branch: "IT",
      section: "1",
      batch: "2024",
    },
    create: {
      name: "Demo Student",
      email: "001btit24@igdtuw.ac.in",
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      branch: "IT",
      section: "1",
      batch: "2024",
    },
  });

  console.log("Seeded demo teacher and student.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
