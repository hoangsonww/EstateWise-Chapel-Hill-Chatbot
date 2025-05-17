import { MockCloudEventAbstractFactory } from '../../types';
import { Change, firestore } from 'firebase-functions/v2';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
export declare const firestoreOnDocumentUpdated: MockCloudEventAbstractFactory<firestore.FirestoreEvent<Change<QueryDocumentSnapshot>>>;
