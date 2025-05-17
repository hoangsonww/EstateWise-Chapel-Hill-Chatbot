import { MockCloudEventAbstractFactory } from '../../types';
import { database } from 'firebase-functions/v2';
export declare const databaseOnValueCreated: MockCloudEventAbstractFactory<database.DatabaseEvent<database.DataSnapshot>>;
