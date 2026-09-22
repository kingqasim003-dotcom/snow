import { type Dispatch, type SetStateAction } from "react";
import PricingSection from "../components/PricingSection";
import { UserProfile } from "../types";
import { usePageMeta } from "../hooks/usePageMeta";

interface PricingPageProps {
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
}

export default function PricingPage({ user, setUser }: PricingPageProps) {
  usePageMeta({
    title: "SnowBear Pricing — Free, Polar & Unlimited Plans",
    description: "Choose a SnowBear plan. Free credits, Polar plan with custom instructions, or Unlimited AI prompt optimization.",
    path: "/pricing",
  });
  return <PricingSection user={user} setUser={setUser} showTitle />;
}