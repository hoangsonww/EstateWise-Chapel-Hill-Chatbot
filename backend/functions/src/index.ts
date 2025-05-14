/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";

const app = express();

// Middleware
app.use(cors({ origin: true }));

// Example route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Export the app as a Firebase function
export const api = functions.https.onRequest(app);

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
