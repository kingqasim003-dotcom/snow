export interface CreditPack {
  id: string;
  credits: number;
  priceUsd: number;
  label: string;
  popular?: boolean;
}

/** Credit packs up to 1,000 credits max */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_100", credits: 100, priceUsd: 1, label: "100 Credits" },
  { id: "pack_200", credits: 200, priceUsd: 2, label: "200 Credits", popular: true },
  { id: "pack_500", credits: 500, priceUsd: 5, label: "500 Credits" },
  { id: "pack_1000", credits: 1000, priceUsd: 10, label: "1,000 Credits" },
];

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}