"use client";

interface AuthResponse {
  data?: any;
  error: { message?: string; code?: string } | null;
}

// Simple client-side mock auth provider for the UI preview
export const authClient = {
  getLastUsedLoginMethod: (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("infra_watch_last_auth_method") || null;
    }
    return null;
  },
  signIn: {
    social: async ({ provider, callbackURL }: { provider: string; callbackURL?: string }): Promise<AuthResponse> => {
      if (typeof window !== "undefined") {
        localStorage.setItem("infra_watch_last_auth_method", "google");
        // Simulate setting a logged-in user in localStorage
        const mockUser = {
          id: "google-mock-user",
          name: "Juan Dela Cruz",
          email: "juan.delacruz@gmail.com",
          role: "citizen"
        };
        localStorage.setItem("infra_watch_user", JSON.stringify(mockUser));
        window.location.href = callbackURL || "/";
      }
      return { data: { success: true }, error: null };
    },
    emailOtp: async ({ email, otp }: { email: string; otp: string }): Promise<AuthResponse> => {
      if (typeof window !== "undefined") {
        localStorage.setItem("infra_watch_last_auth_method", "otp");
        const mockUser = {
          id: "otp-mock-user",
          name: "Juan Dela Cruz",
          email: email,
          role: "citizen"
        };
        localStorage.setItem("infra_watch_user", JSON.stringify(mockUser));
      }
      return { data: { success: true }, error: null };
    }
  },
  signUp: {
    email: async ({ email, password, name }: any): Promise<AuthResponse> => {
      if (typeof window !== "undefined") {
        localStorage.setItem("infra_watch_last_auth_method", "email");
      }
      return {
        data: {
          user: {
            id: "signup-mock-user",
            name,
            email,
            role: "citizen"
          }
        },
        error: null
      };
    }
  },
  signOut: async (): Promise<AuthResponse> => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("infra_watch_user");
    }
    return { error: null };
  },
  emailOtp: {
    sendVerificationOtp: async ({ email, type }: { email: string; type: string }): Promise<AuthResponse> => {
      console.log(`[MOCK OTP] Sent verification OTP code to: ${email} for type: ${type}`);
      return { error: null };
    },
    verifyEmail: async ({ email, otp }: { email: string; otp: string }): Promise<AuthResponse> => {
      if (typeof window !== "undefined") {
        const mockUser = {
          id: "otp-verified-user",
          name: "Juan Dela Cruz",
          email: email,
          role: "citizen"
        };
        localStorage.setItem("infra_watch_user", JSON.stringify(mockUser));
      }
      return { error: null };
    },
    checkVerificationOtp: async ({ email, type, otp }: any): Promise<AuthResponse> => {
      return { error: null };
    },
    resetPassword: async ({ email, otp, password }: any): Promise<AuthResponse> => {
      return { error: null };
    }
  },
  forgetPassword: {
    emailOtp: async ({ email }: { email: string }): Promise<AuthResponse> => {
      console.log(`[MOCK OTP] Sent forget-password OTP code to: ${email}`);
      return { error: null };
    }
  },
  phoneNumber: {
    sendOtp: async ({ phoneNumber }: any): Promise<AuthResponse> => {
      return { error: null };
    },
    verify: async ({ phoneNumber, code }: any): Promise<AuthResponse> => {
      return { error: null };
    }
  },
  changePassword: async (): Promise<AuthResponse> => {
    return { error: null };
  },
  useSession: () => {
    // Basic hook to return mock session
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("infra_watch_user");
      if (userStr) {
        return { data: { user: JSON.parse(userStr) }, isPending: false };
      }
    }
    return { data: null, isPending: false };
  }
};

export const { signIn, signUp, signOut, useSession, emailOtp, phoneNumber, changePassword } = authClient;
