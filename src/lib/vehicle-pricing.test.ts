import { describe, expect, it } from "vitest";
import { vehicleRouteBandFromDestinations } from "./vehicle-pricing";

describe("vehicleRouteBandFromDestinations", () => {
  it("uses Ayodhya+Prayagraj combo when both are selected", () => {
    expect(vehicleRouteBandFromDestinations(["varanasi", "ayodhya", "prayagraj"])).toBe("ayodhyaPrayagraj");
  });

  it("uses Ayodhya when only Ayodhya (with Varanasi)", () => {
    expect(vehicleRouteBandFromDestinations(["varanasi", "ayodhya"])).toBe("ayodhya");
  });

  it("uses Prayagraj when only Prayagraj", () => {
    expect(vehicleRouteBandFromDestinations(["prayagraj"])).toBe("prayagraj");
  });

  it("uses Vindhyachal when Vindhyachal is included without Ayodhya", () => {
    expect(vehicleRouteBandFromDestinations(["varanasi", "vindhyachal"])).toBe("vindhyachal");
  });

  it("prefers Ayodhya+Prayagraj combo over Vindhyachal when all three appear", () => {
    expect(vehicleRouteBandFromDestinations(["ayodhya", "prayagraj", "vindhyachal"])).toBe("ayodhyaPrayagraj");
  });

  it("uses local Varanasi for Varanasi-only trips", () => {
    expect(vehicleRouteBandFromDestinations(["varanasi"])).toBe("localVaranasi");
  });
});
