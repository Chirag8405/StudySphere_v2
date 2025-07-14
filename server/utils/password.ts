import bcrypt from "bcryptjs";
import crypto from "crypto";
import config from "../config/environment.js";

interface PasswordStrengthResult {
  isStrong: boolean;
  score: number;
  suggestions: string[];
}

export class PasswordSecurity {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;

  // Enhanced password hashing with configurable rounds
  static async hashPassword(password: string): Promise<string> {
    // Validate password before hashing
    const validation = this.validatePassword(password);
    if (!validation.isStrong) {
      throw new Error(
        `Password too weak: ${validation.suggestions.join(", ")}`,
      );
    }

    // Use configured bcrypt rounds (minimum 12 for production)
    const saltRounds = Math.max(config.bcryptRounds, 12);
    return bcrypt.hash(password, saltRounds);
  }

  // Secure password comparison with timing attack protection
  static async comparePassword(
    plaintext: string,
    hash: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plaintext, hash);
    } catch (error) {
      // Log potential hash tampering attempts
      console.warn("Password comparison failed:", error);
      return false;
    }
  }

  // Comprehensive password strength validation
  static validatePassword(password: string): PasswordStrengthResult {
    const suggestions: string[] = [];
    let score = 0;

    // Length checks
    if (password.length < this.MIN_LENGTH) {
      suggestions.push(
        `Password must be at least ${this.MIN_LENGTH} characters`,
      );
      return { isStrong: false, score: 0, suggestions };
    }

    if (password.length > this.MAX_LENGTH) {
      suggestions.push(`Password cannot exceed ${this.MAX_LENGTH} characters`);
      return { isStrong: false, score: 0, suggestions };
    }

    // Character variety checks
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      password,
    );

    if (hasLowercase) score += 1;
    else suggestions.push("Add lowercase letters");

    if (hasUppercase) score += 1;
    else suggestions.push("Add uppercase letters");

    if (hasNumbers) score += 1;
    else suggestions.push("Add numbers");

    if (hasSpecialChars) score += 1;
    else suggestions.push("Add special characters");

    // Length bonus
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Check for common patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
      /login/i,
      /welcome/i,
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        suggestions.push("Avoid common passwords and patterns");
        score -= 2;
        break;
      }
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      suggestions.push("Avoid repeating characters");
      score -= 1;
    }

    // Check for sequential characters
    if (
      /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789)/i.test(
        password,
      )
    ) {
      suggestions.push("Avoid sequential characters");
      score -= 1;
    }

    const isStrong = score >= 4 && suggestions.length === 0;

    return {
      isStrong,
      score: Math.max(0, score),
      suggestions,
    };
  }

  // Generate secure random password
  static generateSecurePassword(length: number = 16): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    const allChars = lowercase + uppercase + numbers + special;
    let password = "";

    // Ensure at least one character from each category
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(special);

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars);
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => crypto.randomBytes(1)[0] - 128)
      .join("");
  }

  private static getRandomChar(charset: string): string {
    const randomIndex = crypto.randomInt(0, charset.length);
    return charset[randomIndex];
  }

  // Check if password needs rehashing (due to increased security requirements)
  static needsRehash(hash: string): boolean {
    try {
      const rounds = bcrypt.getRounds(hash);
      return rounds < config.bcryptRounds;
    } catch {
      // If we can't determine rounds, assume it needs rehashing
      return true;
    }
  }

  // Password breach check (implement with HaveIBeenPwned API in production)
  static async isPasswordBreached(password: string): Promise<boolean> {
    // This is a placeholder - in production, implement with k-anonymity
    // using SHA-1 prefix matching with HaveIBeenPwned API

    // For now, just check against a small list of most common passwords
    const commonPasswords = [
      "123456",
      "password",
      "123456789",
      "12345678",
      "12345",
      "111111",
      "1234567",
      "sunshine",
      "qwerty",
      "iloveyou",
      "admin",
      "welcome",
      "monkey",
      "login",
      "abc123",
      "starwars",
      "123123",
      "dragon",
      "passw0rd",
      "master",
    ];

    return commonPasswords.includes(password.toLowerCase());
  }
}

export default PasswordSecurity;
