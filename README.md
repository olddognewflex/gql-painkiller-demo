# gql-painkiller-demo

A deliberately broken [Apollo Server](https://www.apollographql.com/docs/apollo-server/) +
[Prisma](https://www.prisma.io/) API that demonstrates the GraphQL **N+1 problem** — and
shows how [GraphQL Painkiller](https://github.com/olddognewflex/GraphQL-PainKiller) catches
the offending operations through static analysis, before they reach production.

> ⚠️ The resolvers here are intentionally naive. Do **not** copy this pattern into a real service.

## The problem

The resolvers in [`src/resolvers.ts`](src/resolvers.ts) load every relation with its own
Prisma query, per parent object. A single nested query cascades into hundreds of SQL
statements:

```
users { posts { comments { author { posts } } } }
  1   query   user list
  N   queries posts        (one per user)
  N·M queries comments      (one per post)
  N·M·K queries author      (one per comment)
  ...
```

With the seed data (10 users × 5 posts × 4 comments), the [`Feed`](operations/feed.graphql)
operation fans out to **311 SQL queries** for one HTTP request.

## What GraphQL Painkiller sees

Run the analyzer over the operations — it flags the N+1 shape statically, no server or
database required:

```console
$ gql-painkiller analyze ./operations/feed.graphql

Operation: Feed
File: operations/feed.graphql
Risk Score: 10/10 — CRITICAL
Findings:
  - [WARNING] MAX_DEPTH                     users.posts.comments.author.posts.id (depth 6 > 5)
  - [HIGH]    MISSING_PAGINATION            users
  - [HIGH]    MISSING_PAGINATION            users.posts
  - [HIGH]    MISSING_PAGINATION            users.posts.comments
  - [HIGH]    MISSING_PAGINATION            users.posts.comments.author.posts
  - [HIGH]    NESTED_COLLECTION_N_PLUS_ONE  users.posts
  ...
  9 findings · Max risk score: 10/10
```

The bounded [`SafeUserPosts`](operations/safe-feed.graphql) operation scores **2/10 (INFO)**
by comparison — one entry point, no recursive expansion.

## Run it yourself

```bash
npm install
npm run db:setup        # prisma db push + seed (SQLite, no external DB)
npm start               # Apollo at http://localhost:4000
```

Open the sandbox, paste [`operations/feed.graphql`](operations/feed.graphql), and watch the
terminal — Prisma logs every query, so you can count the explosion live.

Then point GraphQL Painkiller at the operations:

```bash
# install the CLI: https://github.com/olddognewflex/GraphQL-PainKiller#install
gql-painkiller analyze ./operations
```

## The fix (not implemented here, on purpose)

In a real service you would batch the relation lookups with
[DataLoader](https://github.com/graphql/dataloader) or load relations eagerly via Prisma's
`include`, and add pagination arguments to every list field. GraphQL Painkiller exists to
flag the operations that need that treatment.

## Layout

| Path | What |
|------|------|
| `prisma/schema.prisma` | User → Post → Comment relations (deep on purpose) |
| `prisma/seed.ts` | Seeds 10 users / 50 posts / 200 comments |
| `src/schema.ts` | GraphQL type definitions |
| `src/resolvers.ts` | The deliberately N+1-shaped resolvers |
| `src/index.ts` | Apollo standalone server |
| `operations/feed.graphql` | The N+1 bomb (CRITICAL) |
| `operations/safe-feed.graphql` | A bounded query (INFO) |

## License

Apache-2.0
