import type { QuantityRule, StoredCondition, Test, TestMode, Trip } from "./types.js";

const hits = (
  mode: TestMode,
  values: readonly string[],
  actual: readonly string[],
): boolean => {
  const found = actual.some((value) => values.includes(value));
  return mode === "oneOf" ? found : !found;
};

const holds = (test: Test, trip: Trip): boolean => {
  switch (test.field) {
    case "climate":
      return hits(test.mode, test.values, [trip.climate]);
    case "accommodation":
      return hits(test.mode, test.values, [trip.accommodation]);
    case "transport":
      return hits(test.mode, test.values, [trip.transport]);
    case "activities":
      return hits(test.mode, test.values, trip.activities);
    case "international":
      return trip.international === test.value;
    case "laundryAvailable":
      return trip.laundryAvailable === test.value;
    case "nights":
      return test.mode === "atLeast"
        ? trip.nights >= test.value
        : trip.nights <= test.value;
    default:
      return false;
  }
};

export const compile =
  (condition: StoredCondition) =>
  (trip: Trip): boolean =>
    condition.situations.length === 0 ||
    condition.situations.some((situation) =>
      situation.tests.every((test) => holds(test, trip)),
    );

export const compileQuantity =
  (rule: QuantityRule) =>
  (trip: Trip): number =>
    rule.mode === "fixed"
      ? Math.max(1, rule.value)
      : Math.max(
          1,
          Math.min(Math.ceil(trip.nights * rule.value), rule.cap ?? Infinity),
        );
