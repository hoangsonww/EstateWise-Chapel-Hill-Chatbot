import { MockCloudEventAbstractFactory } from '../../types';
import { FirebaseAlertData, AlertEvent } from 'firebase-functions/v2/alerts';
export declare const alertsOnAlertPublished: MockCloudEventAbstractFactory<AlertEvent<FirebaseAlertData>>;
