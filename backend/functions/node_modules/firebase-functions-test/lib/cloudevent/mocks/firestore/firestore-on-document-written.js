"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firestoreOnDocumentWritten = void 0;
const helpers_1 = require("../helpers");
const helpers_2 = require("./helpers");
exports.firestoreOnDocumentWritten = {
    generateMock: helpers_2.getDocumentSnapshotChangeCloudEvent,
    match(cloudFunction) {
        return ((0, helpers_1.getEventType)(cloudFunction) ===
            'google.cloud.firestore.document.v1.written');
    },
};
