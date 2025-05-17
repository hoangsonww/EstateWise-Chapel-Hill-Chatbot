"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firestoreOnDocumentCreated = void 0;
const helpers_1 = require("../helpers");
const helpers_2 = require("./helpers");
exports.firestoreOnDocumentCreated = {
    generateMock: helpers_2.getDocumentSnapshotCloudEvent,
    match(cloudFunction) {
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.cloud.firestore.document.v1.created');
    },
};
