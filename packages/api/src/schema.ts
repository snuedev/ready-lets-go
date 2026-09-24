import type {
  Accommodation,
  Activity,
  Category,
  Climate,
  QuantityRule,
  StoredCondition,
  Transport,
} from "@readyletsgo/core";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const userId = () => text("user_id").notNull();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const trip = pgTable(
  "trip",
  {
    id: uuid("id").primaryKey(),
    userId: userId(),
    nights: integer("nights").notNull(),
    climate: text("climate").$type<Climate>().notNull(),
    accommodation: text("accommodation").$type<Accommodation>().notNull(),
    transport: text("transport").$type<Transport>().notNull(),
    activities: text("activities").array().$type<Activity[]>().notNull(),
    laundryAvailable: boolean("laundry_available").notNull(),
    international: boolean("international").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("trip_user_id_idx").on(table.userId)],
);

export const packingList = pgTable("packing_list", {
  id: uuid("id").primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .unique()
    .references(() => trip.id, { onDelete: "cascade" }),
  userId: userId(),
  catalogueVersion: integer("catalogue_version").notNull(),
  createdAt: createdAt(),
});

export const packingListItem = pgTable(
  "packing_list_item",
  {
    id: uuid("id").primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => packingList.id, { onDelete: "cascade" }),
    source: text("source").$type<"catalogue" | "user">().notNull(),
    sourceRef: text("source_ref").notNull(),
    name: text("name").notNull(),
    category: text("category").$type<Category>().notNull(),
    note: text("note"),
    quantity: integer("quantity").notNull(),
    position: integer("position").notNull(),
    packedAt: timestamp("packed_at", { withTimezone: true }),
  },
  (table) => [index("packing_list_item_list_id_idx").on(table.listId)],
);

export const userItem = pgTable(
  "user_item",
  {
    id: uuid("id").primaryKey(),
    userId: userId(),
    name: text("name").notNull(),
    category: text("category").$type<Category>().notNull(),
    note: text("note"),
    quantityMode: text("quantity_mode").$type<QuantityRule["mode"]>().notNull(),
    quantityValue: integer("quantity_value").notNull(),
    quantityCap: integer("quantity_cap"),
    condition: jsonb("condition").$type<StoredCondition>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("user_item_user_id_idx").on(table.userId)],
);

export const catalogueOverride = pgTable(
  "catalogue_override",
  {
    id: uuid("id").primaryKey(),
    userId: userId(),
    itemId: text("item_id").notNull(),
    hidden: boolean("hidden").notNull().default(false),
    name: text("name"),
    category: text("category").$type<Category>(),
    note: text("note"),
    quantityMode: text("quantity_mode").$type<QuantityRule["mode"]>(),
    quantityValue: integer("quantity_value"),
    quantityCap: integer("quantity_cap"),
  },
  (table) => [
    uniqueIndex("catalogue_override_user_item_idx").on(table.userId, table.itemId),
  ],
);
