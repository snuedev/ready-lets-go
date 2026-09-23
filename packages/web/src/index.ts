import type { Trip } from "@readyletsgo/core";

export const emptyTrip: Trip = {
  nights: 1,
  climate: "mild",
  accommodation: "hotel",
  transport: "car",
  activities: [],
  laundryAvailable: false,
  international: false,
};
