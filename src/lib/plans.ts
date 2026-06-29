import { UserProfile } from "../types";

export function isPaidPlan(plan: UserProfile["plan"]): boolean {
  return plan === "pro" || plan === "unlimited";
}

export function hasUnlimitedUsage(plan: UserProfile["plan"]): boolean {
  return plan === "pro" || plan === "unlimited";
}