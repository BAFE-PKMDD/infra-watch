"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient } from "better-auth/client/plugins";

import { ac, admin, citizen, moderator } from "@/lib/permissions";

interface AuthResponse {
  data?: unknown;
  error: { message?: string; code?: string } | null;
}

type AuthMethod<TArgs = unknown> = (args: TArgs) => Promise<AuthResponse>;
type AuthVariadicMethod = (...args: unknown[]) => Promise<AuthResponse>;

type BaseAuthClient = {
  getSession: () => Promise<unknown>;
  useSession: () => unknown;
  signOut: AuthVariadicMethod;
  signIn: Record<string, AuthVariadicMethod> & {
    social: AuthMethod<{ provider: string; callbackURL?: string }>;
    emailOtp: AuthMethod<{ email: string; otp: string }>;
  };
  signUp: Record<string, AuthVariadicMethod> & {
    email: AuthMethod<{ email: string; password: string; name: string }>;
  };
  emailOtp: Record<string, AuthVariadicMethod> & {
    sendVerificationOtp: AuthMethod<{ email: string; type: string }>;
    verifyEmail: AuthMethod<{ email: string; otp: string }>;
    checkVerificationOtp: AuthMethod<{ email: string; type: string; otp: string }>;
    resetPassword: AuthMethod<{ email: string; otp: string; password: string }>;
  };
  forgetPassword?: Record<string, AuthVariadicMethod> & {
    emailOtp?: AuthMethod<{ email: string }>;
  };
  changePassword?: AuthVariadicMethod;
};

const baseAuthClient = createAuthClient({
  basePath: "/api/auth",
  user: {
    additionalFields: {
      region: {
        type: "string",
      },
    },
  },
  plugins: [
    adminClient({
      ac,
      roles: {
        admin,
        moderator,
        citizen,
      },
    }),
    emailOTPClient(),
  ],
}) as unknown as BaseAuthClient;

function setLastUsedLoginMethod(method: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("infra_watch_last_auth_method", method);
  }
}

const unsupported = async (feature: string): Promise<AuthResponse> => ({
  error: {
    code: "NOT_CONFIGURED",
    message: `${feature} is not configured yet.`,
  },
});

export const authClient = {
  ...baseAuthClient,
  getSession: baseAuthClient.getSession,
  useSession: baseAuthClient.useSession,
  signOut: baseAuthClient.signOut,
  getLastUsedLoginMethod: (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem("infra_watch_last_auth_method") || null;
  },
  signIn: {
    ...baseAuthClient.signIn,
    social: async (args: { provider: string; callbackURL?: string }) => {
      setLastUsedLoginMethod(args.provider);
      return await baseAuthClient.signIn.social(args);
    },
    emailOtp: async (args: { email: string; otp: string }) => {
      setLastUsedLoginMethod("otp");
      return await baseAuthClient.signIn.emailOtp(args);
    },
  },
  signUp: {
    ...baseAuthClient.signUp,
    email: async (args: { email: string; password: string; name: string }) => {
      setLastUsedLoginMethod("email");
      return await baseAuthClient.signUp.email(args);
    },
  },
  emailOtp: {
    ...baseAuthClient.emailOtp,
    sendVerificationOtp: async (args: { email: string; type: string }) => {
      return await baseAuthClient.emailOtp.sendVerificationOtp(args);
    },
    verifyEmail: async (args: { email: string; otp: string }) => {
      return await baseAuthClient.emailOtp.verifyEmail(args);
    },
    checkVerificationOtp: async (args: { email: string; type: string; otp: string }) => {
      return await baseAuthClient.emailOtp.checkVerificationOtp(args);
    },
    resetPassword: async (args: { email: string; otp: string; password: string }) => {
      return await baseAuthClient.emailOtp.resetPassword(args);
    },
  },
  forgetPassword: {
    ...baseAuthClient.forgetPassword,
    emailOtp: async (args: { email: string }) => {
      if (baseAuthClient.forgetPassword?.emailOtp) {
        return await baseAuthClient.forgetPassword.emailOtp(args);
      }

      return await baseAuthClient.emailOtp.sendVerificationOtp({
        email: args.email,
        type: "forget-password",
      });
    },
  },
  phoneNumber: {
    sendOtp: async (args?: unknown) => {
      void args;
      return unsupported("Phone verification");
    },
    verify: async (args?: unknown) => {
      void args;
      return unsupported("Phone verification");
    },
  },
  changePassword: async (...args: unknown[]) => {
    if (baseAuthClient.changePassword) {
      return await baseAuthClient.changePassword(...args);
    }

    return unsupported("Password change");
  },
};

export const { signIn, signUp, signOut, useSession, emailOtp, phoneNumber, changePassword } = authClient;