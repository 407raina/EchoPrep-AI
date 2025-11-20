import { randomUUID } from "crypto";
import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../db/pool";
import { env } from "../utils/env";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6).max(128),
});

const buildToken = (user: { id: string; email: string }) =>
  jwt.sign(
    {
      email: user.email,
    },
    env.jwtSecret!,
    {
      subject: user.id,
      expiresIn: "7d",
    }
  );

/**
 * Set httpOnly cookie with access token
 */
const setAuthCookie = (res: Response, token: string) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
};

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);

    const existing = await query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existing.rowCount && existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    await query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, $3)`,
      [userId, email.toLowerCase(), passwordHash]
    );

    const token = buildToken({ id: userId, email: email.toLowerCase() });
    
    // Set httpOnly cookie
    setAuthCookie(res, token);

    return res.status(201).json({
      token, // Also return token for backward compatibility
      user: { id: userId, email: email.toLowerCase() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).join(", ");
      return res.status(400).json({ error: `Validation error: ${message}` });
    }
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);

    const userResult = await query<{ id: string; email: string; password_hash: string }>(
      `SELECT id, email, password_hash FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!userResult.rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = buildToken({ id: user.id, email: user.email });
    
    // Set httpOnly cookie
    setAuthCookie(res, token);

    return res.json({
      token, // Also return token for backward compatibility
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).join(", ");
      return res.status(400).json({ error: `Validation error: ${message}` });
    }
    return next(error);
  }
});

router.post("/logout", (_req, res) => {
  // Clear the httpOnly cookie
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return res.json({ success: true });
});

// Session validation endpoint
router.get("/check", requireAuth, async (req: AuthenticatedRequest, res) => {
  return res.json({ 
    authenticated: true,
    user: req.user 
  });
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

export default router;
