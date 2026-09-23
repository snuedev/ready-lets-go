import {
  all,
  always,
  carryingEverything,
  doing,
  inClimate,
  longerThan,
  outfitsFor,
  perNight,
  selfCatering,
} from "./conditions.js";
import type { Item } from "./types.js";

export const catalog: Item[] = [
  {
    name: "Passport",
    category: "Documents",
    appliesTo: (trip) => trip.international,
  },
  {
    name: "Travel insurance details",
    category: "Documents",
    appliesTo: (trip) => trip.international,
  },
  {
    name: "Tickets / booking confirmations",
    category: "Documents",
    appliesTo: (trip) => trip.transport !== "foot",
  },
  {
    name: "Wallet, bank card and some cash",
    category: "Documents",
    appliesTo: always,
  },
  {
    name: "Festival wristband or entry ticket",
    category: "Documents",
    appliesTo: doing("festival"),
  },

  {
    name: "Tent",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "tent",
  },
  {
    name: "Sleeping bag",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "tent",
    note: "Check the comfort rating against the coldest night",
  },
  {
    name: "Sleeping mat",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "tent",
  },
  {
    name: "Pillow",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "tent",
  },
  {
    name: "Travel towel",
    category: "Sleep",
    appliesTo: (trip) =>
      trip.accommodation === "tent" || trip.accommodation === "hostel",
  },
  {
    name: "Earplugs and eye mask",
    category: "Sleep",
    appliesTo: (trip) =>
      trip.accommodation === "hostel" || trip.activities.includes("festival"),
  },
  {
    name: "Padlock",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "hostel",
  },

  {
    name: "T-shirts",
    category: "Clothing",
    appliesTo: always,
    quantity: outfitsFor,
  },
  {
    name: "Underwear",
    category: "Clothing",
    appliesTo: always,
    quantity: (trip) => trip.nights + 1,
  },
  {
    name: "Socks",
    category: "Clothing",
    appliesTo: always,
    quantity: (trip) => trip.nights + 1,
  },
  {
    name: "Trousers",
    category: "Clothing",
    appliesTo: always,
    quantity: perNight(0.34, 3),
  },
  {
    name: "Warm mid layer",
    category: "Clothing",
    appliesTo: inClimate("freezing", "cold", "mild"),
  },
  {
    name: "Insulated jacket",
    category: "Clothing",
    appliesTo: inClimate("freezing"),
  },
  {
    name: "Hat, gloves and scarf",
    category: "Clothing",
    appliesTo: inClimate("freezing"),
  },
  {
    name: "Thermal base layers",
    category: "Clothing",
    appliesTo: inClimate("freezing", "cold"),
  },
  {
    name: "Waterproof jacket",
    category: "Clothing",
    appliesTo: inClimate("freezing", "cold", "mild"),
  },
  {
    name: "Sun hat",
    category: "Clothing",
    appliesTo: inClimate("hot"),
  },
  {
    name: "Swimwear",
    category: "Clothing",
    appliesTo: doing("swimming"),
  },
  {
    name: "Smart outfit",
    category: "Clothing",
    appliesTo: doing("formal-event", "business"),
  },
  {
    name: "Walking boots",
    category: "Clothing",
    appliesTo: doing("hiking"),
  },
  {
    name: "Wellies",
    category: "Clothing",
    appliesTo: all(doing("festival"), inClimate("mild", "cold")),
    note: "Festival fields turn to mud the moment it rains",
  },

  {
    name: "Toothbrush and toothpaste",
    category: "Toiletries",
    appliesTo: always,
  },
  {
    name: "Shower kit",
    category: "Toiletries",
    appliesTo: (trip) => trip.accommodation !== "hotel",
  },
  {
    name: "Deodorant",
    category: "Toiletries",
    appliesTo: always,
  },
  {
    name: "Sunscreen",
    category: "Toiletries",
    appliesTo: (trip) =>
      trip.climate === "hot" ||
      trip.activities.includes("hiking") ||
      trip.activities.includes("swimming"),
  },
  {
    name: "Insect repellent",
    category: "Toiletries",
    appliesTo: all(inClimate("mild", "hot"), selfCatering),
  },
  {
    name: "Wet wipes",
    category: "Toiletries",
    appliesTo: (trip) =>
      trip.accommodation === "tent" || trip.activities.includes("festival"),
  },

  {
    name: "Phone and charger",
    category: "Electronics",
    appliesTo: always,
  },
  {
    name: "Power bank",
    category: "Electronics",
    appliesTo: (trip) =>
      trip.accommodation === "tent" || trip.activities.includes("festival"),
  },
  {
    name: "Travel plug adapter",
    category: "Electronics",
    appliesTo: (trip) => trip.international,
  },
  {
    name: "Headphones",
    category: "Electronics",
    appliesTo: (trip) => trip.transport === "plane" || trip.transport === "train",
  },
  {
    name: "Camera and spare batteries",
    category: "Electronics",
    appliesTo: doing("photography"),
  },
  {
    name: "Laptop",
    category: "Electronics",
    appliesTo: doing("business"),
  },
  {
    name: "Head torch",
    category: "Electronics",
    appliesTo: (trip) =>
      trip.accommodation === "tent" || trip.activities.includes("festival"),
  },

  {
    name: "Camping stove and fuel",
    category: "Food & cooking",
    appliesTo: all(selfCatering, doing("cooking")),
  },
  {
    name: "Pot, mug and cutlery",
    category: "Food & cooking",
    appliesTo: selfCatering,
  },
  {
    name: "Water bottle",
    category: "Food & cooking",
    appliesTo: always,
  },
  {
    name: "Breakfast supplies",
    category: "Food & cooking",
    appliesTo: selfCatering,
    quantity: perNight(1),
  },
  {
    name: "Snacks for the journey",
    category: "Food & cooking",
    appliesTo: (trip) => trip.transport !== "foot",
  },
  {
    name: "Rubbish bags",
    category: "Food & cooking",
    appliesTo: selfCatering,
  },

  {
    name: "First aid kit",
    category: "Health & safety",
    appliesTo: always,
  },
  {
    name: "Any regular medication",
    category: "Health & safety",
    appliesTo: always,
    note: "Pack a few days spare in case of delays",
  },
  {
    name: "Blister plasters",
    category: "Health & safety",
    appliesTo: doing("hiking", "festival"),
  },
  {
    name: "Paper map and compass",
    category: "Health & safety",
    appliesTo: doing("hiking"),
    note: "Phone signal and battery both run out",
  },
  {
    name: "Emergency contacts written down",
    category: "Health & safety",
    appliesTo: (trip) => trip.international,
  },

  {
    name: "Daypack",
    category: "Activity gear",
    appliesTo: doing("hiking", "photography", "festival"),
  },
  {
    name: "Dry bag",
    category: "Activity gear",
    appliesTo: all(carryingEverything, inClimate("freezing", "cold", "mild")),
  },
  {
    name: "Trekking poles",
    category: "Activity gear",
    appliesTo: doing("hiking"),
  },
  {
    name: "Folding chair",
    category: "Activity gear",
    appliesTo: all(doing("festival"), (trip) => trip.transport === "car"),
  },

  {
    name: "Book",
    category: "Comfort",
    appliesTo: always,
  },
  {
    name: "Laundry bag",
    category: "Comfort",
    appliesTo: longerThan(3),
  },
  {
    name: "Reusable coffee cup",
    category: "Comfort",
    appliesTo: (trip) => trip.transport !== "foot",
  },
];
