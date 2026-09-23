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

export type Item = {
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
