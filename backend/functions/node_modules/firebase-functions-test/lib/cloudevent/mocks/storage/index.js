"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageV1 = void 0;
const helpers_1 = require("../helpers");
const storage_data_1 = require("./storage-data");
exports.storageV1 = {
    generateMock(cloudFunction, cloudEventPartial) {
        var _a;
        const bucketOrExpression = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.bucket) ||
            ((_a = (0, helpers_1.getEventFilters)(cloudFunction)) === null || _a === void 0 ? void 0 : _a.bucket) ||
            'bucket_name';
        const bucket = (0, helpers_1.resolveStringExpression)(bucketOrExpression);
        const source = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.source) ||
            `//storage.googleapis.com/projects/_/buckets/${bucket}`;
        const subject = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.subject) || `objects/${helpers_1.FILENAME}`;
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { 
            // Spread fields specific to this CloudEvent
            bucket,
            source,
            subject, data: (0, storage_data_1.getStorageObjectData)(bucket, helpers_1.FILENAME, 1) });
    },
    match(cloudFunction) {
        return (0, helpers_1.getEventType)(cloudFunction).startsWith('google.cloud.storage.object.v1');
    },
};
