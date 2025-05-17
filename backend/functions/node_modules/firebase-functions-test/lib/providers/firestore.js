"use strict";
// The MIT License (MIT)
//
// Copyright (c) 2018 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearFirestoreData = exports.objectToValueProto = exports.exampleDocumentSnapshotChange = exports.exampleDocumentSnapshot = exports.makeDocumentSnapshot = void 0;
const v1_1 = require("firebase-functions/v1");
const firebase_admin_1 = require("firebase-admin");
const lodash_1 = require("lodash");
const app_1 = require("../app");
const http = require("http");
function dateToTimestampProto(timeString) {
    if (typeof timeString === 'undefined') {
        return;
    }
    const date = new Date(timeString);
    const seconds = Math.floor(date.getTime() / 1000);
    let nanos = 0;
    if (timeString.length > 20) {
        const nanoString = timeString.substring(20, timeString.length - 1);
        const trailingZeroes = 9 - nanoString.length;
        nanos = parseInt(nanoString, 10) * Math.pow(10, trailingZeroes);
    }
    return { seconds, nanos };
}
/** Create a DocumentSnapshot. */
function makeDocumentSnapshot(
/** Key-value pairs representing data in the document, pass in `{}` to mock the snapshot of
 * a document that doesn't exist.
 */
data, 
/** Full path of the reference (e.g. 'users/alovelace') */
refPath, options) {
    let firestoreService;
    let project;
    if ((0, lodash_1.has)(options, 'app')) {
        firestoreService = (0, firebase_admin_1.firestore)(options.firebaseApp);
        project = (0, lodash_1.get)(options, 'app.options.projectId');
    }
    else {
        firestoreService = (0, firebase_admin_1.firestore)((0, app_1.testApp)().getApp());
        project = process.env.GCLOUD_PROJECT;
    }
    const resource = `projects/${project}/databases/(default)/documents/${refPath}`;
    const proto = (0, lodash_1.isEmpty)(data)
        ? resource
        : {
            fields: objectToValueProto(data),
            createTime: dateToTimestampProto((0, lodash_1.get)(options, 'createTime', new Date().toISOString())),
            updateTime: dateToTimestampProto((0, lodash_1.get)(options, 'updateTime', new Date().toISOString())),
            name: resource,
        };
    const readTimeProto = dateToTimestampProto((0, lodash_1.get)(options, 'readTime') || new Date().toISOString());
    return firestoreService.snapshot_(proto, readTimeProto, 'json');
}
exports.makeDocumentSnapshot = makeDocumentSnapshot;
/** Fetch an example document snapshot already populated with data. Can be passed into a wrapped
 * Firestore onCreate or onDelete function.
 */
function exampleDocumentSnapshot() {
    return makeDocumentSnapshot({
        aString: 'foo',
        anObject: {
            a: 'bar',
            b: 'faz',
        },
        aNumber: 7,
    }, 'records/1234');
}
exports.exampleDocumentSnapshot = exampleDocumentSnapshot;
/** Fetch an example Change object of document snapshots already populated with data.
 * Can be passed into a wrapped Firestore onUpdate or onWrite function.
 */
function exampleDocumentSnapshotChange() {
    return v1_1.Change.fromObjects(makeDocumentSnapshot({
        anObject: {
            a: 'bar',
        },
        aNumber: 7,
    }, 'records/1234'), makeDocumentSnapshot({
        aString: 'foo',
        anObject: {
            a: 'qux',
            b: 'faz',
        },
        aNumber: 7,
    }, 'records/1234'));
}
exports.exampleDocumentSnapshotChange = exampleDocumentSnapshotChange;
/** @internal */
function objectToValueProto(data) {
    const encodeHelper = (val) => {
        var _a;
        if (typeof val === 'string') {
            return {
                stringValue: val,
            };
        }
        if (typeof val === 'boolean') {
            return {
                booleanValue: val,
            };
        }
        if (typeof val === 'number') {
            if (val % 1 === 0) {
                return {
                    integerValue: val,
                };
            }
            return {
                doubleValue: val,
            };
        }
        if (val instanceof Date) {
            return {
                timestampValue: val.toISOString(),
            };
        }
        if (val instanceof Array) {
            let encodedElements = [];
            for (const elem of val) {
                const enc = encodeHelper(elem);
                if (enc) {
                    encodedElements.push(enc);
                }
            }
            return {
                arrayValue: {
                    values: encodedElements,
                },
            };
        }
        if (val === null) {
            // TODO: Look this up. This is a google.protobuf.NulLValue,
            // and everything in google.protobuf has a customized JSON encoder.
            // OTOH, Firestore's generated .d.ts files don't take this into
            // account and have the default proto layout.
            return {
                nullValue: 'NULL_VALUE',
            };
        }
        if (val instanceof Buffer || val instanceof Uint8Array) {
            return {
                bytesValue: val,
            };
        }
        if (val instanceof firebase_admin_1.firestore.DocumentReference) {
            const projectId = (0, lodash_1.get)(val, '_referencePath.projectId');
            const database = (0, lodash_1.get)(val, '_referencePath.databaseId');
            const referenceValue = [
                'projects',
                projectId,
                'databases',
                database,
                val.path,
            ].join('/');
            return { referenceValue };
        }
        if (val instanceof firebase_admin_1.firestore.Timestamp) {
            return {
                timestampValue: val.toDate().toISOString(),
            };
        }
        if (val instanceof firebase_admin_1.firestore.GeoPoint) {
            return {
                geoPointValue: {
                    latitude: val.latitude,
                    longitude: val.longitude,
                },
            };
        }
        if ((0, lodash_1.isPlainObject)(val)) {
            return {
                mapValue: {
                    fields: objectToValueProto(val),
                },
            };
        }
        throw new Error('Cannot encode ' +
            val +
            'to a Firestore Value.' +
            ` Local testing does not yet support objects of type ${(_a = val === null || val === void 0 ? void 0 : val.constructor) === null || _a === void 0 ? void 0 : _a.name}.`);
    };
    return (0, lodash_1.mapValues)(data, encodeHelper);
}
exports.objectToValueProto = objectToValueProto;
const FIRESTORE_ADDRESS_ENVS = [
    'FIRESTORE_EMULATOR_HOST',
    'FIREBASE_FIRESTORE_EMULATOR_ADDRESS',
];
/** Clears all data in firestore. Works only in offline mode.
 */
function clearFirestoreData(options) {
    const FIRESTORE_ADDRESS = FIRESTORE_ADDRESS_ENVS.reduce((addr, name) => process.env[name] || addr, 'localhost:8080');
    return new Promise((resolve, reject) => {
        let projectId;
        if (typeof options === 'string') {
            projectId = options;
        }
        else if (typeof options === 'object' && (0, lodash_1.has)(options, 'projectId')) {
            projectId = options.projectId;
        }
        else {
            throw new Error('projectId not specified');
        }
        const config = {
            method: 'DELETE',
            hostname: FIRESTORE_ADDRESS.split(':')[0],
            port: FIRESTORE_ADDRESS.split(':')[1],
            path: `/emulator/v1/projects/${projectId}/databases/(default)/documents`,
        };
        const req = http.request(config, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`statusCode: ${res.statusCode}`));
            }
            res.on('data', () => { });
            res.on('end', resolve);
        });
        req.on('error', (error) => {
            reject(error);
        });
        const postData = JSON.stringify({
            database: `projects/${projectId}/databases/(default)`,
        });
        req.setHeader('Content-Length', postData.length);
        req.write(postData);
        req.end();
    });
}
exports.clearFirestoreData = clearFirestoreData;
