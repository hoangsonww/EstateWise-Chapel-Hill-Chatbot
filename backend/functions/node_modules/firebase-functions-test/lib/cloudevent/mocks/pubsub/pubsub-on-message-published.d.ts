import { MockCloudEventAbstractFactory } from '../../types';
import { CloudEvent, pubsub } from 'firebase-functions/v2';
export declare const pubsubOnMessagePublished: MockCloudEventAbstractFactory<CloudEvent<pubsub.MessagePublishedData>>;
