import type { Context } from "./context.js";

// ⚠️ DELIBERATELY NAIVE RESOLVERS ⚠️
//
// Every relation field issues its own Prisma query, per parent object.
// A query like `users { posts { comments { author { name } } } }` therefore
// fans out into:
//   1   query  for the user list
//   N   queries for each user's posts        (one per user)
//   N*M queries for each post's comments      (one per post)
//   N*M*K queries for each comment's author   (one per comment)
//
// This is the classic GraphQL N+1 problem. The fix is to batch these
// lookups with DataLoader (or Prisma's relation loading), but here we
// leave it broken on purpose so GraphQL Painkiller has something to flag.

export const resolvers = {
  Query: {
    users: (_parent: unknown, _args: unknown, { prisma }: Context) =>
      prisma.user.findMany(),

    user: (_parent: unknown, args: { id: string }, { prisma }: Context) =>
      prisma.user.findUnique({ where: { id: Number(args.id) } }),

    posts: (_parent: unknown, _args: unknown, { prisma }: Context) =>
      prisma.post.findMany(),
  },

  User: {
    // N+1: one query per user.
    posts: (parent: { id: number }, _args: unknown, { prisma }: Context) =>
      prisma.post.findMany({ where: { authorId: parent.id } }),

    // N+1: one query per user.
    comments: (parent: { id: number }, _args: unknown, { prisma }: Context) =>
      prisma.comment.findMany({ where: { authorId: parent.id } }),
  },

  Post: {
    // N+1: one query per post.
    author: (parent: { authorId: number }, _args: unknown, { prisma }: Context) =>
      prisma.user.findUnique({ where: { id: parent.authorId } }),

    // N+1: one query per post.
    comments: (parent: { id: number }, _args: unknown, { prisma }: Context) =>
      prisma.comment.findMany({ where: { postId: parent.id } }),
  },

  Comment: {
    // N+1: one query per comment.
    author: (parent: { authorId: number }, _args: unknown, { prisma }: Context) =>
      prisma.user.findUnique({ where: { id: parent.authorId } }),

    // N+1: one query per comment.
    post: (parent: { postId: number }, _args: unknown, { prisma }: Context) =>
      prisma.post.findUnique({ where: { id: parent.postId } }),
  },
};
