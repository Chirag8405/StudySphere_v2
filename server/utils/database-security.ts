import { Database } from "sqlite";
import crypto from "crypto";

export class DatabaseSecurity {
  // Sanitize input to prevent SQL injection
  static sanitizeInput(input: any): any {
    if (typeof input === "string") {
      // Remove or escape dangerous characters
      return input
        .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
          switch (char) {
            case "\0":
              return "\\0";
            case "\x08":
              return "\\b";
            case "\x09":
              return "\\t";
            case "\x1a":
              return "\\z";
            case "\n":
              return "\\n";
            case "\r":
              return "\\r";
            case '"':
            case "'":
            case "\\":
            case "%":
              return "\\" + char;
            default:
              return char;
          }
        })
        .trim();
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item));
    }

    if (typeof input === "object" && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  // Validate UUID format
  static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Generate secure UUID
  static generateSecureId(): string {
    return crypto.randomUUID();
  }

  // Validate and sanitize JSON data
  static sanitizeJsonField(jsonString: string | null): string | null {
    if (!jsonString) return null;

    try {
      // Parse to validate JSON structure
      const parsed = JSON.parse(jsonString);

      // Recursively sanitize the parsed object
      const sanitized = this.sanitizeInput(parsed);

      // Return stringified sanitized object
      return JSON.stringify(sanitized);
    } catch (error) {
      throw new Error("Invalid JSON data");
    }
  }

  // Prepare safe query parameters
  static prepareQueryParams(params: Record<string, any>): Record<string, any> {
    const prepared: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Validate parameter names (prevent parameter pollution)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid parameter name: ${key}`);
      }

      // Sanitize values based on type
      if (typeof value === "string") {
        prepared[key] = this.sanitizeInput(value);
      } else if (typeof value === "number") {
        // Validate numbers
        if (!Number.isFinite(value)) {
          throw new Error(`Invalid number value for ${key}`);
        }
        prepared[key] = value;
      } else if (typeof value === "boolean") {
        prepared[key] = value;
      } else if (value === null || value === undefined) {
        prepared[key] = null;
      } else {
        // For complex types, stringify and sanitize
        prepared[key] = this.sanitizeInput(JSON.stringify(value));
      }
    }

    return prepared;
  }

  // Execute query with enhanced security
  static async executeSecureQuery(
    db: Database,
    query: string,
    params: any[] = [],
  ): Promise<any> {
    try {
      // Log query for auditing (in production, use proper logging)
      if (process.env.NODE_ENV === "development") {
        console.log("Executing query:", query.substring(0, 100) + "...");
      }

      // Check for SQL injection patterns (but allow legitimate use cases)
      // Only flag queries with literal string values that should be parameterized
      const dangerousPatterns = [
        /'\s*(OR|AND)\s+.*=/i,  // ' OR 1=1, ' AND a=
        /;\s*(DROP|DELETE|UPDATE|INSERT)/i,  // SQL injection with multiple statements
        /UNION\s+(ALL\s+)?SELECT/i,  // UNION-based injection
        /--\s*$/m,  // SQL comment at end of line (injection marker)
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(query)) {
          console.error("Potentially unsafe query detected:", query.substring(0, 200));
          throw new Error("Potentially unsafe query detected");
        }
      }

      // Execute with timeout to prevent long-running queries
      const result = await Promise.race([
        db.all(query, params),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Query timeout")), 30000),
        ),
      ]);

      return result;
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error("Database operation failed");
    }
  }

  // Validate date inputs
  static validateDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Validate and sanitize schedule days
  static validateScheduleDays(days: string[]): string[] {
    const validDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    if (!Array.isArray(days)) {
      throw new Error("Schedule days must be an array");
    }

    if (days.length === 0 || days.length > 7) {
      throw new Error("Invalid number of schedule days");
    }

    const sanitizedDays = days.filter((day) => validDays.includes(day));

    if (sanitizedDays.length !== days.length) {
      throw new Error("Invalid schedule day(s) provided");
    }

    return sanitizedDays;
  }

  // Validate time format
  static validateTime(timeString: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  }

  // Database audit logging
  static async logDatabaseOperation(
    operation: string,
    table: string,
    userId: string,
    details?: any,
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      table,
      userId,
      details: details ? JSON.stringify(details) : null,
      ip: "unknown", // Should be passed from request context
    };

    // In production, send to secure logging service
    console.log("DB Audit:", logEntry);
  }

  // Prevent timing attacks on database lookups
  static async constantTimeCompare(
    queryPromise: Promise<any>,
    minimumTime: number = 100,
  ): Promise<any> {
    const startTime = Date.now();
    const result = await queryPromise;
    const elapsed = Date.now() - startTime;

    if (elapsed < minimumTime) {
      await new Promise((resolve) =>
        setTimeout(resolve, minimumTime - elapsed),
      );
    }

    return result;
  }

  // Validate pagination parameters
  static validatePagination(limit?: string, offset?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (parsedLimit < 1 || parsedLimit > 100) {
      throw new Error("Limit must be between 1 and 100");
    }

    if (parsedOffset < 0) {
      throw new Error("Offset must be non-negative");
    }

    return { limit: parsedLimit, offset: parsedOffset };
  }
}

export default DatabaseSecurity;
