import { getDatabase } from "../database/connection.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import config from "../config/environment.js";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export class UserModel {
  static async create(userData: CreateUserData): Promise<UserResponse> {
    const db = await getDatabase();
    const id = uuidv4();
    // Use configured bcrypt rounds (minimum 12 for security)
    const saltRounds = Math.max(config.bcryptRounds, 12);
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    await db.run(
      `INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`,
      [id, userData.name, userData.email, hashedPassword],
    );

    const user = await db.get<User>(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user) {
      throw new Error("Failed to create user");
    }

    return this.toResponse(user);
  }

  static async findByEmail(email: string): Promise<User | undefined> {
    const db = await getDatabase();
    return await db.get<User>(`SELECT * FROM users WHERE email = ?`, [email]);
  }

  static async findById(id: string): Promise<UserResponse | undefined> {
    const db = await getDatabase();
    const user = await db.get<User>(`SELECT * FROM users WHERE id = ?`, [id]);
    return user ? this.toResponse(user) : undefined;
  }

  static async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static toResponse(user: User): UserResponse {
    const { password, ...userResponse } = user;
    return userResponse;
  }
}
