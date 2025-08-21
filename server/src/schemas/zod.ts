import { z } from "zod"

// ── Signup Schema ────────────────────────────────
export const SignupSchema = z.object({
  fullName: z
  .string()
  .min(2, "Full Name must be at least 2 characters")
  .max(50, "Full Name cannot exceed 50 characters"),
  username: z
    .string()
    .min(4, "Username must be at least 4 characters")
    .max(24, "Username cannot exceed 24 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must be at most 20 characters"),
  confirmPassword: z
    .string()
    .min(6, "Confirm Password must be at least 6 characters")
    .max(20, "confirm Password must be at most 20 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "⚠️ Passwords do not match",
  path: ["confirmPassword"],
})

// ── Login Schema ────────────────────────────────
export const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

// ── Types ────────────────────────────────
export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>