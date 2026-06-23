"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, User, Loader2, AlertCircle } from "lucide-react";

import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { OTPVerificationForm } from "@/components/auth/otp-verification-form";

type Step = "form" | "otp";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name || name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password || password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else {
      if (!/[A-Z]/.test(password)) {
        newErrors.password = "Password must contain at least one uppercase letter";
      } else if (!/[a-z]/.test(password)) {
        newErrors.password = "Password must contain at least one lowercase letter";
      } else if (!/[0-9]/.test(password)) {
        newErrors.password = "Password must contain at least one number";
      }
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    validate();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const signUpResult = await signUp.email({
        email,
        password,
        name,
      });

      if (signUpResult.error) {
        setServerError(signUpResult.error.message || "Registration failed. Please try again.");
        return;
      }

      setStep("otp");
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary/5 to-slate-50 dark:from-slate-950 dark:via-primary/5 dark:to-slate-950 flex flex-col justify-between">
      <AppHeader activeItem="home" actionLabel="Sign In" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center flex-1 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl border border-slate-200 dark:border-slate-800/50 dark:bg-slate-900/80 backdrop-blur-xl">
            <AnimatePresence mode="wait">
              {step === "form" ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Create your account
                    </CardTitle>
                    <p className="text-sm text-slate-650 dark:text-slate-300 pb-3">
                      Join INFRA Watch to monitor projects and submit feedback.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <Label htmlFor="name" className="font-semibold text-xs text-slate-700 dark:text-slate-300">Full name</Label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary dark:border-slate-700 dark:bg-slate-800 transition-shadow">
                          <User className="w-4 h-4 text-slate-400" />
                          <Input
                            id="name"
                            type="text"
                            placeholder="Juan Dela Cruz"
                            className="border-none p-0 focus-visible:ring-0 h-auto bg-transparent w-full text-slate-900 dark:text-white"
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                            }}
                            onBlur={() => handleBlur("name")}
                            required
                          />
                        </div>
                        {errors.name && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <Label htmlFor="email" className="font-semibold text-xs text-slate-700 dark:text-slate-300">Email Address</Label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary dark:border-slate-700 dark:bg-slate-800 transition-shadow">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            className="border-none p-0 focus-visible:ring-0 h-auto bg-transparent w-full text-slate-900 dark:text-white"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                            }}
                            onBlur={() => handleBlur("email")}
                            required
                          />
                        </div>
                        {errors.email && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <Label htmlFor="password" className="font-semibold text-xs text-slate-700 dark:text-slate-300">Password</Label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary dark:border-slate-700 dark:bg-slate-800 transition-shadow">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="border-none p-0 focus-visible:ring-0 h-auto bg-transparent w-full text-slate-900 dark:text-white"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (errors.password) setErrors(prev => ({ ...prev, password: "" }));
                            }}
                            onBlur={() => handleBlur("password")}
                            required
                          />
                        </div>
                        {errors.password && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                            {errors.password}
                          </p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-1">
                        <Label htmlFor="confirmPassword" className="font-semibold text-xs text-slate-700 dark:text-slate-300">Confirm password</Label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary dark:border-slate-700 dark:bg-slate-800 transition-shadow">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            className="border-none p-0 focus-visible:ring-0 h-auto bg-transparent w-full text-slate-900 dark:text-white"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: "" }));
                            }}
                            onBlur={() => handleBlur("confirmPassword")}
                            required
                          />
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>

                      {/* Server Error */}
                      {serverError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                          <p className="text-sm text-red-755 dark:text-red-300">
                            {serverError}
                          </p>
                        </motion.div>
                      )}

                      {/* Sign In Link */}
                      <div className="text-sm text-slate-500 dark:text-slate-300">
                        Already have an account?{" "}
                        <Link
                          href="/sign-in"
                          className="text-primary hover:underline font-bold"
                        >
                          Sign in
                        </Link>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/95 text-white transition-colors"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create account"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Check your email
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OTPVerificationForm
                      identifier={email}
                      onSuccess={() => {
                        window.location.href = "/";
                      }}
                      onBack={() => setStep("form")}
                    />
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>

      <AppFooter />
    </div>
  );
}
