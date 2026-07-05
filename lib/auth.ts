import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, emailOTP } from "better-auth/plugins";

import * as authSchema from "@/auth-schema";
import { db } from "@/lib/db";
import { ac, admin, citizen, moderator } from "@/lib/permissions";

const isProductionRuntime = process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const socialProviders = googleClientId && googleClientSecret
  ? {
      google: {
        prompt: "select_account" as const,
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    }
  : {};
const bootstrapAdminEmails = new Set(
  [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .flatMap((value) => value?.split(",") ?? [])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

function resolveBootstrapRole(email: string | null | undefined) {
  if (!email) {
    return "citizen";
  }

  return bootstrapAdminEmails.has(email.toLowerCase()) ? "admin" : "citizen";
}

if (isProductionRuntime && !process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET must be set in production.");
}

if (isProductionRuntime && !process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL must be set in production.");
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "infra-watch-development-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          return {
            data: {
              ...user,
              role: resolveBootstrapRole(user.email),
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
  },
  socialProviders,

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    process.env.BETTER_AUTH_URL,
  ].filter(Boolean) as string[],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "citizen",
        input: false,
      },
      region: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      banned: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      banReason: {
        type: "string",
        required: false,
        input: false,
      },
      banExpires: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    adminPlugin({
      adminRoles: ["admin", "moderator"],
      defaultRole: "citizen",
      ac,
      roles: {
        admin,
        moderator,
        citizen,
      },
    }),
    emailOTP({
      overrideDefaultEmailVerification: false,
      otpLength: 6,
      expiresIn: Number(process.env.EMAIL_OTP_EXPIRY ?? 180),
      sendVerificationOnSignUp: true,
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[INFRA Watch OTP] ${type} code for ${email}: ${otp}`);
        }
      },
    }),
    nextCookies(),
  ],
});