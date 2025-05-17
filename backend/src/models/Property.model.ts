import mongoose, { Schema, Document } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       description: Details of the property's address.
 *       properties:
 *         streetAddress:
 *           type: string
 *           description: Street address of the property.
 *           example: "123 Main St"
 *         city:
 *           type: string
 *           description: City where the property is located.
 *           example: "Los Angeles"
 *         state:
 *           type: string
 *           description: State where the property is located.
 *           example: "CA"
 *         zipcode:
 *           type: string
 *           description: Zip code of the property's location.
 *           example: "90001"
 *         neighborhood:
 *           type: string
 *           description: Neighborhood of the property (optional).
 *           example: "Hollywood"
 *         community:
 *           type: string
 *           description: Community where the property is located (optional).
 *           example: "Downtown"
 *         subdivision:
 *           type: string
 *           description: Subdivision of the property (optional).
 *           example: "Sunset Villas"
 *       required:
 *         - streetAddress
 *         - city
 *         - state
 *         - zipcode
 *
 *     Property:
 *       type: object
 *       description: Contains only the fields needed for chatbot recommendations.
 *       properties:
 *         zpid:
 *           type: number
 *           description: Unique property ID.
 *           example: 123456789
 *         city:
 *           type: string
 *           description: City where the property is located.
 *           example: "Los Angeles"
 *         state:
 *           type: string
 *           description: State where the property is located.
 *           example: "CA"
 *         homeStatus:
 *           type: string
 *           description: The status of the home (e.g., active, pending, sold).
 *           example: "active"
 *         address:
 *           $ref: '#/components/schemas/Address'
 *         bedrooms:
 *           type: number
 *           description: Number of bedrooms in the property.
 *           example: 3
 *         bathrooms:
 *           type: number
 *           description: Number of bathrooms in the property.
 *           example: 2
 *         price:
 *           type: number
 *           description: Price of the property.
 *           example: 750000
 *         yearBuilt:
 *           type: number
 *           description: The year the property was built.
 *           example: 1990
 *         latitude:
 *           type: number
 *           description: Latitude coordinate of the property.
 *           example: 34.0522
 *         longitude:
 *           type: number
 *           description: Longitude coordinate of the property.
 *           example: -118.2437
 *         livingArea:
 *           type: number
 *           description: Living area in square feet.
 *           example: 1500
 *         homeType:
 *           type: string
 *           description: Type of home (e.g., single-family, condo).
 *           example: "single-family"
 *         listingDataSource:
 *           type: string
 *           description: Data source from which the listing information was obtained.
 *           example: "Zillow"
 *         description:
 *           type: string
 *           description: Detailed description of the property.
 *           example: "Beautiful family home with a spacious backyard."
 *       required:
 *         - zpid
 *         - city
 *         - state
 *         - homeStatus
 *         - address
 *         - bedrooms
 *         - bathrooms
 *         - price
 *         - yearBuilt
 *         - latitude
 *         - longitude
 *         - livingArea
 *         - homeType
 *         - listingDataSource
 */

/**
 * This is the property interface.
 * It contains only the fields needed for your chatbot recommendations.
 */
export interface IProperty extends Document {
  id: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  yearBuilt?: number;
  homeType: string;
  homeStatus: string;
  city: string;
  link?: string; // Added field for external property links
}

/**
 * Helper: if a value is a nonempty string, return the trimmed version;
 * otherwise, return a fallback.
 */
const AddressSchema: Schema = new Schema(
  {
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipcode: { type: String, required: true },
    neighborhood: { type: String, default: null },
    community: { type: String, default: null },
    subdivision: { type: String, default: null },
  },
  { _id: false },
);

/**
 * This is the property schema.
 * It contains only the fields needed for your chatbot recommendations.
 */
const PropertySchema: Schema = new Schema({
  zpid: { type: Number, required: true, unique: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  homeStatus: { type: String, required: true },
  address: { type: AddressSchema, required: true },
  bedrooms: { type: Number, required: true },
  bathrooms: { type: Number, required: true },
  price: { type: Number, required: true },
  yearBuilt: { type: Number, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  livingArea: { type: Number, required: true },
  homeType: { type: String, required: true },
  listingDataSource: { type: String, required: true },
  description: { type: String, default: "" },
});

export default mongoose.model<IProperty>("Property", PropertySchema);
