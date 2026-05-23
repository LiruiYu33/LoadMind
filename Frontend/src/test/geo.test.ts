import { describe, expect, it } from "vitest";
import { geocodeLocation, parseCoordinates } from "@/lib/geo";

describe("location helpers", () => {
  it("parses explicit latitude and longitude pairs", () => {
    expect(parseCoordinates("-37.8136, 144.9631")).toEqual({
      lat: -37.8136,
      lng: 144.9631,
    });
    expect(parseCoordinates("-95, 144")).toBeNull();
    expect(parseCoordinates("not coordinates")).toBeNull();
  });

  it("resolves Melbourne CBD aliases before remote geocoding", async () => {
    await expect(geocodeLocation("CBD")).resolves.toEqual({
      lat: -37.8136,
      lng: 144.9631,
    });
    await expect(geocodeLocation("Melbourne CBD")).resolves.toEqual({
      lat: -37.8136,
      lng: 144.9631,
    });
  });

  it("resolves known demo addresses without network access", async () => {
    await expect(geocodeLocation("Clayton, Victoria, 3168, Australia")).resolves.toEqual({
      lat: -37.9158025,
      lng: 145.1313859,
    });
    await expect(geocodeLocation("9A Butler Street, Eumemmerring, Victoria, 3177, Australia")).resolves.toEqual({
      lat: -37.9985619,
      lng: 145.2447439,
    });
  });
});
