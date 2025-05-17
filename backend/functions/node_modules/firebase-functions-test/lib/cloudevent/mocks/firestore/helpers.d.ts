import { DocumentSnapshot } from 'firebase-admin/firestore';
import { Change, CloudFunction, firestore } from 'firebase-functions/v2';
import { DeepPartial } from '../../types';
type ChangeLike = {
    before: DocumentSnapshot | object;
    after: DocumentSnapshot | object;
};
/** Creates a mock CloudEvent that contains a DocumentSnapshot as its data. */
export declare function getDocumentSnapshotCloudEvent(cloudFunction: CloudFunction<firestore.FirestoreEvent<DocumentSnapshot>>, cloudEventPartial?: DeepPartial<firestore.FirestoreEvent<DocumentSnapshot | object>>): {
    location: string;
    project: string;
    database: string;
    namespace: string;
    document: string;
    params: DeepPartial<Record<string, string>>;
    data: any;
    specversion: "1.0";
    id: string;
    source: string;
    subject?: string;
    type: string;
    time: string;
};
export declare function getDocumentSnapshotCloudEventWithAuthContext(cloudFunction: CloudFunction<firestore.FirestoreAuthEvent<DocumentSnapshot>>, cloudEventPartial?: DeepPartial<firestore.FirestoreAuthEvent<DocumentSnapshot | object>>): {
    authId?: string;
    authType: firestore.AuthType;
    location: string;
    project: string;
    database: string;
    namespace: string;
    document: string;
    params: DeepPartial<Record<string, string>>;
    data: any;
    specversion: "1.0";
    id: string;
    source: string;
    subject?: string;
    type: string;
    time: string;
};
/** Creates a mock CloudEvent that contains a Change<DocumentSnapshot> as its data. */
export declare function getDocumentSnapshotChangeCloudEvent(cloudFunction: CloudFunction<firestore.FirestoreEvent<Change<DocumentSnapshot>>>, cloudEventPartial?: DeepPartial<firestore.FirestoreEvent<Change<DocumentSnapshot> | ChangeLike>>): {
    location: string;
    project: string;
    database: string;
    namespace: string;
    document: string;
    params: DeepPartial<Record<string, string>>;
    data: Change<any>;
    specversion: "1.0";
    id: string;
    source: string;
    subject?: string;
    type: string;
    time: string;
};
export declare function getDocumentSnapshotChangeCloudEventWithAuthContext(cloudFunction: CloudFunction<firestore.FirestoreAuthEvent<Change<DocumentSnapshot>>>, cloudEventPartial?: DeepPartial<firestore.FirestoreAuthEvent<Change<DocumentSnapshot> | ChangeLike>>): {
    authId?: string;
    authType: firestore.AuthType;
    location: string;
    project: string;
    database: string;
    namespace: string;
    document: string;
    params: DeepPartial<Record<string, string>>;
    data: Change<any>;
    specversion: "1.0";
    id: string;
    source: string;
    subject?: string;
    type: string;
    time: string;
};
export {};
