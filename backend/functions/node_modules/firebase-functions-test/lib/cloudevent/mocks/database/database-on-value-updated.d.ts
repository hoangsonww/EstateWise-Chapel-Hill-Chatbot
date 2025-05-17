import { MockCloudEventAbstractFactory } from '../../types';
import { database } from 'firebase-functions/v2';
import { Change } from 'firebase-functions/v1';
export declare const databaseOnValueUpdated: MockCloudEventAbstractFactory<database.DatabaseEvent<Change<database.DataSnapshot>>>;
