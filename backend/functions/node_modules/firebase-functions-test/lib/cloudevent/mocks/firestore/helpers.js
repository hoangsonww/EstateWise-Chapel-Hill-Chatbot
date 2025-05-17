"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocumentSnapshotChangeCloudEventWithAuthContext = exports.getDocumentSnapshotChangeCloudEvent = exports.getDocumentSnapshotCloudEventWithAuthContext = exports.getDocumentSnapshotCloudEvent = void 0;
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const firestore_2 = require("../../../providers/firestore");
const helpers_1 = require("../helpers");
/** Creates a mock CloudEvent that contains a DocumentSnapshot as its data. */
function getDocumentSnapshotCloudEvent(cloudFunction, cloudEventPartial) {
    const { location, project, database, namespace, document, params, } = getFirestoreEventFields(cloudFunction, cloudEventPartial);
    const data = getOrCreateDocumentSnapshot(cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data, document);
    return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { location,
        project,
        database,
        namespace,
        document,
        params,
        data });
}
exports.getDocumentSnapshotCloudEvent = getDocumentSnapshotCloudEvent;
function getDocumentSnapshotCloudEventWithAuthContext(cloudFunction, cloudEventPartial) {
    const eventWithoutAuthContext = getDocumentSnapshotCloudEvent(cloudFunction, cloudEventPartial);
    const authContext = {
        authType: 'unknown',
    };
    if (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.authId) {
        authContext.authId = cloudEventPartial.authId;
    }
    if (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.authType) {
        authContext.authType = cloudEventPartial.authType;
    }
    return Object.assign(Object.assign({}, eventWithoutAuthContext), authContext);
}
exports.getDocumentSnapshotCloudEventWithAuthContext = getDocumentSnapshotCloudEventWithAuthContext;
/** Creates a mock CloudEvent that contains a Change<DocumentSnapshot> as its data. */
function getDocumentSnapshotChangeCloudEvent(cloudFunction, cloudEventPartial) {
    const { location, project, database, namespace, document, params, } = getFirestoreEventFields(cloudFunction, cloudEventPartial);
    const data = getOrCreateDocumentSnapshotChange(cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.data, document);
    return Object.assign(Object.assign({}, (0, helpers_1.getBaseCloudEvent)(cloudFunction)), { location,
        project,
        database,
        namespace,
        document,
        params,
        data });
}
exports.getDocumentSnapshotChangeCloudEvent = getDocumentSnapshotChangeCloudEvent;
function getDocumentSnapshotChangeCloudEventWithAuthContext(cloudFunction, cloudEventPartial) {
    const eventWithoutAuthContext = getDocumentSnapshotChangeCloudEvent(cloudFunction, cloudEventPartial);
    const authContext = {
        authType: 'unknown',
    };
    if (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.authId) {
        authContext.authId = cloudEventPartial.authId;
    }
    if (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.authType) {
        authContext.authType = cloudEventPartial.authType;
    }
    return Object.assign(Object.assign({}, eventWithoutAuthContext), authContext);
}
exports.getDocumentSnapshotChangeCloudEventWithAuthContext = getDocumentSnapshotChangeCloudEventWithAuthContext;
/** Finds or provides reasonable defaults for mock FirestoreEvent data. */
function getFirestoreEventFields(cloudFunction, cloudEventPartial) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const location = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.location) || 'us-central1';
    const project = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.project) || process.env.GCLOUD_PROJECT || 'testproject';
    const databaseOrExpression = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.database) ||
        ((_c = (_b = (_a = cloudFunction === null || cloudFunction === void 0 ? void 0 : cloudFunction.__endpoint) === null || _a === void 0 ? void 0 : _a.eventTrigger) === null || _b === void 0 ? void 0 : _b.eventFilters) === null || _c === void 0 ? void 0 : _c.database) ||
        '(default)';
    const database = (0, helpers_1.resolveStringExpression)(databaseOrExpression);
    const namespaceOrExpression = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.namespace) ||
        ((_f = (_e = (_d = cloudFunction === null || cloudFunction === void 0 ? void 0 : cloudFunction.__endpoint) === null || _d === void 0 ? void 0 : _d.eventTrigger) === null || _e === void 0 ? void 0 : _e.eventFilters) === null || _f === void 0 ? void 0 : _f.namespace) ||
        '(default)';
    const namespace = (0, helpers_1.resolveStringExpression)(namespaceOrExpression);
    const params = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.params) || {};
    const documentOrExpression = (cloudEventPartial === null || cloudEventPartial === void 0 ? void 0 : cloudEventPartial.document) ||
        ((_j = (_h = (_g = cloudFunction === null || cloudFunction === void 0 ? void 0 : cloudFunction.__endpoint) === null || _g === void 0 ? void 0 : _g.eventTrigger) === null || _h === void 0 ? void 0 : _h.eventFilters) === null || _j === void 0 ? void 0 : _j.document) ||
        ((_m = (_l = (_k = cloudFunction === null || cloudFunction === void 0 ? void 0 : cloudFunction.__endpoint) === null || _k === void 0 ? void 0 : _k.eventTrigger) === null || _l === void 0 ? void 0 : _l.eventFilterPathPatterns) === null || _m === void 0 ? void 0 : _m.document) ||
        '/foo/bar';
    const documentRaw = (0, helpers_1.resolveStringExpression)(documentOrExpression);
    const document = (0, helpers_1.extractRef)(documentRaw, params);
    return {
        location,
        project,
        database,
        namespace,
        document,
        params,
    };
}
/** Make a DocumentSnapshot from the user-provided partial data. */
function getOrCreateDocumentSnapshot(data, ref) {
    if (data instanceof firestore_1.DocumentSnapshot) {
        return data;
    }
    if (data instanceof Object) {
        return (0, firestore_2.makeDocumentSnapshot)(data, ref);
    }
    return (0, firestore_2.exampleDocumentSnapshot)();
}
/** Make a DocumentSnapshotChange from the user-provided partial data. */
function getOrCreateDocumentSnapshotChange(data, ref) {
    if (data instanceof v2_1.Change) {
        return data;
    }
    // If only the "before" or "after" is specified (to simulate a
    // Created or Deleted event for the onWritten trigger), then we
    // include the user's before/after object in the mock event and
    // use an example snapshot for the other.
    if ((data === null || data === void 0 ? void 0 : data.before) || (data === null || data === void 0 ? void 0 : data.after)) {
        const beforeSnapshot = getOrCreateDocumentSnapshot(data.before, ref);
        const afterSnapshot = getOrCreateDocumentSnapshot(data.after, ref);
        return new v2_1.Change(beforeSnapshot, afterSnapshot);
    }
    return (0, firestore_2.exampleDocumentSnapshotChange)();
}
