import { adminDb, adminAuth } from "../config/firebase-admin.js";

export interface User {
  id: string;
  name: string;
  email: string;
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

const usersCollection = () => adminDb.collection("users");

export class UserModel {
  /**
   * Create a new user in Firebase Auth + Firestore profile document.
   * The Firebase Auth uid is used as the Firestore document ID so that
   * security rules can be applied easily.
   */
  static async create(userData: CreateUserData): Promise<UserResponse> {
    // Create the Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
    });

    const now = new Date().toISOString();

    const profile: User = {
      id: userRecord.uid,
      name: userData.name,
      email: userData.email,
      created_at: now,
      updated_at: now,
    };

    // Store profile in Firestore
    await usersCollection().doc(userRecord.uid).set(profile);

    return this.toResponse(profile);
  }

  static async findByEmail(email: string): Promise<User | undefined> {
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      const doc = await usersCollection().doc(userRecord.uid).get();
      if (!doc.exists) return undefined;
      return doc.data() as User;
    } catch {
      return undefined;
    }
  }

  static async findById(id: string): Promise<UserResponse | undefined> {
    const doc = await usersCollection().doc(id).get();
    if (!doc.exists) return undefined;
    return this.toResponse(doc.data() as User);
  }

  static toResponse(user: User): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
