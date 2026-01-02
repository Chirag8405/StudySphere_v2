#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import crypto from "crypto";

interface SecurityCheck {
  name: string;
  description: string;
  check: () => boolean | Promise<boolean>;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  fix?: string;
}

class SecurityValidator {
  private checks: SecurityCheck[] = [];
  private results: Array<{
    check: SecurityCheck;
    passed: boolean;
    error?: string;
  }> = [];

  constructor() {
    this.initializeChecks();
  }

  private initializeChecks() {
    this.checks = [
      // Environment Security
      {
        name: "JWT_SECRET_STRENGTH",
        description: "JWT secret is cryptographically strong",
        severity: "CRITICAL",
        check: () => {
          const secret = process.env.JWT_SECRET;
          if (!secret) return false;
          return secret.length >= 64 && !/^[a-zA-Z0-9]+$/.test(secret);
        },
        fix: "Generate a strong JWT secret: openssl rand -hex 64",
      },

      {
        name: "NODE_ENV_PRODUCTION",
        description: "NODE_ENV is set to production",
        severity: "HIGH",
        check: () => process.env.NODE_ENV === "production",
      },

      {
        name: "CORS_CONFIGURATION",
        description: "CORS origins are properly configured",
        severity: "HIGH",
        check: () => {
          const origins = process.env.CORS_ORIGINS;
          return (
            !!origins && !origins.includes("*") && origins.includes("https://")
          );
        },
        fix: "Set CORS_ORIGINS to specific HTTPS domains only",
      },

      {
        name: "BCRYPT_ROUNDS",
        description: "Bcrypt rounds are sufficient",
        severity: "MEDIUM",
        check: () => {
          const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
          return rounds >= 12;
        },
        fix: "Set BCRYPT_ROUNDS to at least 12",
      },

      // File Security
      {
        name: "DATABASE_PERMISSIONS",
        description: "Database file has secure permissions",
        severity: "HIGH",
        check: async () => {
          try {
            const dbPath = process.env.DATABASE_PATH || "./studysphere.db";
            if (!fs.existsSync(dbPath)) return true; // File doesn't exist yet

            const stats = fs.statSync(dbPath);
            const mode = stats.mode & parseInt("777", 8);
            return mode <= parseInt("600", 8); // Owner read/write only
          } catch {
            return false;
          }
        },
        fix: "chmod 600 /path/to/studysphere.db",
      },

      {
        name: "ENV_FILE_SECURITY",
        description: ".env files are not in public directory",
        severity: "CRITICAL",
        check: () => {
          const publicPaths = ["public", "dist", "build"];
          return !publicPaths.some(
            (dir) =>
              fs.existsSync(path.join(dir, ".env")) ||
              fs.existsSync(path.join(dir, ".env.production")),
          );
        },
        fix: "Move .env files outside public directories",
      },

      // Code Security
      {
        name: "CONSOLE_LOGS_REMOVED",
        description: "No console.log statements in production code",
        severity: "LOW",
        check: () => {
          const serverFiles = this.getJSFiles("server");
          for (const file of serverFiles) {
            const content = fs.readFileSync(file, "utf8");
            if (
              content.includes("console.log") &&
              !content.includes("// Production logging")
            ) {
              return false;
            }
          }
          return true;
        },
        fix: "Remove console.log statements or use proper logging",
      },

      {
        name: "HARDCODED_SECRETS",
        description: "No hardcoded secrets in code",
        severity: "CRITICAL",
        check: () => {
          const allFiles = [
            ...this.getJSFiles("server"),
            ...this.getJSFiles("client"),
          ];

          const secretPatterns = [
            /password\s*=\s*["'][^"']+["']/i,
            /secret\s*=\s*["'][^"']+["']/i,
            /key\s*=\s*["'][^"']+["']/i,
            /token\s*=\s*["'][^"']+["']/i,
          ];

          for (const file of allFiles) {
            const content = fs.readFileSync(file, "utf8");
            for (const pattern of secretPatterns) {
              if (pattern.test(content) && !content.includes("process.env")) {
                return false;
              }
            }
          }
          return true;
        },
        fix: "Use environment variables for all secrets",
      },

      // Security Headers
      {
        name: "SECURITY_HEADERS_CONFIGURED",
        description: "Security headers middleware is configured",
        severity: "HIGH",
        check: () => {
          const serverIndex = path.join("server", "index.ts");
          if (!fs.existsSync(serverIndex)) return false;

          const content = fs.readFileSync(serverIndex, "utf8");
          return (
            content.includes("securityHeaders") || content.includes("helmet")
          );
        },
        fix: "Configure helmet middleware for security headers",
      },

      // Rate Limiting
      {
        name: "RATE_LIMITING_ENABLED",
        description: "Rate limiting is configured",
        severity: "HIGH",
        check: () => {
          const serverIndex = path.join("server", "index.ts");
          if (!fs.existsSync(serverIndex)) return false;

          const content = fs.readFileSync(serverIndex, "utf8");
          return (
            content.includes("rateLimit") ||
            content.includes("express-rate-limit")
          );
        },
        fix: "Configure express-rate-limit middleware",
      },

      // Input Validation
      {
        name: "INPUT_VALIDATION_CONFIGURED",
        description: "Input validation middleware is configured",
        severity: "HIGH",
        check: () => {
          const securityFile = path.join("server", "middleware", "security.ts");
          return fs.existsSync(securityFile);
        },
        fix: "Implement input validation middleware",
      },

      // Build Security
      {
        name: "PRODUCTION_BUILD_OPTIMIZED",
        description: "Production build is optimized and minified",
        severity: "MEDIUM",
        check: () => {
          const distPath = path.join("dist", "spa");
          if (!fs.existsSync(distPath)) return true; // Build doesn't exist yet

          const jsFiles = fs
            .readdirSync(distPath)
            .filter((f) => f.endsWith(".js"));
          if (jsFiles.length === 0) return true;

          const sampleFile = path.join(distPath, jsFiles[0]);
          const content = fs.readFileSync(sampleFile, "utf8");
          return content.length < 1000 || !content.includes("\n"); // Minified
        },
        fix: "Ensure production build is minified",
      },
    ];
  }

  private getJSFiles(directory: string): string[] {
    if (!fs.existsSync(directory)) return [];

    const files: string[] = [];
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getJSFiles(fullPath));
      } else if (item.endsWith(".js") || item.endsWith(".ts")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  async runChecks(): Promise<void> {
    console.log("🔒 Running StudySphere Security Validation\n");

    let passed = 0;
    let failed = 0;
    let critical = 0;
    let high = 0;

    for (const check of this.checks) {
      try {
        console.log(`⏳ ${check.name}: ${check.description}`);

        const result = await check.check();

        if (result) {
          console.log(`✅ PASS: ${check.name}\n`);
          this.results.push({ check, passed: true });
          passed++;
        } else {
          console.log(`❌ FAIL: ${check.name} [${check.severity}]`);
          if (check.fix) {
            console.log(`   Fix: ${check.fix}`);
          }
          console.log("");

          this.results.push({ check, passed: false });
          failed++;

          if (check.severity === "CRITICAL") critical++;
          if (check.severity === "HIGH") high++;
        }
      } catch (error) {
        console.log(`💥 ERROR: ${check.name} - ${error}`);
        this.results.push({ check, passed: false, error: String(error) });
        failed++;
      }
    }

    this.printSummary(passed, failed, critical, high);
  }

  private printSummary(
    passed: number,
    failed: number,
    critical: number,
    high: number,
  ): void {
    console.log("=".repeat(60));
    console.log("📊 SECURITY CHECK SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚨 Critical Issues: ${critical}`);
    console.log(`⚠️  High Priority Issues: ${high}`);
    console.log("");

    if (critical > 0) {
      console.log("🚨 CRITICAL SECURITY ISSUES FOUND!");
      console.log("These must be fixed before production deployment.");
      process.exit(1);
    } else if (high > 0) {
      console.log("⚠️  HIGH PRIORITY SECURITY ISSUES FOUND!");
      console.log("These should be addressed before production deployment.");
      process.exit(1);
    } else if (failed > 0) {
      console.log("⚠️  Some security checks failed, but no critical issues.");
      console.log("Review and address as needed.");
    } else {
      console.log("🎉 ALL SECURITY CHECKS PASSED!");
      console.log("Your application is ready for secure deployment.");
    }
  }

  generateReport(): string {
    const timestamp = new Date().toISOString();
    let report = `StudySphere Security Report - ${timestamp}\n`;
    report += "=".repeat(60) + "\n\n";

    for (const result of this.results) {
      const status = result.passed ? "PASS" : "FAIL";
      const severity = result.passed ? "" : ` [${result.check.severity}]`;

      report += `${status}: ${result.check.name}${severity}\n`;
      report += `Description: ${result.check.description}\n`;

      if (!result.passed && result.check.fix) {
        report += `Fix: ${result.check.fix}\n`;
      }

      if (result.error) {
        report += `Error: ${result.error}\n`;
      }

      report += "\n";
    }

    return report;
  }
}

// Run security validation
async function main() {
  const validator = new SecurityValidator();
  await validator.runChecks();

  // Generate report file
  const report = validator.generateReport();
  fs.writeFileSync("security-report.txt", report);
  console.log("\n📄 Detailed report saved to: security-report.txt");
}

// Check if this is the main module using import.meta.url
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main().catch(console.error);
}

export default SecurityValidator;
