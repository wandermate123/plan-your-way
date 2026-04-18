import { readPricingConfig } from "@/lib/storage";
import { buildQuoteUiOptions } from "@/lib/quote-ui-options";
import QuoteClient from "./quote-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const pricing = await readPricingConfig();
  const { vehicleOptions, addonOptions, defaultVehicleType } = buildQuoteUiOptions(pricing);

  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <h1>Wandermate — Instant Quote</h1>
          <p>Answer a few questions and get the exact price instantly.</p>
        </div>
      </div>
      <QuoteClient
        vehicleOptions={vehicleOptions}
        defaultVehicleType={defaultVehicleType}
        addonOptions={addonOptions}
      />
    </main>
  );
}
