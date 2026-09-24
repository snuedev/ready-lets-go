import { describe, expect, it } from "vitest";
import { effectiveCatalogue } from "./effective-catalogue.js";
import { generate } from "./generate.js";
import type { CatalogueOverride, Trip, UserItem } from "./types.js";

const baseTrip: Trip = {
  nights: 3,
  climate: "mild",
  accommodation: "hotel",
  transport: "train",
  activities: [],
  laundryAvailable: false,
  international: false,
};

const idsIn = (
  overrides: CatalogueOverride[] = [],
  userItems: UserItem[] = [],
): string[] => effectiveCatalogue(overrides, userItems).map((item) => item.id);

const find = (
  id: string,
  overrides: CatalogueOverride[] = [],
  userItems: UserItem[] = [],
) => effectiveCatalogue(overrides, userItems).find((item) => item.id === id);

describe("effectiveCatalogue", () => {
  it("is the plain catalogue when a user has changed nothing", () => {
    expect(idsIn()).toContain("passport");
    expect(idsIn()).toHaveLength(57);
  });

  it("drops an item the user hid", () => {
    expect(idsIn([{ itemId: "book", hidden: true }])).not.toContain("book");
  });

  it("keeps an item whose override only patches it", () => {
    const renamed = find("wellies", [
      { itemId: "wellies", hidden: false, name: "Wellington boots" },
    ]);
    expect(renamed?.name).toBe("Wellington boots");
  });

  it("leaves the fields an override does not mention alone", () => {
    const patched = find("sleeping-bag", [
      { itemId: "sleeping-bag", hidden: false, name: "Winter bag" },
    ]);
    expect(patched?.name).toBe("Winter bag");
    expect(patched?.category).toBe("Sleep");
    expect(patched?.note).toBe("Check the comfort rating against the coldest night");
  });

  it("replaces a quantity rule when the override carries one", () => {
    const socks = find("socks", [
      { itemId: "socks", hidden: false, quantity: { mode: "fixed", value: 2 } },
    ]);
    expect(socks?.quantity?.(baseTrip)).toBe(2);
  });

  it("ignores an override pointing at an item that no longer exists", () => {
    expect(() => idsIn([{ itemId: "monocle", hidden: true }])).not.toThrow();
    expect(idsIn([{ itemId: "monocle", hidden: true }])).toHaveLength(57);
  });

  it("adds a user's own item with its stored condition", () => {
    const lensSolution: UserItem = {
      id: "0f9c",
      name: "Contact lens solution",
      category: "Toiletries",
      quantity: { mode: "fixed", value: 1 },
      condition: { situations: [] },
    };
    expect(idsIn([], [lensSolution])).toContain("0f9c");
    expect(find("0f9c", [], [lensSolution])?.appliesTo(baseTrip)).toBe(true);
  });

  it("applies a user item only when its condition holds", () => {
    const goggles: UserItem = {
      id: "a41b",
      name: "Swimming goggles",
      category: "Activity gear",
      quantity: { mode: "fixed", value: 1 },
      condition: {
        situations: [
          { tests: [{ field: "activities", mode: "oneOf", values: ["swimming"] }] },
        ],
      },
    };
    const item = find("a41b", [], [goggles]);
    expect(item?.appliesTo(baseTrip)).toBe(false);
    expect(item?.appliesTo({ ...baseTrip, activities: ["swimming"] })).toBe(true);
  });

  it("feeds generate, so an added item reaches a packing list", () => {
    const nappies: UserItem = {
      id: "b72e",
      name: "Nappies",
      category: "Health & safety",
      quantity: { mode: "perNight", value: 2 },
      condition: { situations: [] },
    };
    const list = generate(baseTrip, effectiveCatalogue([], [nappies]));
    const packed = list.groups
      .flatMap((group) => group.items)
      .find((item) => item.name === "Nappies");
    expect(packed?.quantity).toBe(6);
  });

  it("feeds generate, so a hidden item stays out of a packing list", () => {
    const hidden = effectiveCatalogue([{ itemId: "book", hidden: true }], []);
    const names = generate(baseTrip, hidden).groups.flatMap((group) =>
      group.items.map((item) => item.name),
    );
    expect(names).not.toContain("Book");
  });
});
