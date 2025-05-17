"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const property_controller_1 = require("../controllers/property.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Search properties and generate chart specs
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Full‑text query to search similar properties
 *       - in: query
 *         name: topK
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Maximum number of properties to return
 *     responses:
 *       200:
 *         description: Matching properties plus 12 distinct Chart.js specs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 listings:
 *                   type: array
 *                   description: List of property objects
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       price:
 *                         type: number
 *                       bedrooms:
 *                         type: number
 *                       bathrooms:
 *                         type: number
 *                       livingArea:
 *                         type: number
 *                       yearBuilt:
 *                         type: number
 *                       homeType:
 *                         type: string
 *                       zipcode:
 *                         type: string
 *                 charts:
 *                   type: object
 *                   description: A map of 12 Chart.js specs
 *                   properties:
 *                     homeType:
 *                       type: object
 *                       description: Pie chart spec for home type distribution
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: pie
 *                         data:
 *                           type: object
 *                           properties:
 *                             labels:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             datasets:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   label:
 *                                     type: string
 *                                   data:
 *                                     type: array
 *                                     items:
 *                                       type: number
 *                         options:
 *                           type: object
 *                     bedrooms:
 *                       type: object
 *                       description: Bar chart spec for bedrooms distribution
 *                     bathrooms:
 *                       type: object
 *                       description: Bar chart spec for bathrooms distribution
 *                     priceDist:
 *                       type: object
 *                       description: Bar chart spec for price distribution
 *                     areaDist:
 *                       type: object
 *                       description: Bar chart spec for living area distribution
 *                     yearBuiltDist:
 *                       type: object
 *                       description: Bar chart spec for year built distribution
 *                     priceArea:
 *                       type: object
 *                       description: Scatter chart spec for price vs living area
 *                     priceYear:
 *                       type: object
 *                       description: Line chart spec for price over year built
 *                     pricePerSqft:
 *                       type: object
 *                       description: Bar chart spec for price per square foot
 *                     bedsBaths:
 *                       type: object
 *                       description: Bubble chart spec for bedrooms vs bathrooms
 *                     avgPriceType:
 *                       type: object
 *                       description: Bar chart spec for average price by home type
 *                     countByZip:
 *                       type: object
 *                       description: Bar chart spec for count by zipcode
 *       500:
 *         description: Server error - Failed to fetch property data.
 */
router.get("/", property_controller_1.getPropertyData);
exports.default = router;
