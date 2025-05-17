import { MockCloudEventAbstractFactory } from '../../types';
import { firestore } from 'firebase-functions/v2';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
export declare const firestoreOnDocumentCreatedWithAuthContext: MockCloudEventAbstractFactory<firestore.FirestoreAuthEvent<QueryDocumentSnapshot>>;
