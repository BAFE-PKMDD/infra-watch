"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { OTPVerificationForm } from "@/components/auth/otp-verification-form";

function ForgetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError("");
    setLoading(true);

    try {
      const result = await authClient.forgetPassword.emailOtp({
        email,
      });

      if (result.error) {
        setError(result.error.message || "Failed to send reset code");
      } else {
        setStep("otp");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Failed to reset password");
      } else {
        router.push("/sign-in?reset=success");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
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
          <div className="mb-6">
            <Link
              href="/sign-in"
              className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to sign in
            </Link>
          </div>

          <Card className="shadow-2xl border border-slate-200 dark:border-slate-800/50 dark:bg-slate-900/80 backdrop-blur-xl">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {step === "email" ? "Reset Password" :
                  step === "otp" ? "Verify Code" :
                    "New Password"}
              </CardTitle>
              <p className="text-sm text-slate-650 dark:text-slate-300 pb-3">
                {step === "email" ? "Enter your email to receive a password reset code." :
                  step === "otp" ? `Enter the code we sent to ${email}` :
                    "Choose a strong new password for your account."}
              </p>
            </CardHeader>
            <CardContent>
              {step === "email" && (
                <form onSubmit={handleRequestReset} className="space-y-4">
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
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-755 dark:text-red-300">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/95 text-white transition-colors"
                    disabled={loading || !email}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Code"
                    )}
                  </Button>
                </form>
              )}

              {step === "otp" && (
                <OTPVerificationForm
                  identifier={email}
                  type="forget-password"
                  onSuccess={(code) => {
                    setOtp(code || "");
                    setStep("reset");
                  }}
                  onBack={() => setStep("email")}
                />
              )}

              {step === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="password" className="font-semibold text-xs text-slate-700 dark:text-slate-300">New Password</Label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary dark:border-slate-700 dark:bg-slate-800 transition-shadow">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="border-none p-0 focus-visible:ring-0 h-auto bg-transparent w-full text-slate-900 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="font-semibold text-xs text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary dark:border-slate-700 dark:bg-slate-800 transition-shadow">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="border-none p-0 focus-visible:ring-0 h-auto bg-transparent w-full text-slate-900 dark:text-white"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-755 dark:text-red-300">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/95 text-white transition-colors"
                    disabled={loading || !password || password !== confirmPassword}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AppFooter />
    </div>
  );
}

export default function ForgetPasswordPage() {
  return (
    <Suspense>
      <ForgetPasswordContent />
    </Suspense>
  );
}
