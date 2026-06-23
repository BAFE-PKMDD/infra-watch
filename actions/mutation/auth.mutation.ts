"use server";

import { redirect } from "next/navigation";

/**
 * Mock Sign in with email and password
 */
export const signIn = async (email: string, password: string) => {
  // Simulating validation and sign in success
  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required.",
    };
  }

  return {
    success: true,
    message: "Signed in successfully.",
  };
};

/**
 * Mock Sign up with email and password
 */
export const signUp = async (user: {
  email: string;
  password: string;
  name: string;
}) => {
  if (!user.email || !user.password || !user.name) {
    return {
      success: false,
      message: "All fields are required.",
    };
  }

  return {
    success: true,
    message: "Account created successfully.",
  };
};

/**
 * Mock Sign out the current user
 */
export const signOut = async () => {
  return {
    success: true,
    message: "Signed out successfully.",
  };
};

/**
 * Sign out and redirect to sign-in page
 */
export const signOutAndRedirect = async () => {
  redirect("/sign-in");
};
