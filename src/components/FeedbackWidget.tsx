"use client";

import { FeedbackButton } from "@james.hankins/feedback-kit/client";
import { useAuth } from "@/lib/auth-context";

export function FeedbackWidget() {
  const { user, isDemoMode } = useAuth();

  if (isDemoMode) return null;

  return (
    <FeedbackButton
      appSlug="survivor-fantasy-league"
      user={
        user
          ? {
              id: user.uid,
              email: user.email ?? undefined,
              name: user.displayName ?? undefined,
            }
          : undefined
      }
    />
  );
}
