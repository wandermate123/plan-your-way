import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PricingConfigSchema, type PricingConfig } from "./validation";

const PRICING_PATH = path.join(process.cwd(), "data", "pricing.json");

export async function readPricingConfig(): Promise<PricingConfig> {
  const raw = await readFile(PRICING_PATH, "utf8");
  const parsed = PricingConfigSchema.parse(JSON.parse(raw));
  return parsed;
}

export async function writePricingConfig(next: PricingConfig): Promise<void> {
  const validated = PricingConfigSchema.parse(next);
  await writeFile(PRICING_PATH, JSON.stringify(validated, null, 2) + "\n", "utf8");
}

