import { generate, type Trip } from "@readyletsgo/core";

export const packingListFor = (trip: Trip) => generate(trip);

export {
  catalogueOverride,
  packingList,
  packingListItem,
  trip,
  userItem,
} from "./schema.js";

export {
  catalogueOverrideInputSchema,
  quantityRuleSchema,
  situationSchema,
  storedConditionSchema,
  testSchema,
  tripSchema,
  userItemInputSchema,
} from "./validation.js";
