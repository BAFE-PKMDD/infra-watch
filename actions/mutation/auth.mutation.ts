"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAuditContextFromServerAction, logFailedAuthAttempt } from "@/lib/audit";

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(),
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Signed in successfully.",
    };
  } catch (error) {
    const e = error as Error;
    await logFailedAuthAttempt({
      email,
      method: "email_password",
      reason: e.message || "Invalid email or password.",
      requestPath: "/sign-in",
      context: await getAuditContextFromServerAction({ email }),
    });

    return {
      success: false,
      message: e.message || "Invalid email or password.",
    };
  }
};

export const signUp = async (user: {
  email: string;
  password: string;
  name: string;
}) => {
  try {
    await auth.api.signUpEmail({
      body: {
        email: user.email,
        password: user.password,
        name: user.name,
      },
    });

    return {
      success: true,
      message: "Account created successfully.",
    };
  } catch (error) {
    const e = error as Error;

    return {
      success: false,
      message: e.message || "An unknown error occurred.",
    };
  }
};

export const signOut = async () => {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Signed out successfully.",
    };
  } catch (error) {
    const e = error as Error;

    return {
      success: false,
      message: e.message || "Failed to sign out.",
    };
  }
};

export const signOutAndRedirect = async () => {
  await signOut();
  redirect("/sign-in");
};
