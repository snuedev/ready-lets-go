import { format } from "./format.js";
import { generate } from "./generate.js";
import type { Trip } from "./types.js";

const trip: Trip = {
  nights: 4,
  climate: "mild",
  accommodation: "tent",
  transport: "car",
  activities: ["festival", "cooking", "photography"],
  laundryAvailable: false,
  international: true,
};

console.log(format(generate(trip)));
