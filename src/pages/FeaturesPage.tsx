import FeatureShowcase from "../components/FeatureShowcase";
import { usePageMeta } from "../hooks/usePageMeta";

export default function FeaturesPage() {
  usePageMeta({
    title: "SnowBear Features — Enhance, Compress, Grammar & Score",
    description:
      "Explore SnowBear AI prompt tools: enhance prompts, compress tokens, fix grammar, and get honest prompt scores.",
    path: "/features",
  });
  return <FeatureShowcase />;
}