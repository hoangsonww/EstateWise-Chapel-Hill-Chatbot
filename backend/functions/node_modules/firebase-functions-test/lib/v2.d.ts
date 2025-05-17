import { CloudFunction, CloudEvent } from 'firebase-functions/v2';
import { CallableFunction, CallableRequest } from 'firebase-functions/v2/https';
import { DeepPartial } from './cloudevent/types';
/** A function that can be called with test data and optional override values for {@link CloudEvent}
 * It will subsequently invoke the cloud function it wraps with the provided {@link CloudEvent}
 */
export type WrappedV2Function<T extends CloudEvent<unknown>> = (cloudEventPartial?: DeepPartial<T | object>) => any | Promise<any>;
export type WrappedV2CallableFunction<T> = (data: CallableRequest) => T | Promise<T>;
/**
 * Takes a v2 cloud function to be tested, and returns a {@link WrappedV2Function}
 * which can be called in test code.
 */
export declare function wrapV2<T extends CloudEvent<unknown>>(cloudFunction: CloudFunction<T>): WrappedV2Function<T>;
/**
 * Takes a v2 HTTP function to be tested, and returns a {@link WrappedV2HttpsFunction}
 * which can be called in test code.
 */
export declare function wrapV2(cloudFunction: CallableFunction<any, any>): WrappedV2CallableFunction<any>;
