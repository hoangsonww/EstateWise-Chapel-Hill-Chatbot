"use strict";
// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
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
exports.onCallGenkit = exports.onCall = exports.onRequest = exports.hasClaim = exports.isSignedIn = exports.HttpsError = void 0;
/**
 * Cloud functions to handle HTTPS request or callable RPCs.
 * @packageDocumentation
 */
const cors = require("cors");
const encoding_1 = require("../../common/encoding");
const trace_1 = require("../trace");
const debug_1 = require("../../common/debug");
const https_1 = require("../../common/providers/https");
Object.defineProperty(exports, "HttpsError", { enumerable: true, get: function () { return https_1.HttpsError; } });
const manifest_1 = require("../../runtime/manifest");
const options = require("../options");
const onInit_1 = require("../../common/onInit");
const logger = require("../../logger");
/**
 * @deprecated
 *
 * An auth policy that requires a user to be signed in.
 */
const isSignedIn = () => (auth) => !!auth;
exports.isSignedIn = isSignedIn;
/**
 * @deprecated
 *
 * An auth policy that requires a user to be both signed in and have a specific claim (optionally with a specific value)
 */
const hasClaim = (claim, value) => (auth) => {
    if (!auth) {
        return false;
    }
    if (!(claim in auth.token)) {
        return false;
    }
    return !value || auth.token[claim] === value;
};
exports.hasClaim = hasClaim;
function onRequest(optsOrHandler, handler) {
    let opts;
    if (arguments.length === 1) {
        opts = {};
        handler = optsOrHandler;
    }
    else {
        opts = optsOrHandler;
    }
    if ((0, debug_1.isDebugFeatureEnabled)("enableCors") || "cors" in opts) {
        let origin = opts.cors;
        if ((0, debug_1.isDebugFeatureEnabled)("enableCors")) {
            // Respect `cors: false` to turn off cors even if debug feature is enabled.
            origin = opts.cors === false ? false : true;
        }
        // Arrays cause the access-control-allow-origin header to be dynamic based
        // on the origin header of the request. If there is only one element in the
        // array, this is unnecessary.
        if (Array.isArray(origin) && origin.length === 1) {
            origin = origin[0];
        }
        const middleware = cors({ origin });
        const userProvidedHandler = handler;
        handler = (req, res) => {
            return new Promise((resolve) => {
                res.on("finish", resolve);
                middleware(req, res, () => {
                    resolve(userProvidedHandler(req, res));
                });
            });
        };
    }
    handler = (0, trace_1.wrapTraceContext)((0, onInit_1.withInit)(handler));
    Object.defineProperty(handler, "__trigger", {
        get: () => {
            const baseOpts = options.optionsToTriggerAnnotations(options.getGlobalOptions());
            // global options calls region a scalar and https allows it to be an array,
            // but optionsToTriggerAnnotations handles both cases.
            const specificOpts = options.optionsToTriggerAnnotations(opts);
            const trigger = {
                platform: "gcfv2",
                ...baseOpts,
                ...specificOpts,
                labels: {
                    ...baseOpts === null || baseOpts === void 0 ? void 0 : baseOpts.labels,
                    ...specificOpts === null || specificOpts === void 0 ? void 0 : specificOpts.labels,
                },
                httpsTrigger: {
                    allowInsecure: false,
                },
            };
            (0, encoding_1.convertIfPresent)(trigger.httpsTrigger, options.getGlobalOptions(), "invoker", "invoker", encoding_1.convertInvoker);
            (0, encoding_1.convertIfPresent)(trigger.httpsTrigger, opts, "invoker", "invoker", encoding_1.convertInvoker);
            return trigger;
        },
    });
    const globalOpts = options.getGlobalOptions();
    const baseOpts = options.optionsToEndpoint(globalOpts);
    // global options calls region a scalar and https allows it to be an array,
    // but optionsToTriggerAnnotations handles both cases.
    const specificOpts = options.optionsToEndpoint(opts);
    const endpoint = {
        ...(0, manifest_1.initV2Endpoint)(globalOpts, opts),
        platform: "gcfv2",
        ...baseOpts,
        ...specificOpts,
        labels: {
            ...baseOpts === null || baseOpts === void 0 ? void 0 : baseOpts.labels,
            ...specificOpts === null || specificOpts === void 0 ? void 0 : specificOpts.labels,
        },
        httpsTrigger: {},
    };
    (0, encoding_1.convertIfPresent)(endpoint.httpsTrigger, globalOpts, "invoker", "invoker", encoding_1.convertInvoker);
    (0, encoding_1.convertIfPresent)(endpoint.httpsTrigger, opts, "invoker", "invoker", encoding_1.convertInvoker);
    handler.__endpoint = endpoint;
    return handler;
}
exports.onRequest = onRequest;
function onCall(optsOrHandler, handler) {
    var _a;
    let opts;
    if (arguments.length === 1) {
        opts = {};
        handler = optsOrHandler;
    }
    else {
        opts = optsOrHandler;
    }
    let origin = (0, debug_1.isDebugFeatureEnabled)("enableCors") ? true : "cors" in opts ? opts.cors : true;
    // Arrays cause the access-control-allow-origin header to be dynamic based
    // on the origin header of the request. If there is only one element in the
    // array, this is unnecessary.
    if (Array.isArray(origin) && origin.length === 1) {
        origin = origin[0];
    }
    // fix the length of handler to make the call to handler consistent
    const fixedLen = (req, resp) => handler(req, resp);
    let func = (0, https_1.onCallHandler)({
        cors: { origin, methods: "POST" },
        enforceAppCheck: (_a = opts.enforceAppCheck) !== null && _a !== void 0 ? _a : options.getGlobalOptions().enforceAppCheck,
        consumeAppCheckToken: opts.consumeAppCheckToken,
        heartbeatSeconds: opts.heartbeatSeconds,
        authPolicy: opts.authPolicy,
    }, fixedLen, "gcfv2");
    func = (0, trace_1.wrapTraceContext)((0, onInit_1.withInit)(func));
    Object.defineProperty(func, "__trigger", {
        get: () => {
            const baseOpts = options.optionsToTriggerAnnotations(options.getGlobalOptions());
            // global options calls region a scalar and https allows it to be an array,
            // but optionsToTriggerAnnotations handles both cases.
            const specificOpts = options.optionsToTriggerAnnotations(opts);
            return {
                platform: "gcfv2",
                ...baseOpts,
                ...specificOpts,
                labels: {
                    ...baseOpts === null || baseOpts === void 0 ? void 0 : baseOpts.labels,
                    ...specificOpts === null || specificOpts === void 0 ? void 0 : specificOpts.labels,
                    "deployment-callable": "true",
                },
                httpsTrigger: {
                    allowInsecure: false,
                },
            };
        },
    });
    const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
    // global options calls region a scalar and https allows it to be an array,
    // but optionsToEndpoint handles both cases.
    const specificOpts = options.optionsToEndpoint(opts);
    func.__endpoint = {
        ...(0, manifest_1.initV2Endpoint)(options.getGlobalOptions(), opts),
        platform: "gcfv2",
        ...baseOpts,
        ...specificOpts,
        labels: {
            ...baseOpts === null || baseOpts === void 0 ? void 0 : baseOpts.labels,
            ...specificOpts === null || specificOpts === void 0 ? void 0 : specificOpts.labels,
        },
        callableTrigger: {},
    };
    // TODO: in the next major version, do auth/appcheck in these helper methods too.
    func.run = (0, onInit_1.withInit)(handler);
    func.stream = () => {
        return {
            stream: {
                next() {
                    return Promise.reject("Coming soon");
                },
            },
            output: Promise.reject("Coming soon"),
        };
    };
    return func;
}
exports.onCall = onCall;
function onCallGenkit(optsOrAction, action) {
    var _a;
    let opts;
    if (arguments.length === 2) {
        opts = optsOrAction;
    }
    else {
        opts = {};
        action = optsOrAction;
    }
    if (!((_a = opts.secrets) === null || _a === void 0 ? void 0 : _a.length)) {
        logger.debug(`Genkit function for ${action.__action.name} is not bound to any secret. This may mean that you are not storing API keys as a secret or that you are not binding your secret to this function. See https://firebase.google.com/docs/functions/config-env?gen=2nd#secret_parameters for more information.`);
    }
    const cloudFunction = onCall(opts, async (req, res) => {
        const context = {};
        (0, encoding_1.copyIfPresent)(context, req, "auth", "app", "instanceIdToken");
        if (!req.acceptsStreaming) {
            const { result } = await action.run(req.data, { context });
            return result;
        }
        const { stream, output } = action.stream(req.data, { context });
        for await (const chunk of stream) {
            await res.sendChunk(chunk);
        }
        return output;
    });
    cloudFunction.__endpoint.callableTrigger.genkitAction = action.__action.name;
    return cloudFunction;
}
exports.onCallGenkit = onCallGenkit;
