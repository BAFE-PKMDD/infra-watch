import assert from "node:assert/strict";
import test from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup as renderMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { OTPVerificationForm } from "./otp-verification-form";
import { LanguageProvider } from "@/providers/language-provider";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} } as unknown as AppRouterInstance;

// The form reads its copy through useTranslation, so render it inside the language provider
// the site wraps pages in (English until a visitor picks Tagalog).
function renderToStaticMarkup(element: ReactElement) {
  return renderMarkup(
    <AppRouterContext.Provider value={router}>
      <LanguageProvider>{element}</LanguageProvider>
    </AppRouterContext.Provider>,
  );
}

test("each code type shows its own English title and button", () => {
  const cases = [
    ["email-verification", "Verify your email", "Verify Email"],
    ["sign-in", "Sign in with code", "Sign In"],
    ["forget-password", "Reset password", "Verify Code"],
    ["phone-verification", "Verify your phone", "Verify Phone"],
  ] as const;

  for (const [type, title, button] of cases) {
    const html = renderToStaticMarkup(
      <OTPVerificationForm identifier="juan@example.com" type={type} onSuccess={() => {}} onBack={() => {}} />,
    );
    assert.match(html, new RegExp(`>${title}</h3>`), `title for ${type}`);
    assert.match(html, new RegExp(`>${button}</button>`), `button for ${type}`);
  }
});

test("shows where the code went, the expiry timer, and the back and resend actions", () => {
  const html = renderToStaticMarkup(
    <OTPVerificationForm identifier="juan@example.com" type="sign-in" onSuccess={() => {}} onBack={() => {}} />,
  );

  assert.match(html, /We sent a 6-digit code to/);
  assert.match(html, /juan@example\.com/);
  assert.match(html, /Code expires in <span class="font-mono">03:00<\/span>/);
  assert.match(html, />Back<\/button>/);
  assert.match(html, /Resend code/);
  assert.doesNotMatch(html, /account\.(otp|auth)\./, "no raw dictionary keys");
});
