import { CloudFunction, database } from 'firebase-functions/v2';
import { DeepPartial } from '../../types';
import { Change } from 'firebase-functions/v1';
type ChangeLike = {
    before: database.DataSnapshot | object;
    after: database.DataSnapshot | object;
};
export declare function getDatabaseSnapshotCloudEvent(cloudFunction: CloudFunction<database.DatabaseEvent<database.DataSnapshot>>, cloudEventPartial?: DeepPartial<database.DatabaseEvent<database.DataSnapshot | object>>): {
    data: database.DataSnapshot;
    instance: string;
    firebaseDatabaseHost: string;
    ref: string;
    location: string;
    params: Record<string, string>;
    specversion: "1.0";
    id: string;
    source: string;
    subject?: string;
    type: string;
    time: string;
};
export declare function getDatabaseChangeSnapshotCloudEvent(cloudFunction: CloudFunction<database.DatabaseEvent<Change<database.DataSnapshot>>>, cloudEventPartial?: DeepPartial<database.DatabaseEvent<Change<database.DataSnapshot> | ChangeLike>>): database.DatabaseEvent<Change<database.DataSnapshot>>;
export declare function getCommonDatabaseFields(cloudFunction: CloudFunction<database.DatabaseEvent<database.DataSnapshot | Change<database.DataSnapshot>>>, cloudEventPartial?: DeepPartial<database.DatabaseEvent<database.DataSnapshot | Change<database.DataSnapshot>>>): {
    instance: string;
    firebaseDatabaseHost: string;
    ref: string;
    location: string;
    params: Record<string, string>;
};
export {};
