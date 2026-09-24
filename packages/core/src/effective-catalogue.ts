import { catalog } from "./catalog.js";
import { compile, compileQuantity } from "./compile.js";
import type { CatalogueOverride, Item, UserItem } from "./types.js";

const asItem = (userItem: UserItem): Item => ({
  id: userItem.id,
  name: userItem.name,
  category: userItem.category,
  note: userItem.note,
  appliesTo: compile(userItem.condition),
  quantity: compileQuantity(userItem.quantity),
});

export const effectiveCatalogue = (
  overrides: CatalogueOverride[],
  userItems: UserItem[],
  base: Item[] = catalog,
): Item[] => {
  const patches = new Map(overrides.map((override) => [override.itemId, override]));

  const patched = base
    .filter((item) => !patches.get(item.id)?.hidden)
    .map((item) => {
      const patch = patches.get(item.id);
      if (!patch) return item;
      return {
        ...item,
        name: patch.name ?? item.name,
        category: patch.category ?? item.category,
        note: patch.note ?? item.note,
        quantity: patch.quantity ? compileQuantity(patch.quantity) : item.quantity,
      };
    });

  return [...patched, ...userItems.map(asItem)];
};
