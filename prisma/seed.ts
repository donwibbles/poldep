import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Upsert admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "vm.rubiorivera@gmail.com" },
    update: {},
    create: {
      email: "vm.rubiorivera@gmail.com",
      name: "Victor Rubio Rivera",
      role: "ADMIN",
    },
  });

  console.log(`Upserted admin user: ${adminUser.email}`);

  // Define default pipeline stages
  const stages = [
    { name: "Research", order: 1, isFinal: false, color: "#3B82F6" },
    { name: "Screening Committee", order: 2, isFinal: false, color: "#8B5CF6" },
    { name: "Questionnaire Sent", order: 3, isFinal: false, color: "#F59E0B" },
    { name: "Questionnaire Received", order: 4, isFinal: false, color: "#F97316" },
    { name: "Candidate Interview", order: 5, isFinal: false, color: "#EC4899" },
    { name: "Board Recommendation", order: 6, isFinal: false, color: "#10B981" },
    { name: "Executive Board Vote", order: 7, isFinal: false, color: "#06B6D4" },
    { name: "General Membership Vote", order: 8, isFinal: false, color: "#6366F1" },
    { name: "Endorsed", order: 9, isFinal: true, color: "#22C55E" },
    { name: "Not Endorsed", order: 10, isFinal: true, color: "#EF4444" },
    { name: "No Endorsement", order: 11, isFinal: true, color: "#6B7280" },
  ];

  for (const stage of stages) {
    const upserted = await prisma.pipelineStage.upsert({
      where: { order: stage.order },
      update: {
        name: stage.name,
        isFinal: stage.isFinal,
        color: stage.color,
      },
      create: {
        name: stage.name,
        order: stage.order,
        isFinal: stage.isFinal,
        color: stage.color,
      },
    });

    console.log(`Upserted pipeline stage: ${upserted.name} (order: ${upserted.order})`);
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
