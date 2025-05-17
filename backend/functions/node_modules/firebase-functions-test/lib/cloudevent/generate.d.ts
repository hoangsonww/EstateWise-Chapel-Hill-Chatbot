import { CloudEvent, CloudFunction } from 'firebase-functions/v2';
import { DeepPartial } from './types';
/**
 * @return {CloudEvent} Generated Mock CloudEvent
 */
export declare function generateCombinedCloudEvent<EventType extends CloudEvent<unknown>>(cloudFunction: CloudFunction<EventType>, cloudEventPartial?: DeepPartial<EventType>): EventType;
export declare function generateMockCloudEvent<EventType extends CloudEvent<unknown>>(cloudFunction: CloudFunction<EventType>, cloudEventPartial?: DeepPartial<EventType>): EventType;
