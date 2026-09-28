"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import { emailOtp } from "@/lib/auth-client";

type OtpType = "email-verification" | "sign-in" | "forget-password" | "phone-verification";

// Dictionary key segment per OTP type: account.otp.titles.<key>, .buttons.<key>, .successTitles.<key>.
const OTP_TYPE_KEYS: Record<OtpType, string> = {
  "email-verification": "emailVerification",
  "sign-in": "signIn",
  "forget-password": "forgetPassword",
  "phone-verification": "phoneVerification",
};

interface OTPVerificationFormProps {
  identifier: string; // email or phone
  type?: OtpType;
  onSuccess: (code?: string) => void;
  onBack?: () => void;
}

export type OtpTimerState = {
  expiresAt: number;
  generation: number;
};

export function resetOtpTimerState(
  state: OtpTimerState,
  now: number,
  seconds: number,
): OtpTimerState {
  return {
    expiresAt: now + seconds * 1_000,
    generation: state.generation + 1,
  };
}

export function OTPVerificationForm({
  identifier,
  type = "email-verification",
  onSuccess,
  onBack,
}: OTPVerificationFormProps) {
  const { t } = useTranslation();
  const typeKey = OTP_TYPE_KEYS[type];
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [timer, setTimer] = useState(180); // 3 minutes countdown
  const [timerState, setTimerState] = useState<OtpTimerState>(() => ({
    expiresAt: Date.now() + 180 * 1_000,
    generation: 0,
  }));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update expiration time when code is sent/resent
  const resetTimer = (seconds: number = 180) => {
    setTimerState((state) => resetOtpTimerState(state, Date.now(), seconds));
    setTimer(seconds);
  };

  // Timer for OTP validity
  useEffect(() => {
    if (success) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((timerState.expiresAt - Date.now()) / 1000),
      );
      setTimer(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [success, timerState.expiresAt, timerState.generation]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timerId = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [resendCooldown]);

  // Format timer as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleChange = (index: number, value: string) => {
    // Only accept digits
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];

    // Handle paste
    if (value.length > 1) {
      const pastedDigits = value.slice(0, 6).split("");
      pastedDigits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      const nextIndex = Math.min(index + pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newOtp[index] = value;
      setError(null);

      // Move to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    setOtp(newOtp);
    const code = newOtp.join("");
    if (code.length === 6 && !isVerifying && timer > 0) {
      void handleVerify(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  async function handleVerify(code: string) {
    if (timer === 0) {
      setError(t("account.otp.errors.expired"));
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      let result;
      if (type === "email-verification") {
        result = await emailOtp.verifyEmail({
          email: identifier,
          otp: code,
        });
      } else if (type === "sign-in") {
        const { signIn } = await import("@/lib/auth-client");
        result = await signIn.emailOtp({
          email: identifier,
          otp: code,
        });
      } else if (type === "forget-password") {
        result = await emailOtp.checkVerificationOtp({
          email: identifier,
          type: "forget-password",
          otp: code,
        });
      } else if (type === "phone-verification") {
        const { phoneNumber } = await import("@/lib/auth-client");
        result = await phoneNumber.verify({
          phoneNumber: identifier,
          code,
          updatePhoneNumber: true,
        });
      }

      if (result?.error) {
        const err = result.error;
        setError(err.message || t("account.otp.errors.verifyFailed"));
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(code);
      }, 1500);
    } catch {
      setError(t("account.auth.unexpectedErrorRetry"));
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      let result;
      if (type === "forget-password") {
        const { authClient } = await import("@/lib/auth-client");
        result = await authClient.forgetPassword.emailOtp({
          email: identifier,
        });
      } else if (type === "phone-verification") {
        const { phoneNumber } = await import("@/lib/auth-client");
        result = await phoneNumber.sendOtp({
          phoneNumber: identifier,
        });
      } else {
        result = await emailOtp.sendVerificationOtp({
          email: identifier,
          type,
        });
      }

      if (result?.error) {
        setError(result.error.message || t("account.otp.errors.resendFailed"));
      } else {
        setResendCooldown(60);
        resetTimer(180);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError(t("account.otp.errors.resendFailedRetry"));
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {t(`account.otp.successTitles.${typeKey}`)}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {type === "forget-password" ? t("account.otp.proceedingToReset") : t("account.otp.continuingToAccount")}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {t(`account.otp.titles.${typeKey}`)}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t("account.otp.sentTo")}{" "}
          <span className="font-medium text-slate-900 dark:text-white">
            {identifier}
          </span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isVerifying || timer === 0}
              className="w-10 h-12 text-center text-lg font-semibold border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-primary sm:w-12 sm:h-14 sm:text-xl"
            />
          ))}
        </div>

        <div className={`text-xs font-medium flex items-center gap-1.5 ${timer === 0 ? 'text-red-500' : 'text-slate-500'}`}>
          <AlertCircle className="w-3.5 h-3.5" />
          {timer > 0 ? (
            <span>{t("account.otp.expiresIn")} <span className="font-mono">{formatTime(timer)}</span></span>
          ) : (
            <span>{t("account.otp.expired")}</span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Verify Button */}
      <Button
        type="button"
        className="w-full h-11 rounded-xl text-sm font-semibold"
        disabled={otp.join("").length < 6 || isVerifying || timer === 0}
        onClick={() => handleVerify(otp.join(""))}
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t("account.otp.verifying")}
          </>
        ) : (
          t(`account.otp.buttons.${typeKey}`)
        )}
      </Button>

      {/* Resend & Back */}
      <div className="flex items-center justify-between text-sm">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline-offset-4 hover:underline"
          >
            {t("account.auth.back")}
          </button>
        )}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          className="flex items-center gap-1.5 text-primary hover:text-primary/90 dark:text-primary/80 dark:hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed ml-auto font-medium"
        >
          {isResending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {resendCooldown > 0 ? t("account.otp.resendIn", { seconds: resendCooldown }) : t("account.otp.resend")}
        </button>
      </div>
    </div>
  );
}
