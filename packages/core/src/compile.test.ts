import { describe, expect, it } from "vitest";
import { compile, compileQuantity } from "./compile.js";
import type { StoredCondition, Trip } from "./types.js";

const baseTrip: Trip = {
  nights: 3,
  climate: "mild",
  accommodation: "hotel",
  transport: "train",
  activities: [],
  laundryAvailable: false,
  international: false,
};

const applies = (condition: StoredCondition, trip: Trip = baseTrip): boolean =>
  compile(condition)(trip);

describe("compile", () => {
  it("treats a condition with no situations as always applying", () => {
    expect(applies({ situations: [] })).toBe(true);
  });

  it("matches when a single test holds", () => {
    const condition: StoredCondition = {
      situations: [{ tests: [{ field: "climate", mode: "oneOf", values: ["mild"] }] }],
    };
    expect(applies(condition)).toBe(true);
    expect(applies(condition, { ...baseTrip, climate: "hot" })).toBe(false);
  });

  it("requires every test in a situation to hold", () => {
    const condition: StoredCondition = {
      situations: [
        {
          tests: [
            { field: "activities", mode: "oneOf", values: ["festival"] },
            { field: "climate", mode: "oneOf", values: ["mild", "cold"] },
          ],
        },
      ],
    };
    const festivalInTheMild = { ...baseTrip, activities: ["festival" as const] };
    expect(applies(condition, festivalInTheMild)).toBe(true);
    expect(applies(condition, { ...festivalInTheMild, climate: "hot" })).toBe(false);
  });

  it("matches when any situation holds, which is how or across fields works", () => {
    const wetWipes: StoredCondition = {
      situations: [
        { tests: [{ field: "accommodation", mode: "oneOf", values: ["tent"] }] },
        { tests: [{ field: "activities", mode: "oneOf", values: ["festival"] }] },
      ],
    };
    expect(applies(wetWipes, { ...baseTrip, accommodation: "tent" })).toBe(true);
    expect(applies(wetWipes, { ...baseTrip, activities: ["festival"] })).toBe(true);
    expect(applies(wetWipes)).toBe(false);
  });

  it("reads none-of as the negation it replaces", () => {
    const showerKit: StoredCondition = {
      situations: [
        { tests: [{ field: "accommodation", mode: "noneOf", values: ["hotel"] }] },
      ],
    };
    expect(applies(showerKit)).toBe(false);
    expect(applies(showerKit, { ...baseTrip, accommodation: "tent" })).toBe(true);
  });

  it("matches an activities test against any of the trip's activities", () => {
    const daypack: StoredCondition = {
      situations: [
        {
          tests: [
            { field: "activities", mode: "oneOf", values: ["hiking", "photography"] },
          ],
        },
      ],
    };
    expect(applies(daypack, { ...baseTrip, activities: ["photography"] })).toBe(true);
    expect(applies(daypack, { ...baseTrip, activities: ["cooking"] })).toBe(false);
  });

  it("excludes an item when none-of matches any activity the trip has", () => {
    const condition: StoredCondition = {
      situations: [
        { tests: [{ field: "activities", mode: "noneOf", values: ["business"] }] },
      ],
    };
    expect(applies(condition, { ...baseTrip, activities: ["hiking"] })).toBe(true);
    expect(applies(condition, { ...baseTrip, activities: ["hiking", "business"] })).toBe(
      false,
    );
  });

  it("compares nights with a threshold", () => {
    const longTrip: StoredCondition = {
      situations: [{ tests: [{ field: "nights", mode: "atLeast", value: 4 }] }],
    };
    expect(applies(longTrip, { ...baseTrip, nights: 4 })).toBe(true);
    expect(applies(longTrip, { ...baseTrip, nights: 3 })).toBe(false);
  });

  it("tests the trip's flags", () => {
    const passport: StoredCondition = {
      situations: [{ tests: [{ field: "international", value: true }] }],
    };
    expect(applies(passport, { ...baseTrip, international: true })).toBe(true);
    expect(applies(passport)).toBe(false);
  });

  it("ignores a value it does not recognise rather than throwing", () => {
    const stale = {
      situations: [{ tests: [{ field: "climate", mode: "oneOf", values: ["monsoon"] }] }],
    } as unknown as StoredCondition;
    expect(() => applies(stale)).not.toThrow();
    expect(applies(stale)).toBe(false);
  });

  it("ignores a field it does not recognise rather than throwing", () => {
    const stale = {
      situations: [{ tests: [{ field: "altitude", mode: "oneOf", values: ["high"] }] }],
    } as unknown as StoredCondition;
    expect(() => applies(stale)).not.toThrow();
    expect(applies(stale)).toBe(false);
  });
});

describe("compileQuantity", () => {
  it("returns a fixed quantity whatever the trip", () => {
    const three = compileQuantity({ mode: "fixed", value: 3 });
    expect(three(baseTrip)).toBe(3);
    expect(three({ ...baseTrip, nights: 20 })).toBe(3);
  });

  it("scales a per-night rate with the trip and rounds up", () => {
    const perNight = compileQuantity({ mode: "perNight", value: 0.34 });
    expect(perNight({ ...baseTrip, nights: 3 })).toBe(2);
    expect(perNight({ ...baseTrip, nights: 9 })).toBe(4);
  });

  it("respects a cap", () => {
    const capped = compileQuantity({ mode: "perNight", value: 1, cap: 4 });
    expect(capped({ ...baseTrip, nights: 10 })).toBe(4);
  });

  it("never returns less than one", () => {
    const tiny = compileQuantity({ mode: "perNight", value: 0 });
    expect(tiny(baseTrip)).toBe(1);
  });
});
