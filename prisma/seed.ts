import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seed enough rows that the N+1 pattern is obvious in the query log:
// 10 users x 5 posts x 4 comments = 200 comments, each triggering an
// extra author lookup under the naive resolvers.
async function main() {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const userCount = 10;
  const postsPerUser = 5;
  const commentsPerPost = 4;

  const users = [];
  for (let u = 0; u < userCount; u++) {
    users.push(
      await prisma.user.create({
        data: { name: `User ${u}`, email: `user${u}@example.com` },
      }),
    );
  }

  for (const user of users) {
    for (let p = 0; p < postsPerUser; p++) {
      const post = await prisma.post.create({
        data: {
          title: `Post ${p} by ${user.name}`,
          body: "Lorem ipsum dolor sit amet.",
          authorId: user.id,
        },
      });

      for (let c = 0; c < commentsPerPost; c++) {
        const commenter = users[(user.id + c) % users.length];
        await prisma.comment.create({
          data: {
            body: `Comment ${c} on ${post.title}`,
            postId: post.id,
            authorId: commenter.id,
          },
        });
      }
    }
  }

  console.log(
    `Seeded ${userCount} users, ${userCount * postsPerUser} posts, ${
      userCount * postsPerUser * commentsPerPost
    } comments.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
