import { MockCloudEventAbstractFactory } from '../../types';
import { AppDistributionEvent, NewTesterDevicePayload } from 'firebase-functions/v2/alerts/appDistribution';
export declare const alertsAppDistributionOnNewTesterIosDevicePublished: MockCloudEventAbstractFactory<AppDistributionEvent<NewTesterDevicePayload>>;
