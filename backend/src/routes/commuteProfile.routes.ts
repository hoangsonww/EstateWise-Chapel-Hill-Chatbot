import { Router } from "express";
import {
  createCommuteProfile,
  getCommuteProfiles,
  getCommuteProfile,
  updateCommuteProfile,
  deleteCommuteProfile,
} from "../controllers/commuteProfile.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/commute-profiles:
 *   post:
 *     summary: Create a new commute profile
 *     tags: [Commute Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Commute profile data
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - destinations
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the commute profile
 *                 example: "Daily Work Commute"
 *               destinations:
 *                 type: array
 *                 description: List of commute destinations (1-3 allowed)
 *                 minItems: 1
 *                 maxItems: 3
 *                 items:
 *                   type: object
 *                   required:
 *                     - label
 *                     - lat
 *                     - lng
 *                     - mode
 *                     - window
 *                   properties:
 *                     label:
 *                       type: string
 *                       description: A descriptive label for this destination
 *                       example: "Work Office"
 *                     lat:
 *                       type: number
 *                       description: Latitude coordinate
 *                       minimum: -90
 *                       maximum: 90
 *                       example: 35.9132
 *                     lng:
 *                       type: number
 *                       description: Longitude coordinate
 *                       minimum: -180
 *                       maximum: 180
 *                       example: -79.0558
 *                     mode:
 *                       type: string
 *                       enum: [drive, transit, bike, walk]
 *                       description: Preferred transportation mode
 *                       example: "drive"
 *                     window:
 *                       type: string
 *                       pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                       description: Time window in HH:MM-HH:MM format
 *                       example: "08:00-09:30"
 *                     maxMinutes:
 *                       type: number
 *                       description: Maximum commute time in minutes (overrides global if set)
 *                       minimum: 1
 *                       maximum: 180
 *                       example: 45
 *               maxMinutes:
 *                 type: number
 *                 description: Global maximum commute time in minutes
 *                 minimum: 1
 *                 maximum: 180
 *                 example: 60
 *               combine:
 *                 type: string
 *                 enum: [intersect, union]
 *                 description: How to combine results from multiple destinations
 *                 default: intersect
 *                 example: "intersect"
 *           examples:
 *             singleDestination:
 *               summary: Single destination profile
 *               value:
 *                 name: "Work Commute"
 *                 destinations:
 *                   - label: "Office"
 *                     lat: 35.9132
 *                     lng: -79.0558
 *                     mode: "drive"
 *                     window: "08:00-09:30"
 *                     maxMinutes: 45
 *                 maxMinutes: 60
 *                 combine: "intersect"
 *             multipleDestinations:
 *               summary: Multiple destinations profile
 *               value:
 *                 name: "Work and Gym"
 *                 destinations:
 *                   - label: "Office"
 *                     lat: 35.9132
 *                     lng: -79.0558
 *                     mode: "drive"
 *                     window: "08:00-09:30"
 *                   - label: "Gym"
 *                     lat: 35.9050
 *                     lng: -79.0470
 *                     mode: "bike"
 *                     window: "17:30-19:00"
 *                     maxMinutes: 20
 *                 maxMinutes: 45
 *                 combine: "union"
 *     responses:
 *       201:
 *         description: Commute profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commute profile created successfully"
 *                 profile:
 *                   $ref: "#/components/schemas/CommuteProfile"
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Profile name is required", "At least one destination is required"]
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Profile name already exists
 *       500:
 *         description: Server error
 */
router.post("/", createCommuteProfile);

/**
 * @swagger
 * /api/commute-profiles:
 *   get:
 *     summary: Get all commute profiles for the authenticated user
 *     tags: [Commute Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Commute profiles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commute profiles retrieved successfully"
 *                 profiles:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/CommuteProfile"
 *                 count:
 *                   type: number
 *                   description: Number of profiles returned
 *                   example: 2
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/", getCommuteProfiles);

/**
 * @swagger
 * /api/commute-profiles/{id}:
 *   get:
 *     summary: Get a specific commute profile by ID
 *     tags: [Commute Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The commute profile ID
 *         schema:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: Commute profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commute profile retrieved successfully"
 *                 profile:
 *                   $ref: "#/components/schemas/CommuteProfile"
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Commute profile not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getCommuteProfile);

/**
 * @swagger
 * /api/commute-profiles/{id}:
 *   put:
 *     summary: Update a commute profile
 *     tags: [Commute Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The commute profile ID
 *         schema:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *     requestBody:
 *       required: true
 *       description: Updated commute profile data (all fields optional)
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the commute profile
 *                 example: "Updated Work Commute"
 *               destinations:
 *                 type: array
 *                 description: List of commute destinations (1-3 allowed)
 *                 minItems: 1
 *                 maxItems: 3
 *                 items:
 *                   $ref: "#/components/schemas/CommuteDestination"
 *               maxMinutes:
 *                 type: number
 *                 description: Global maximum commute time in minutes
 *                 minimum: 1
 *                 maximum: 180
 *                 example: 60
 *               combine:
 *                 type: string
 *                 enum: [intersect, union]
 *                 description: How to combine results from multiple destinations
 *                 example: "union"
 *           examples:
 *             updateName:
 *               summary: Update profile name
 *               value:
 *                 name: "Updated Work Commute"
 *             updateDestinations:
 *               summary: Update destinations
 *               value:
 *                 destinations:
 *                   - label: "New Office"
 *                     lat: 35.9200
 *                     lng: -79.0600
 *                     mode: "transit"
 *                     window: "08:30-10:00"
 *             updateCombineMethod:
 *               summary: Update combine method
 *               value:
 *                 combine: "union"
 *     responses:
 *       200:
 *         description: Commute profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commute profile updated successfully"
 *                 profile:
 *                   $ref: "#/components/schemas/CommuteProfile"
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Commute profile not found
 *       409:
 *         description: Profile name already exists
 *       500:
 *         description: Server error
 */
router.put("/:id", updateCommuteProfile);

/**
 * @swagger
 * /api/commute-profiles/{id}:
 *   delete:
 *     summary: Delete a commute profile
 *     tags: [Commute Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The commute profile ID
 *         schema:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: Commute profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commute profile deleted successfully"
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Commute profile not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", deleteCommuteProfile);

export default router;