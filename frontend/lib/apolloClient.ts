import { ApolloClient, InMemoryCache, split, HttpLink } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

const httpLink = new HttpLink({ uri: "http://localhost:3001/graphql" });

const wsLink =
  typeof window !== "undefined"
    ? new GraphQLWsLink(createClient({ url: "ws://localhost:3001/graphql" }))
    : null;

const link = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      httpLink,
    )
  : httpLink;

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
