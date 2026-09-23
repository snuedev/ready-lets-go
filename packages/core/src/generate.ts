import { catalog } from "./catalog.js";
import type {
  Category,
  Item,
  PackedItem,
  PackingGroup,
  PackingList,
  Trip,
} from "./types.js";

const categoryOrder: Category[] = [
  "Documents",
  "Clothing",
  "Sleep",
  "Toiletries",
  "Health & safety",
  "Electronics",
  "Food & cooking",
  "Activity gear",
  "Comfort",
];

const pack = (item: Item, trip: Trip): PackedItem => ({
  name: item.name,
  quantity: item.quantity ? Math.max(1, item.quantity(trip)) : 1,
  note: item.note,
});

export const generate = (trip: Trip, items: Item[] = catalog): PackingList => {
  const matched = items.filter((item) => item.appliesTo(trip));

  const groups: PackingGroup[] = categoryOrder
    .map((category) => ({
      category,
      items: matched
        .filter((item) => item.category === category)
        .map((item) => pack(item, trip)),
    }))
    .filter((group) => group.items.length > 0);

  return { trip, groups, totalItems: matched.length };
};
