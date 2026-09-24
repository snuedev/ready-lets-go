import type { QuantityRule, StoredCondition, Test, Trip } from "@readyletsgo/core";
import { z } from "zod";

const climate = z.enum(["freezing", "cold", "mild", "hot"]);
const accommodation = z.enum(["tent", "hostel", "hotel", "friends", "cabin"]);
const transport = z.enum(["plane", "car", "train", "foot"]);
const activity = z.enum([
  "hiking",
  "swimming",
  "festival",
  "business",
  "formal-event",
  "photography",
  "cooking",
]);
const category = z.enum([
  "Documents",
  "Sleep",
  "Clothing",
  "Toiletries",
  "Electronics",
  "Food & cooking",
  "Health & safety",
  "Activity gear",
  "Comfort",
]);
const testMode = z.enum(["oneOf", "noneOf"]);

export const testSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("climate"), mode: testMode, values: z.array(climate) }),
  z.object({
    field: z.literal("accommodation"),
    mode: testMode,
    values: z.array(accommodation),
  }),
  z.object({ field: z.literal("transport"), mode: testMode, values: z.array(transport) }),
  z.object({ field: z.literal("activities"), mode: testMode, values: z.array(activity) }),
  z.object({ field: z.literal("international"), value: z.boolean() }),
  z.object({ field: z.literal("laundryAvailable"), value: z.boolean() }),
  z.object({
    field: z.literal("nights"),
    mode: z.enum(["atLeast", "atMost"]),
    value: z.number().int().min(1).max(365),
  }),
]);

export const situationSchema = z.object({ tests: z.array(testSchema) });

export const storedConditionSchema = z.object({
  situations: z.array(situationSchema),
});

export const quantityRuleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("fixed"), value: z.number().int().min(1).max(999) }),
  z.object({
    mode: z.literal("perNight"),
    value: z.number().positive().max(99),
    cap: z.number().int().min(1).max(999).optional(),
  }),
]);

export const tripSchema = z.object({
  nights: z.number().int().min(1).max(365),
  climate,
  accommodation,
  transport,
  activities: z.array(activity),
  laundryAvailable: z.boolean(),
  international: z.boolean(),
});

export const userItemInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category,
  note: z.string().trim().max(280).optional(),
  quantity: quantityRuleSchema,
  condition: storedConditionSchema,
});

export const catalogueOverrideInputSchema = z.object({
  itemId: z.string().min(1).max(64),
  hidden: z.boolean(),
  name: z.string().trim().min(1).max(120).optional(),
  category: category.optional(),
  note: z.string().trim().max(280).optional(),
  quantity: quantityRuleSchema.optional(),
});

type IsEqual<A, B> = (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B
  ? 1
  : 2
  ? true
  : false;

type Assert<T extends true> = T;

export type TripSchemaMatchesCore = Assert<IsEqual<z.infer<typeof tripSchema>, Trip>>;
export type TestSchemaMatchesCore = Assert<IsEqual<z.infer<typeof testSchema>, Test>>;
export type ConditionSchemaMatchesCore = Assert<
  IsEqual<z.infer<typeof storedConditionSchema>, StoredCondition>
>;
export type QuantitySchemaMatchesCore = Assert<
  IsEqual<z.infer<typeof quantityRuleSchema>, QuantityRule>
>;
