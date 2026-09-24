export type Climate = "freezing" | "cold" | "mild" | "hot";

export type Accommodation = "tent" | "hostel" | "hotel" | "friends" | "cabin";

export type Transport = "plane" | "car" | "train" | "foot";

export type Activity =
  | "hiking"
  | "swimming"
  | "festival"
  | "business"
  | "formal-event"
  | "photography"
  | "cooking";

export type Category =
  | "Documents"
  | "Sleep"
  | "Clothing"
  | "Toiletries"
  | "Electronics"
  | "Food & cooking"
  | "Health & safety"
  | "Activity gear"
  | "Comfort";

export type Trip = {
  nights: number;
  climate: Climate;
  accommodation: Accommodation;
  transport: Transport;
  activities: Activity[];
  laundryAvailable: boolean;
  international: boolean;
};

export type ItemId = string;

export type Item = {
  id: ItemId;
  name: string;
  category: Category;
  appliesTo: (trip: Trip) => boolean;
  quantity?: (trip: Trip) => number;
  note?: string;
};

export type PackedItem = {
  name: string;
  quantity: number;
  note?: string;
};

export type PackingGroup = {
  category: Category;
  items: PackedItem[];
};

export type PackingList = {
  trip: Trip;
  groups: PackingGroup[];
  totalItems: number;
};

export type TestMode = "oneOf" | "noneOf";

export type Test =
  | { field: "climate"; mode: TestMode; values: Climate[] }
  | { field: "accommodation"; mode: TestMode; values: Accommodation[] }
  | { field: "transport"; mode: TestMode; values: Transport[] }
  | { field: "activities"; mode: TestMode; values: Activity[] }
  | { field: "international"; value: boolean }
  | { field: "laundryAvailable"; value: boolean }
  | { field: "nights"; mode: "atLeast" | "atMost"; value: number };

export type Situation = {
  tests: Test[];
};

export type StoredCondition = {
  situations: Situation[];
};

export type QuantityRule =
  | { mode: "fixed"; value: number }
  | { mode: "perNight"; value: number; cap?: number };

export type CatalogueOverride = {
  itemId: ItemId;
  hidden: boolean;
  name?: string;
  category?: Category;
  note?: string;
  quantity?: QuantityRule;
};

export type UserItem = {
  id: ItemId;
  name: string;
  category: Category;
  note?: string;
  quantity: QuantityRule;
  condition: StoredCondition;
};
