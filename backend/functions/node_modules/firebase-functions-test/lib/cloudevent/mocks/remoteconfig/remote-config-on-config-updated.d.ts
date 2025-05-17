import { MockCloudEventAbstractFactory } from '../../types';
import { CloudEvent } from 'firebase-functions/v2';
import { ConfigUpdateData } from 'firebase-functions/v2/remoteConfig';
export declare const remoteConfigOnConfigUpdated: MockCloudEventAbstractFactory<CloudEvent<ConfigUpdateData>>;
