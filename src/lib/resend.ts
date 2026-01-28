import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend() {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("RESEND_API_KEY is required in production");
      }
      console.warn("RESEND_API_KEY not set - email sending disabled in development");
    }

    _resend = new Resend(apiKey || "dummy");
  }
  return _resend;
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
