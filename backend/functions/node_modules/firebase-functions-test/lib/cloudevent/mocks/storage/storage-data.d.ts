import { storage } from 'firebase-functions/v2';
/** Storage Data */
export declare function getStorageObjectData(bucket: string, filename: string, generation: number): storage.StorageObjectData;
