const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Classes
  const classes = [
    "Kinder Garten","Nursery", "Prep", "Class 1", "Class 2", "Class 3",
    "Class 4", "Class 5", "Class 6", "Class 7", "Class 8",
    "Class 9", "Class 10"
  ];

  for (const name of classes) {
    await prisma.class.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Classes seeded successfully!");

  // Grade Config
  const gradeConfigs = [
    { id: 1, grade: "A+", minPercent: 90, maxPercent: 100, label: "Outstanding",   gpaPoints: 4.0, order: 1 },
    { id: 2, grade: "A",  minPercent: 80, maxPercent: 89,  label: "Excellent",     gpaPoints: 3.7, order: 2 },
    { id: 3, grade: "B",  minPercent: 70, maxPercent: 79,  label: "Good",          gpaPoints: 3.0, order: 3 },
    { id: 4, grade: "C",  minPercent: 60, maxPercent: 69,  label: "Satisfactory",  gpaPoints: 2.0, order: 4 },
    { id: 5, grade: "D",  minPercent: 50, maxPercent: 59,  label: "Pass",          gpaPoints: 1.0, order: 5 },
    { id: 6, grade: "F",  minPercent: 0,  maxPercent: 49,  label: "Fail",          gpaPoints: 0.0, order: 6 },
  ];

  for (const g of gradeConfigs) {
    await prisma.gradeConfig.upsert({
      where:  { id: g.id },
      update: g,
      create: g,
    });
  }
  console.log("Grade config seeded successfully!");

  console.log("Database seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });