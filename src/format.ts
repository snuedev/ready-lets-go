import type { PackingList, Trip } from "./types.js";

const describe = (trip: Trip): string => {
  const nights = `${trip.nights} night${trip.nights === 1 ? "" : "s"}`;
  const activities =
    trip.activities.length > 0 ? ` for ${trip.activities.join(", ")}` : "";
  return `${nights} in a ${trip.accommodation}, ${trip.climate} weather, by ${trip.transport}${activities}`;
};

export const format = (list: PackingList): string => {
  const lines: string[] = ["", describe(list.trip), ""];

  for (const group of list.groups) {
    lines.push(group.category.toUpperCase());
    for (const item of group.items) {
      const count = item.quantity > 1 ? ` x${item.quantity}` : "";
      const note = item.note ? `  (${item.note})` : "";
      lines.push(`  [ ] ${item.name}${count}${note}`);
    }
    lines.push("");
  }

  lines.push(`${list.totalItems} items`);
  return lines.join("\n");
};
