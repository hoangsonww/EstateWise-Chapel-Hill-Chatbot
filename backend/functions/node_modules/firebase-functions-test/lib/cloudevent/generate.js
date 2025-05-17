"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMockCloudEvent = exports.generateCombinedCloudEvent = void 0;
const v2_1 = require("firebase-functions/v2");
const firestore_1 = require("firebase-admin/firestore");
const partials_1 = require("./mocks/partials");
const v1_1 = require("firebase-functions/v1");
const ts_deepmerge_1 = require("ts-deepmerge");
/**
 * @return {CloudEvent} Generated Mock CloudEvent
 */
function generateCombinedCloudEvent(cloudFunction, cloudEventPartial) {
    const generatedCloudEvent = generateMockCloudEvent(cloudFunction, cloudEventPartial);
    return mergeCloudEvents(generatedCloudEvent, cloudEventPartial);
}
exports.generateCombinedCloudEvent = generateCombinedCloudEvent;
function generateMockCloudEvent(cloudFunction, cloudEventPartial) {
    for (const mockCloudEventPartial of partials_1.LIST_OF_MOCK_CLOUD_EVENT_PARTIALS) {
        if (mockCloudEventPartial.match(cloudFunction)) {
            return mockCloudEventPartial.generateMock(cloudFunction, cloudEventPartial);
        }
    }
    // No matches were found
    return null;
}
exports.generateMockCloudEvent = generateMockCloudEvent;
const IMMUTABLE_DATA_TYPES = [
    v2_1.database.DataSnapshot,
    firestore_1.DocumentSnapshot,
    firestore_1.QueryDocumentSnapshot,
    v1_1.Change,
    v2_1.pubsub.Message,
];
function mergeCloudEvents(generatedCloudEvent, cloudEventPartial) {
    /**
     * There are several CloudEvent.data types that can not be overridden with json.
     * In these circumstances, we generate the CloudEvent.data given the user supplies
     * in the DeepPartial<CloudEvent>.
     *
     * Because we have already extracted the user supplied data, we don't want to overwrite
     * the CloudEvent.data with an incompatible type.
     *
     * An example of this is a user supplying JSON for the data of the DatabaseEvents.
     * The returned CloudEvent should be returning DataSnapshot that uses the supplied json,
     * NOT the supplied JSON.
     */
    if (shouldDeleteUserSuppliedData(generatedCloudEvent, cloudEventPartial)) {
        delete cloudEventPartial.data;
    }
    return cloudEventPartial
        ? (0, ts_deepmerge_1.default)(generatedCloudEvent, cloudEventPartial)
        : generatedCloudEvent;
}
function shouldDeleteUserSuppliedData(generatedCloudEvent, cloudEventPartial) {
    // Don't attempt to delete the data if there is no data.
    if ((cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data) === undefined) {
        return false;
    }
    // If the user intentionally provides one of the IMMUTABLE DataTypes, DON'T delete it!
    if (IMMUTABLE_DATA_TYPES.some((type) => (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data) instanceof type)) {
        return false;
    }
    /** If the generated CloudEvent.data is an IMMUTABLE DataTypes, then use the generated data and
     * delete the user supplied CloudEvent.data.
     */
    if (IMMUTABLE_DATA_TYPES.some((type) => (generatedCloudEvent === null || generatedCloudEvent === void 0 ? void 0 : generatedCloudEvent.data) instanceof type)) {
        return true;
    }
    // Otherwise, don't delete the data and allow ts-merge to handle merging the data.
    return false;
}
