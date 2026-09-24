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

// Bump when an item is added, removed, or has its condition or quantity changed:
// a saved packing list records this number to know its snapshot is out of date.
export const CATALOGUE_VERSION = 1;

export const catalog: Item[] = [
  {
    id: "passport",
    name: "Passport",
    category: "Documents",
    appliesTo: (trip) => trip.international,
  },
  {
    id: "travel-insurance",
    name: "Travel insurance details",
    category: "Documents",
    appliesTo: (trip) => trip.international,
  },
  {
    id: "tickets",
    name: "Tickets / booking confirmations",
    category: "Documents",
    appliesTo: (trip) => trip.transport !== "foot",
  },
  {
    id: "wallet",
    name: "Wallet, bank card and some cash",
    category: "Documents",
    appliesTo: always,
  },
  {
    id: "festival-ticket",
    name: "Festival wristband or entry ticket",
    category: "Documents",
    appliesTo: doing("festival"),
  },

  {
    id: "tent",
    name: "Tent",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "tent",
  },
  {
    id: "sleeping-bag",
    name: "Sleeping bag",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "tent",
    note: "Check the comfort rating against the coldest night",
  },
  {
    id: "sleeping-mat",
    name: "Sleeping mat",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "tent",
  },
  {
    id: "pillow",
    name: "Pillow",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "tent",
  },
  {
    id: "travel-towel",
    name: "Travel towel",
    category: "Sleep",
    appliesTo: (trip) =>
      trip.accommodation === "tent" || trip.accommodation === "hostel",
  },
  {
    id: "earplugs",
    name: "Earplugs and eye mask",
    category: "Sleep",
    appliesTo: (trip) =>
      trip.accommodation === "hostel" || trip.activities.includes("festival"),
  },
  {
    id: "padlock",
    name: "Padlock",
    category: "Sleep",
    appliesTo: (trip) => trip.accommodation === "hostel",
  },

  {
    id: "t-shirts",
    name: "T-shirts",
    category: "Clothing",
    appliesTo: always,
    quantity: outfitsFor,
  },
  {
    id: "underwear",
    name: "Underwear",
    category: "Clothing",
    appliesTo: always,
    quantity: (trip) => trip.nights + 1,
  },
  {
    id: "socks",
    name: "Socks",
    category: "Clothing",
    appliesTo: always,
    quantity: (trip) => trip.nights + 1,
  },
  {
    id: "trousers",
    name: "Trousers",
    category: "Clothing",
    appliesTo: always,
    quantity: perNight(0.34, 3),
  },
  {
    id: "mid-layer",
    name: "Warm mid layer",
    category: "Clothing",
    appliesTo: inClimate("freezing", "cold", "mild"),
  },
  {
    id: "insulated-jacket",
    name: "Insulated jacket",
    category: "Clothing",
    appliesTo: inClimate("freezing"),
  },
  {
    id: "hat-gloves-scarf",
    name: "Hat, gloves and scarf",
    category: "Clothing",
    appliesTo: inClimate("freezing"),
  },
  {
    id: "thermal-base-layers",
    name: "Thermal base layers",
    category: "Clothing",
    appliesTo: inClimate("freezing", "cold"),
  },
  {
    id: "waterproof-jacket",
    name: "Waterproof jacket",
    category: "Clothing",
    appliesTo: inClimate("freezing", "cold", "mild"),
  },
  {
    id: "sun-hat",
    name: "Sun hat",
    category: "Clothing",
    appliesTo: inClimate("hot"),
  },
  {
    id: "swimwear",
    name: "Swimwear",
    category: "Clothing",
    appliesTo: doing("swimming"),
  },
  {
    id: "smart-outfit",
    name: "Smart outfit",
    category: "Clothing",
    appliesTo: doing("formal-event", "business"),
  },
  {
    id: "walking-boots",
    name: "Walking boots",
    category: "Clothing",
    appliesTo: doing("hiking"),
  },
  {
    id: "wellies",
    name: "Wellies",
    category: "Clothing",
    appliesTo: all(doing("festival"), inClimate("mild", "cold")),
    note: "Festival fields turn to mud the moment it rains",
  },

  {
    id: "toothbrush",
    name: "Toothbrush and toothpaste",
    category: "Toiletries",
    appliesTo: always,
  },
  {
    id: "shower-kit",
    name: "Shower kit",
    category: "Toiletries",
    appliesTo: (trip) => trip.accommodation !== "hotel",
  },
  {
    id: "deodorant",
    name: "Deodorant",
    category: "Toiletries",
    appliesTo: always,
  },
  {
    id: "sunscreen",
    name: "Sunscreen",
    category: "Toiletries",
    appliesTo: (trip) =>
      trip.climate === "hot" ||
      trip.activities.includes("hiking") ||
      trip.activities.includes("swimming"),
  },
  {
    id: "insect-repellent",
    name: "Insect repellent",
    category: "Toiletries",
    appliesTo: all(inClimate("mild", "hot"), selfCatering),
  },
  {
    id: "wet-wipes",
    name: "Wet wipes",
    category: "Toiletries",
    appliesTo: (trip) =>
      trip.accommodation === "tent" || trip.activities.includes("festival"),
  },

  {
    id: "phone-charger",
    name: "Phone and charger",
    category: "Electronics",
    appliesTo: always,
  },
  {
    id: "power-bank",
    name: "Power bank",
    category: "Electronics",
    appliesTo: (trip) =>
      trip.accommodation === "tent" || trip.activities.includes("festival"),
  },
  {
    id: "plug-adapter",
    name: "Travel plug adapter",
    category: "Electronics",
    appliesTo: (trip) => trip.international,
  },
  {
    id: "headphones",
    name: "Headphones",
    category: "Electronics",
    appliesTo: (trip) => trip.transport === "plane" || trip.transport === "train",
  },
  {
    id: "camera",
    name: "Camera and spare batteries",
    category: "Electronics",
    appliesTo: doing("photography"),
  },
  {
    id: "laptop",
    name: "Laptop",
    category: "Electronics",
    appliesTo: doing("business"),
  },
  {
    id: "head-torch",
    name: "Head torch",
    category: "Electronics",
    appliesTo: (trip) =>
      trip.accommodation === "tent" || trip.activities.includes("festival"),
  },

  {
    id: "camping-stove",
    name: "Camping stove and fuel",
    category: "Food & cooking",
    appliesTo: all(selfCatering, doing("cooking")),
  },
  {
    id: "cook-kit",
    name: "Pot, mug and cutlery",
    category: "Food & cooking",
    appliesTo: selfCatering,
  },
  {
    id: "water-bottle",
    name: "Water bottle",
    category: "Food & cooking",
    appliesTo: always,
  },
  {
    id: "breakfast",
    name: "Breakfast supplies",
    category: "Food & cooking",
    appliesTo: selfCatering,
    quantity: perNight(1),
  },
  {
    id: "journey-snacks",
    name: "Snacks for the journey",
    category: "Food & cooking",
    appliesTo: (trip) => trip.transport !== "foot",
  },
  {
    id: "rubbish-bags",
    name: "Rubbish bags",
    category: "Food & cooking",
    appliesTo: selfCatering,
  },

  {
    id: "first-aid-kit",
    name: "First aid kit",
    category: "Health & safety",
    appliesTo: always,
  },
  {
    id: "medication",
    name: "Any regular medication",
    category: "Health & safety",
    appliesTo: always,
    note: "Pack a few days spare in case of delays",
  },
  {
    id: "blister-plasters",
    name: "Blister plasters",
    category: "Health & safety",
    appliesTo: doing("hiking", "festival"),
  },
  {
    id: "map-compass",
    name: "Paper map and compass",
    category: "Health & safety",
    appliesTo: doing("hiking"),
    note: "Phone signal and battery both run out",
  },
  {
    id: "emergency-contacts",
    name: "Emergency contacts written down",
    category: "Health & safety",
    appliesTo: (trip) => trip.international,
  },

  {
    id: "daypack",
    name: "Daypack",
    category: "Activity gear",
    appliesTo: doing("hiking", "photography", "festival"),
  },
  {
    id: "dry-bag",
    name: "Dry bag",
    category: "Activity gear",
    appliesTo: all(carryingEverything, inClimate("freezing", "cold", "mild")),
  },
  {
    id: "trekking-poles",
    name: "Trekking poles",
    category: "Activity gear",
    appliesTo: doing("hiking"),
  },
  {
    id: "folding-chair",
    name: "Folding chair",
    category: "Activity gear",
    appliesTo: all(doing("festival"), (trip) => trip.transport === "car"),
  },

  {
    id: "book",
    name: "Book",
    category: "Comfort",
    appliesTo: always,
  },
  {
    id: "laundry-bag",
    name: "Laundry bag",
    category: "Comfort",
    appliesTo: longerThan(3),
  },
  {
    id: "coffee-cup",
    name: "Reusable coffee cup",
    category: "Comfort",
    appliesTo: (trip) => trip.transport !== "foot",
  },
];
