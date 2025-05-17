import { MockCloudEventAbstractFactory } from '../../types';
import { firestore } from 'firebase-functions/v2';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
export declare const firestoreOnDocumentDeleted: MockCloudEventAbstractFactory<firestore.FirestoreEvent<QueryDocumentSnapshot>>;
