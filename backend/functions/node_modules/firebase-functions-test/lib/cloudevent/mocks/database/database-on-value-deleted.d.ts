import { MockCloudEventAbstractFactory } from '../../types';
import { database } from 'firebase-functions/v2';
export declare const databaseOnValueDeleted: MockCloudEventAbstractFactory<database.DatabaseEvent<database.DataSnapshot>>;
