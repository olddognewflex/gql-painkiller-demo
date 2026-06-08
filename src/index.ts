import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";
import { createContext, type Context } from "./context.js";

const server = new ApolloServer<Context>({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  context: async () => createContext(),
  listen: { port: Number(process.env.PORT ?? 4000) },
});

console.log(`🚑 gql-painkiller-demo ready at ${url}`);
console.log(
  "Open the sandbox and run operations/feed.graphql — watch the query log explode.",
);
