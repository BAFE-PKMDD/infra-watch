"use client";

import { useState, Suspense, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/actions/mutation/auth.mutation";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/providers/auth-provider";
import { OTPVerificationForm } from "@/components/auth/otp-verification-form";

const GoogleIcon = () => (
  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.6 12.2273C21.6 11.5182 21.5418 10.8364 21.4363 10.1818H12V14.05H17.2364C17.011 15.2682 16.3272 16.3 15.2954 16.9682V19.5182H18.5454C20.2909 17.9 21.6 15.3182 21.6 12.2273Z" fill="#4285F4" />
    <path d="M11.9999 22C14.6999 22 16.9636 21.1091 18.5454 19.5182L15.2954 16.9682C14.4363 17.55 13.3272 17.9091 11.9999 17.9091C9.38631 17.9091 7.18176 16.2773 6.39994 13.9H3.06363V16.5273C4.63631 19.8364 8.0454 22 11.9999 22Z" fill="#34A853" />
    <path d="M6.39999 13.9C6.19999 13.3182 6.0909 12.7 6.0909 12.0455C6.0909 11.3909 6.20908 10.7727 6.39999 10.1909V7.56363H3.06363C2.38181 8.8909 2 10.4091 2 12.0455C2 13.6818 2.38181 15.2 3.06363 16.5273L6.39999 13.9Z" fill="#FBBC05" />
    <path d="M11.9999 6.09091C13.4545 6.09091 14.7363 6.59091 15.7545 7.54545L18.6181 4.68182C16.9636 3.13636 14.6999 2.18182 11.9999 2.18182C8.0454 2.18182 4.63631 4.34545 3.06363 7.56363L6.39999 10.1909C7.18181 7.81363 9.38631 6.09091 11.9999 6.09091Z" fill="#EA4335" />
  </svg>
);

const getLastAuthMethodSnapshot = () => authClient.getLastUsedLoginMethod();
const getLastAuthMethodServerSnapshot = () => null;

function subscribeLastAuthMethod(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === "infra_watch_last_auth_method") {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { refreshAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "choice" | "password" | "otp">("email");
  const lastMethod = useSyncExternalStore(
    subscribeLastAuthMethod,
    getLastAuthMethodSnapshot,
    getLastAuthMethodServerSnapshot,
  );

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setStep("choice");
  };

  const handleSendOTP = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      if (result.error) {
        setError(result.error.message || "Failed to send code");
      } else {
        setStep("otp");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (!result.success) {
        setError(result.message);
      } else {
        await refreshAuth();
        window.location.href = redirect;
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: redirect,
      });

      if (result.error) {
        setError(result.error.message || "Google sign-in is not configured. Add Google OAuth credentials and restart the dev server.");
      }
    } catch {
      setError("Failed to sign in with Google");
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
          <Card className="shadow-2xl border border-slate-200 dark:border-slate-800/50 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
            <AnimatePresence mode="wait">
              {/* Step 1: Email Input */}
              {step === "email" && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Sign in to INFRA Watch
                    </CardTitle>
                    <p className="text-sm text-slate-650 dark:text-slate-300 pb-3">
                      Sign in to continue and access your account features.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <>
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-11 rounded-xl text-sm font-semibold relative flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850"
                            onClick={handleGoogleSignIn}
                          >
                            <GoogleIcon />
                            <span className="text-slate-755 dark:text-white">Continue with Google</span>
                            {lastMethod === "google" && (
                              <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none px-2 h-5 text-[10px]">
                                Last used
                              </Badge>
                            )}
                          </Button>
                        </div>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 dark:text-slate-400">
                              Or continue with
                            </span>
                          </div>
                        </div>
                    </>

                    <form onSubmit={handleContinue} className="space-y-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="font-semibold text-xs text-slate-700 dark:text-slate-300">Email Address</Label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary dark:border-slate-700 dark:bg-slate-800 transition-shadow">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            className="border-none p-0 focus-visible:ring-0 h-auto bg-transparent w-full text-slate-900 dark:text-white"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <Button className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/95 text-white shadow-sm transition-colors mt-2">
                        Continue
                      </Button>
                    </form>
                  </CardContent>
                </motion.div>
              )}

              {/* Step 2: Method Choice */}
              {step === "choice" && (
                <motion.div
                  key="choice"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Choose method
                    </CardTitle>
                    <p className="text-sm text-slate-650 dark:text-slate-300 pb-3">
                      Signing in as <span className="font-semibold text-slate-900 dark:text-white">{email}</span>
                      <button onClick={() => setStep("email")} className="ml-2 text-primary hover:underline text-xs font-semibold">Change</button>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full h-16 rounded-xl flex items-center justify-between px-4 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                      onClick={() => setStep("password")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Sign in with Password</span>
                            {lastMethod === "email" && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                                Last used
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">Access using your account password</div>
                        </div>
                      </div>
                      <span className="text-primary text-lg font-bold">→</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-16 rounded-xl flex items-center justify-between px-4 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                      disabled={loading}
                      onClick={handleSendOTP}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Sign in with Email Code</span>
                            {lastMethod === "otp" && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                                Last used
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">Use a temporary code sent to your inbox</div>
                        </div>
                      </div>
                      <span className="text-primary text-lg font-bold">→</span>
                    </Button>
                  </CardContent>
                </motion.div>
              )}

              {/* Step 3: Password Input */}
              {step === "password" && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Enter password
                    </CardTitle>
                    <p className="text-sm text-slate-650 dark:text-slate-300 pb-3">
                      Welcome back, <span className="font-semibold text-slate-900 dark:text-white">{email}</span>
                      <button onClick={() => setStep("choice")} className="ml-2 text-primary hover:underline text-xs font-semibold">Back</button>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleEmailPasswordSignIn} className="space-y-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="font-semibold text-xs text-slate-700 dark:text-slate-300">Password</Label>
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
                            autoFocus
                          />
                        </div>
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                          <p className="text-sm text-red-755 dark:text-red-300">{error}</p>
                        </motion.div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/95 text-white transition-colors mt-2"
                      >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Sign In"}
                      </Button>
                    </form>
                  </CardContent>
                </motion.div>
              )}

              {/* Step 3: OTP Verification */}
              {step === "otp" && (
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
                      type="sign-in"
                      onSuccess={async () => {
                        await refreshAuth();
                        window.location.href = redirect;
                      }}
                      onBack={() => setStep("choice")}
                    />
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between text-sm">
              <p className="text-slate-500 dark:text-slate-400">
                New here?{" "}
                <Link href="/sign-up" className="text-primary hover:underline dark:text-primary font-semibold">
                  Create an account
                </Link>
              </p>
              <Link href="/forget-password" onClick={(e) => {
                if (email) {
                  e.preventDefault();
                  router.push(`/forget-password?email=${encodeURIComponent(email)}`);
                }
              }} className="text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
                Forgot password?
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>

      <AppFooter />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
