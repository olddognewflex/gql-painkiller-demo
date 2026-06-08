import type { Context } from "./context.js";

// ✅ DATALOADER-BATCHED RESOLVERS ✅
//
// Same resolver shape as the naive branch, but every relation field now goes
// through a per-request DataLoader instead of issuing its own Prisma query.
// DataLoader coalesces all the keys requested in one tick into a single
// batched `findMany({ id: { in: [...] } })`, so the cascading N+1 collapses.
//
// `users { posts { comments { author { posts } } } }` drops from ~300 queries
// to a small constant — one batched query per relation level.

export const resolvers = {
  Query: {
    users: (_p: unknown, _a: unknown, { prisma }: Context) =>
      prisma.user.findMany(),

    user: (_p: unknown, args: { id: string }, { loaders }: Context) =>
      loaders.usersById.load(Number(args.id)),

    posts: (_p: unknown, _a: unknown, { prisma }: Context) =>
      prisma.post.findMany(),
  },

  User: {
    posts: (parent: { id: number }, _a: unknown, { loaders }: Context) =>
      loaders.postsByAuthorId.load(parent.id),

    comments: (parent: { id: number }, _a: unknown, { loaders }: Context) =>
      loaders.commentsByAuthorId.load(parent.id),
  },

  Post: {
    author: (parent: { authorId: number }, _a: unknown, { loaders }: Context) =>
      loaders.usersById.load(parent.authorId),

    comments: (parent: { id: number }, _a: unknown, { loaders }: Context) =>
      loaders.commentsByPostId.load(parent.id),
  },

  Comment: {
    author: (parent: { authorId: number }, _a: unknown, { loaders }: Context) =>
      loaders.usersById.load(parent.authorId),

    post: (parent: { postId: number }, _a: unknown, { loaders }: Context) =>
      loaders.postsById.load(parent.postId),
  },
};
