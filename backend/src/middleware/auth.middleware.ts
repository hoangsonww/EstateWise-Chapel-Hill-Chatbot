import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * Custom request interface that extends the Express Request object
 * to include user information.
 */
export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware to authenticate user based on JWT token.
 * It checks for the token in cookies or authorization headers.
 * If valid, it attaches the user information to the request object.
 *
 * @param req - The request object
 * @param res - The response object
 * @param next - The next middleware function
 */
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Hard authentication gate. Use after `authMiddleware` on routes that must
 * not be reachable anonymously. `authMiddleware` is permissive and only
 * decodes when a token is present, so endpoints that require a logged-in
 * user need this second step.
 */
export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};
