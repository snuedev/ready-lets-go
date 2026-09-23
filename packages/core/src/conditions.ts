import type { Activity, Climate, Trip } from "./types.js";

export const always = () => true;

export const doing =
  (...activities: Activity[]) =>
  (trip: Trip) =>
    activities.some((activity) => trip.activities.includes(activity));

export const inClimate =
  (...climates: Climate[]) =>
  (trip: Trip) =>
    climates.includes(trip.climate);

export const selfCatering = (trip: Trip) =>
  trip.accommodation === "tent" || trip.accommodation === "cabin";

export const carryingEverything = (trip: Trip) =>
  trip.transport === "foot" || trip.accommodation === "tent";

export const longerThan = (nights: number) => (trip: Trip) =>
  trip.nights > nights;

export const all =
  (...conditions: Array<(trip: Trip) => boolean>) =>
  (trip: Trip) =>
    conditions.every((condition) => condition(trip));

export const perNight =
  (perNight: number, cap = Infinity) =>
  (trip: Trip) =>
    Math.min(Math.ceil(trip.nights * perNight), cap);

export const outfitsFor = (trip: Trip) =>
  trip.laundryAvailable ? Math.min(trip.nights + 1, 4) : trip.nights + 1;
