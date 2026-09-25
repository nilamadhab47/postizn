import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SAMPLE_EMAIL = "demo@postn.app";
const PRO_EMAIL = "pro@postn.app";
const SAMPLE_PASSWORD = "postn1234";

async function main() {
  const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: SAMPLE_EMAIL },
    update: { passwordHash, name: "Demo", plan: "PRO" },
    create: {
      email: SAMPLE_EMAIL,
      passwordHash,
      name: "Demo",
      plan: "PRO",
    },
  });
  await prisma.user.upsert({
    where: { email: PRO_EMAIL },
    update: { passwordHash, name: "Pro", plan: "PRO" },
    create: {
      email: PRO_EMAIL,
      passwordHash,
      name: "Pro",
      plan: "PRO",
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
