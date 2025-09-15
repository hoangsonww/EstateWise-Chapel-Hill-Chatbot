import PropertyModel from "../models/Property.model";
import { PubSub, withFilter } from "graphql-subscriptions";

const pubsub = new PubSub();
const PRICE_UPDATED = "PRICE_UPDATED";
const watchlist = new Set<number>();

export const resolvers = {
  Query: {
    watchlist: async () => {
      const properties = await PropertyModel.find({
        zpid: { $in: Array.from(watchlist) },
      });
      return properties.map((p) => ({ propertyId: p.zpid, price: p.price }));
    },
  },
  Mutation: {
    addToWatchlist: async (
      _: unknown,
      { propertyId }: { propertyId: number },
    ) => {
      const property = await PropertyModel.findOne({ zpid: propertyId });
      if (property) {
        watchlist.add(property.zpid);
        return { propertyId: property.zpid, price: property.price };
      }
      return null;
    },
    removeFromWatchlist: (
      _: unknown,
      { propertyId }: { propertyId: number },
    ) => {
      return watchlist.delete(Number(propertyId));
    },
    updatePropertyPrice: async (
      _: unknown,
      { propertyId, price }: { propertyId: number; price: number },
    ) => {
      const property = await PropertyModel.findOneAndUpdate(
        { zpid: propertyId },
        { price },
        { new: true },
      );
      if (property) {
        const payload = { propertyId: property.zpid, price: property.price };
        await pubsub.publish(PRICE_UPDATED, { priceUpdated: payload });
        return payload;
      }
      return null;
    },
  },
  Subscription: {
    priceUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(PRICE_UPDATED),
        (
          payload: { priceUpdated: { propertyId: number } },
          variables: { propertyId: number },
        ) => payload.priceUpdated.propertyId === Number(variables.propertyId),
      ),
    },
  },
};
