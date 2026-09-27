"use client";

import { useState } from "react";
import Link from "next/link";

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
import { useTranslation } from "@/i18n";

type Step = "form" | "otp";

export default function SignUpPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Field errors hold a dictionary key, so a shown message follows the EN/TL switch.
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name || name.trim().length < 2) {
      newErrors.name = "account.signUp.errors.nameMin";
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "account.signUp.errors.emailInvalid";
    }
    if (!password || password.length < 8) {
      newErrors.password = "account.auth.passwordMin";
    } else {
      if (!/[A-Z]/.test(password)) {
        newErrors.password = "account.signUp.errors.passwordUppercase";
      } else if (!/[a-z]/.test(password)) {
        newErrors.password = "account.signUp.errors.passwordLowercase";
      } else if (!/[0-9]/.test(password)) {
        newErrors.password = "account.signUp.errors.passwordNumber";
      }
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "account.auth.passwordMismatch";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = () => {
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
        setServerError(signUpResult.error.message || t("account.signUp.errors.registrationFailed"));
        return;
      }

      setStep("otp");
    } catch {
      setServerError(t("account.auth.unexpectedErrorRetry"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary/5 to-slate-50 dark:from-slate-950 dark:via-primary/5 dark:to-slate-950 flex flex-col justify-between">
      <AppHeader activeItem="home" />

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
                      {t("account.signUp.title")}
                    </CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-300 pb-3">
                      {t("account.signUp.subtitle")}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <Label htmlFor="name" className="font-semibold text-xs text-slate-700 dark:text-slate-300">{t("account.signUp.nameLabel")}</Label>
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
                            onBlur={handleBlur}
                            required
                          />
                        </div>
                        {errors.name && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                            {t(errors.name)}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <Label htmlFor="email" className="font-semibold text-xs text-slate-700 dark:text-slate-300">{t("account.auth.emailLabel")}</Label>
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
                            onBlur={handleBlur}
                            required
                          />
                        </div>
                        {errors.email && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                            {t(errors.email)}
                          </p>
                        )}
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <Label htmlFor="password" className="font-semibold text-xs text-slate-700 dark:text-slate-300">{t("account.auth.passwordLabel")}</Label>
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
                            onBlur={handleBlur}
                            required
                          />
                        </div>
                        {errors.password && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                            {t(errors.password)}
                          </p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-1">
                        <Label htmlFor="confirmPassword" className="font-semibold text-xs text-slate-700 dark:text-slate-300">{t("account.signUp.confirmPasswordLabel")}</Label>
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
                            onBlur={handleBlur}
                            required
                          />
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
                            {t(errors.confirmPassword)}
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
                        {t("account.signUp.haveAccount")}{" "}
                        <Link
                          href="/sign-in"
                          className="text-primary hover:underline font-bold"
                        >
                          {t("account.signUp.signInLink")}
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
                            {t("account.signUp.creating")}
                          </>
                        ) : (
                          t("account.signUp.submit")
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
                      {t("account.auth.checkEmail")}
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
