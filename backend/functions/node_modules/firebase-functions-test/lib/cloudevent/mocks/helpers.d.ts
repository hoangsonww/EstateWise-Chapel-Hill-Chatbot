import * as v1 from 'firebase-functions/v1';
import * as v2 from 'firebase-functions/v2';
import { Expression } from 'firebase-functions/params';
export declare const APP_ID = "__APP_ID__";
export declare const PROJECT_ID = "42";
export declare const FILENAME = "file_name";
type CloudFunction = v1.CloudFunction<any> | v2.CloudFunction<any>;
export declare function getEventType(cloudFunction: CloudFunction): string;
export declare function getEventFilters(cloudFunction: CloudFunction): Record<string, string | Expression<string>>;
export declare function getBaseCloudEvent<EventType extends v2.CloudEvent<unknown>>(cloudFunction: v2.CloudFunction<EventType>): EventType;
export declare function resolveStringExpression(stringOrExpression: string | Expression<string>): string;
/** Resolves param values and inserts them into the provided ref string. */
export declare function extractRef(rawRef: string, params: Record<string, string>): string;
export {};
