import { describe, expect, it } from "vitest";
import { generate } from "./generate.js";
import type { Trip } from "./types.js";

const baseTrip: Trip = {
  nights: 3,
  climate: "mild",
  accommodation: "hotel",
  transport: "train",
  activities: [],
  laundryAvailable: false,
  international: false,
};

const namesIn = (trip: Trip): string[] =>
  generate(trip).groups.flatMap((group) =>
    group.items.map((item) => item.name),
  );

const quantityOf = (trip: Trip, name: string): number | undefined =>
  generate(trip)
    .groups.flatMap((group) => group.items)
    .find((item) => item.name === name)?.quantity;

describe("generate", () => {
  it("leaves camping gear out of a hotel trip", () => {
    expect(namesIn(baseTrip)).not.toContain("Sleeping bag");
  });

  it("includes camping gear when sleeping in a tent", () => {
    expect(namesIn({ ...baseTrip, accommodation: "tent" })).toContain(
      "Sleeping bag",
    );
  });

  it("only asks for a passport when leaving the country", () => {
    expect(namesIn(baseTrip)).not.toContain("Passport");
    expect(namesIn({ ...baseTrip, international: true })).toContain("Passport");
  });

  it("packs one shirt per night plus a spare", () => {
    expect(quantityOf({ ...baseTrip, nights: 3 }, "T-shirts")).toBe(4);
  });

  it("caps shirts when there is a washing machine", () => {
    const trip = { ...baseTrip, nights: 10, laundryAvailable: true };
    expect(quantityOf(trip, "T-shirts")).toBe(4);
  });

  it("combines conditions rather than treating trips as one type", () => {
    const festivalHike: Trip = {
      ...baseTrip,
      accommodation: "tent",
      activities: ["festival", "hiking"],
      climate: "cold",
    };
    const names = namesIn(festivalHike);
    expect(names).toContain("Walking boots");
    expect(names).toContain("Head torch");
    expect(names).toContain("Thermal base layers");
  });

  it("groups items and skips empty categories", () => {
    const list = generate(baseTrip);
    expect(list.groups.every((group) => group.items.length > 0)).toBe(true);
    expect(list.totalItems).toBeGreaterThan(0);
  });
});
