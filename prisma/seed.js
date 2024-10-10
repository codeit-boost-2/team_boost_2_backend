import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 기존 데이터 삭제
  await prisma.comment.deleteMany();
  await prisma.memory.deleteMany();
  await prisma.group.deleteMany();
  await prisma.groupBadge.deleteMany()
  await prisma.badge.deleteMany();

  const likeKingBadge = await prisma.badge.createMany({
    data: [
      { badgeName: '공감왕' },
      { badgeName: '추억왕' },
      { badgeName: '어르신' },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });