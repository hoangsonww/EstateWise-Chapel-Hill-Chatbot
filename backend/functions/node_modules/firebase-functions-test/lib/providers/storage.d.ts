import { storage } from 'firebase-functions/v1';
/** Create an ObjectMetadata */
export declare function makeObjectMetadata(
/** Fields of ObjectMetadata that you'd like to specify. */
fields: {
    [key: string]: string;
}): storage.ObjectMetadata;
/** Fetch an example ObjectMetadata already populated with data. */
export declare function exampleObjectMetadata(): storage.ObjectMetadata;
