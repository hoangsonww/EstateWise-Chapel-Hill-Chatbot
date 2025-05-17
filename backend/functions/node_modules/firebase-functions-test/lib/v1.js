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
exports.mockConfig = exports.makeChange = exports._extractParams = exports._makeResourceName = exports.wrapV1 = void 0;
const lodash_1 = require("lodash");
const v1_1 = require("firebase-functions/v1");
const helpers_1 = require("./cloudevent/mocks/helpers");
function wrapV1(cloudFunction) {
    if (!(0, lodash_1.has)(cloudFunction, '__endpoint')) {
        throw new Error('Wrap can only be called on functions written with the firebase-functions SDK.');
    }
    if ((0, lodash_1.has)(cloudFunction, '__endpoint.scheduleTrigger')) {
        const scheduledWrapped = (options) => {
            // Although in Typescript we require `options` some of our JS samples do not pass it.
            options = options || {};
            _checkOptionValidity(['eventId', 'timestamp'], options);
            const defaultContext = _makeDefaultContext(cloudFunction, options);
            const context = (0, lodash_1.merge)({}, defaultContext, options);
            // @ts-ignore
            return cloudFunction.run(context);
        };
        return scheduledWrapped;
    }
    if ((0, lodash_1.has)(cloudFunction, '__endpoint.httpsTrigger')) {
        throw new Error('Wrap function is only available for `onCall` HTTP functions, not `onRequest`.');
    }
    if (!(0, lodash_1.has)(cloudFunction, 'run')) {
        throw new Error('This library can only be used with functions written with firebase-functions v1.0.0 and above');
    }
    const isCallableFunction = (0, lodash_1.has)(cloudFunction, '__endpoint.callableTrigger');
    let wrapped = (data, options) => {
        // Although in Typescript we require `options` some of our JS samples do not pass it.
        const _options = Object.assign({}, options);
        let context;
        if (isCallableFunction) {
            _checkOptionValidity(['app', 'auth', 'instanceIdToken', 'rawRequest'], _options);
            let callableContextOptions = _options;
            context = Object.assign({}, callableContextOptions);
        }
        else {
            _checkOptionValidity(['eventId', 'timestamp', 'params', 'auth', 'authType', 'resource'], _options);
            const defaultContext = _makeDefaultContext(cloudFunction, _options, data);
            if ((0, lodash_1.has)(defaultContext, 'eventType') &&
                defaultContext.eventType !== undefined &&
                defaultContext.eventType.match(/firebase.database/)) {
                defaultContext.authType = 'UNAUTHENTICATED';
                defaultContext.auth = null;
            }
            context = (0, lodash_1.merge)({}, defaultContext, _options);
        }
        return cloudFunction.run(data, context);
    };
    return wrapped;
}
exports.wrapV1 = wrapV1;
/** @internal */
function _makeResourceName(triggerResource, params = {}) {
    const resource = (0, helpers_1.resolveStringExpression)(triggerResource);
    const wildcardRegex = new RegExp('{[^/{}]*}', 'g');
    let resourceName = resource.replace(wildcardRegex, (wildcard) => {
        let wildcardNoBraces = wildcard.slice(1, -1); // .slice removes '{' and '}' from wildcard
        let sub = (0, lodash_1.get)(params, wildcardNoBraces);
        return sub || wildcardNoBraces + (0, lodash_1.random)(1, 9);
    });
    return resourceName;
}
exports._makeResourceName = _makeResourceName;
function _makeEventId() {
    return (Math.random()
        .toString(36)
        .substring(2, 15) +
        Math.random()
            .toString(36)
            .substring(2, 15));
}
function _checkOptionValidity(validFields, options) {
    Object.keys(options).forEach((key) => {
        if (validFields.indexOf(key) === -1) {
            throw new Error(`Options object ${JSON.stringify(options)} has invalid key "${key}"`);
        }
    });
}
function _makeDefaultContext(cloudFunction, options, triggerData) {
    var _a;
    let eventContextOptions = options;
    const eventType = (0, helpers_1.getEventType)(cloudFunction);
    const eventResource = (0, helpers_1.getEventFilters)(cloudFunction).resource;
    const optionsParams = (_a = eventContextOptions.params) !== null && _a !== void 0 ? _a : {};
    let triggerParams = {};
    if (eventResource && eventType && triggerData) {
        if (eventType.startsWith('google.firebase.database.ref.')) {
            let data;
            if (eventType.endsWith('.write')) {
                // Triggered with change
                if (!(triggerData instanceof v1_1.Change)) {
                    throw new Error('Must be triggered by database change');
                }
                data = triggerData.before;
            }
            else {
                data = triggerData;
            }
            triggerParams = _extractDatabaseParams(eventResource, data);
        }
        else if (eventType.startsWith('google.firestore.document.')) {
            let data;
            if (eventType.endsWith('.write')) {
                // Triggered with change
                if (!(triggerData instanceof v1_1.Change)) {
                    throw new Error('Must be triggered by firestore document change');
                }
                data = triggerData.before;
            }
            else {
                data = triggerData;
            }
            triggerParams = _extractFirestoreDocumentParams(eventResource, data);
        }
    }
    const params = Object.assign(Object.assign({}, triggerParams), optionsParams);
    const defaultContext = {
        eventId: _makeEventId(),
        resource: eventResource && {
            service: serviceFromEventType(eventType),
            name: _makeResourceName(eventResource, params),
        },
        eventType,
        timestamp: new Date().toISOString(),
        params,
    };
    return defaultContext;
}
function _extractDatabaseParams(triggerResource, data) {
    const resource = (0, helpers_1.resolveStringExpression)(triggerResource);
    const path = data.ref.toString().replace(data.ref.root.toString(), '');
    return _extractParams(resource, path);
}
function _extractFirestoreDocumentParams(triggerResource, data) {
    const resource = (0, helpers_1.resolveStringExpression)(triggerResource);
    // Resource format: databases/(default)/documents/<path>
    return _extractParams(resource.replace(/^databases\/[^\/]+\/documents\//, ''), data.ref.path);
}
/**
 * Extracts the `{wildcard}` values from `dataPath`.
 * E.g. A wildcard path of `users/{userId}` with `users/FOO` would result in `{ userId: 'FOO' }`.
 * @internal
 */
function _extractParams(wildcardTriggerPath, dataPath) {
    // Trim start and end / and split into path components
    const wildcardPaths = wildcardTriggerPath
        .replace(/^\/?(.*?)\/?$/, '$1')
        .split('/');
    const dataPaths = dataPath.replace(/^\/?(.*?)\/?$/, '$1').split('/');
    const params = {};
    if (wildcardPaths.length === dataPaths.length) {
        for (let idx = 0; idx < wildcardPaths.length; idx++) {
            const wildcardPath = wildcardPaths[idx];
            const name = wildcardPath.replace(/^{([^/{}]*)}$/, '$1');
            if (name !== wildcardPath) {
                // Wildcard parameter
                params[name] = dataPaths[idx];
            }
        }
    }
    return params;
}
exports._extractParams = _extractParams;
function serviceFromEventType(eventType) {
    if (eventType) {
        const providerToService = [
            ['google.analytics', 'app-measurement.com'],
            ['google.firebase.auth', 'firebaseauth.googleapis.com'],
            ['google.firebase.database', 'firebaseio.com'],
            ['google.firestore', 'firestore.googleapis.com'],
            ['google.pubsub', 'pubsub.googleapis.com'],
            ['google.firebase.remoteconfig', 'firebaseremoteconfig.googleapis.com'],
            ['google.storage', 'storage.googleapis.com'],
            ['google.testing', 'testing.googleapis.com'],
        ];
        const match = providerToService.find(([provider]) => {
            eventType.includes(provider);
        });
        if (match) {
            return match[1];
        }
    }
    return 'unknown-service.googleapis.com';
}
/** Make a Change object to be used as test data for Firestore and real time database onWrite and onUpdate functions. */
function makeChange(before, after) {
    return v1_1.Change.fromObjects(before, after);
}
exports.makeChange = makeChange;
/** Mock values returned by `functions.config()`. */
function mockConfig(conf) {
    if (v1_1.resetCache) {
        (0, v1_1.resetCache)();
    }
    process.env.CLOUD_RUNTIME_CONFIG = JSON.stringify(conf);
}
exports.mockConfig = mockConfig;
