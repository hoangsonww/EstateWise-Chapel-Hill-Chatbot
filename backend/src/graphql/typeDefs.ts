import { gql } from "apollo-server-express";

export const typeDefs = gql`
  type WatchProperty {
    propertyId: ID!
    price: Float!
  }

  type Query {
    watchlist: [WatchProperty!]!
  }

  type Mutation {
    addToWatchlist(propertyId: ID!): WatchProperty
    removeFromWatchlist(propertyId: ID!): Boolean
    updatePropertyPrice(propertyId: ID!, price: Float!): WatchProperty
  }

  type Subscription {
    priceUpdated(propertyId: ID!): WatchProperty
  }
`;
