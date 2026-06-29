import { type Dispatch, type SetStateAction } from "react";
import PricingSection from "../components/PricingSection";
import { UserProfile } from "../types";

interface PricingPageProps {
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
}

export default function PricingPage({ user, setUser }: PricingPageProps) {
  return <PricingSection user={user} setUser={setUser} showTitle />;
}