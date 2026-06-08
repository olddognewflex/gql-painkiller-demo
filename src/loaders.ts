import DataLoader from "dataloader";
import type { PrismaClient, Post, Comment, User } from "@prisma/client";

// DataLoader batches the per-parent lookups that the naive resolvers issued
// one-at-a-time. Each loader collects all the keys requested during a single
// tick of the event loop, fires ONE Prisma query, then scatters the rows back
// to the callers in order. N+1 collapses to a constant number of queries.
//
// Loaders are created fresh per request (see context.ts) so their cache never
// leaks across users.

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = map.get(k);
    if (bucket) bucket.push(row);
    else map.set(k, [row]);
  }
  return map;
}

export interface Loaders {
  usersById: DataLoader<number, User | null>;
  postsById: DataLoader<number, Post | null>;
  postsByAuthorId: DataLoader<number, Post[]>;
  commentsByPostId: DataLoader<number, Comment[]>;
  commentsByAuthorId: DataLoader<number, Comment[]>;
}

export function createLoaders(prisma: PrismaClient): Loaders {
  return {
    // One findMany({ in: ids }) instead of one findUnique per parent.
    usersById: new DataLoader(async (ids) => {
      const users = await prisma.user.findMany({
        where: { id: { in: [...ids] } },
      });
      const byId = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => byId.get(id) ?? null);
    }),

    postsById: new DataLoader(async (ids) => {
      const posts = await prisma.post.findMany({
        where: { id: { in: [...ids] } },
      });
      const byId = new Map(posts.map((p) => [p.id, p]));
      return ids.map((id) => byId.get(id) ?? null);
    }),

    // One query returns every author's posts; group them back per author.
    postsByAuthorId: new DataLoader(async (authorIds) => {
      const posts = await prisma.post.findMany({
        where: { authorId: { in: [...authorIds] } },
      });
      const byAuthor = groupBy(posts, (p) => p.authorId);
      return authorIds.map((id) => byAuthor.get(id) ?? []);
    }),

    commentsByPostId: new DataLoader(async (postIds) => {
      const comments = await prisma.comment.findMany({
        where: { postId: { in: [...postIds] } },
      });
      const byPost = groupBy(comments, (c) => c.postId);
      return postIds.map((id) => byPost.get(id) ?? []);
    }),

    commentsByAuthorId: new DataLoader(async (authorIds) => {
      const comments = await prisma.comment.findMany({
        where: { authorId: { in: [...authorIds] } },
      });
      const byAuthor = groupBy(comments, (c) => c.authorId);
      return authorIds.map((id) => byAuthor.get(id) ?? []);
    }),
  };
}
