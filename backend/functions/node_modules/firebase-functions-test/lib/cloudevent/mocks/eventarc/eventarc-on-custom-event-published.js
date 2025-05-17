"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventarcOnCustomEventPublished = void 0;
const helpers_1 = require("../helpers");
exports.eventarcOnCustomEventPublished = {
    generateMock(cloudFunction, cloudEventPartial) {
        const source = 'eventarc_source';
        const subject = 'eventarc_subject';
        return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { 
            // Spread fields specific to this CloudEvent
            data: (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data) || {}, source,
            subject });
    },
    match(_) {
        return true;
    },
};
