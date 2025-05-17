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
exports.wrap = exports.mockConfig = exports.makeChange = void 0;
const v1_1 = require("./v1");
const v2_1 = require("./v2");
// Re-exporting V1 (to reduce breakage)
var v1_2 = require("./v1");
Object.defineProperty(exports, "makeChange", { enumerable: true, get: function () { return v1_2.makeChange; } });
Object.defineProperty(exports, "mockConfig", { enumerable: true, get: function () { return v1_2.mockConfig; } });
function wrap(cloudFunction) {
    if (isV2CloudFunction(cloudFunction)) {
        return (0, v2_1.wrapV2)(cloudFunction);
    }
    return (0, v1_1.wrapV1)(cloudFunction);
}
exports.wrap = wrap;
/**
 * The key differences between V1 and V2 CloudFunctions are:
 * <ul>
 *    <li> V1 CloudFunction is sometimes a binary function
 *    <li> V2 CloudFunction is always a unary function
 *    <li> V1 CloudFunction.run is always a binary function
 *    <li> V2 CloudFunction.run is always a unary function
 * @return True iff the CloudFunction is a V2 function.
 */
function isV2CloudFunction(cloudFunction) {
    var _a;
    return cloudFunction.length === 1 && ((_a = cloudFunction === null || cloudFunction === void 0 ? void 0 : cloudFunction.run) === null || _a === void 0 ? void 0 : _a.length) === 1;
}
