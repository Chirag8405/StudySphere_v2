import { Request, Response } from "express";
import { UserModel } from "../models/User.js";
import { generateToken, refreshToken as refreshJwtToken} from "../utils/jwt-secure.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export async function login(req: Request<{}, {}, LoginRequest>, res: Response) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(
      password,
      user.password,
    );
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Return user data and token
    const userResponse = UserModel.toResponse(user);
    res.json({
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function register(
  req: Request<{}, {}, RegisterRequest>,
  res: Response,
) {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long" });
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User with this email already exists" });
    }

    // Create new user
    const user = await UserModel.create({ name, email, password });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Return user data and token
    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    res.json({ user: req.user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function refreshTokenHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    // Expect the old token in the Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(400)
        .json({ error: "Refresh token must be provided in Authorization header" });
    }

    const oldToken = authHeader.substring(7);
    // Use your util to verify, revoke, and issue a new one:
    const newToken = refreshJwtToken(oldToken);

    return res.json({ token: newToken });
  } catch (error: any) {
    console.error("Refresh token error:", error.message ?? error);
    if (error.message === "Token expired" || error.message === "Invalid token") {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

