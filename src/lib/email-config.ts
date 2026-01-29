/**
 * Centralized email configuration
 * All email sending should use these constants for consistency
 */

export const EMAIL_FROM =
  process.env.EMAIL_FROM_ADDRESS || "United Farm Workers <info@bigperro.dev>";

export const EMAIL_FROM_NAME = "United Farm Workers";
