# ready-lets-go

Helps a traveller decide what to take on a trip: describe the trip, get a list of what to pack, adjust it to suit yourself, tick it off as you go.

## Language

### The trip

**Trip**:
One journey away from home, described by its length, climate, accommodation, transport and activities. The input to generation.
_Avoid_: Holiday, vacation, journey

**Activity**:
Something you intend to do on a trip that changes what you need to bring.
_Avoid_: Event, plan

### What to pack

**Item**:
One thing a person might pack, belonging to a category, with a rule for when it applies.
_Avoid_: Thing, entry, product

**Condition**:
A rule deciding whether an item applies to a given trip.
_Avoid_: Predicate, filter, matcher

**Stored condition**:
A condition held as data rather than code, so a user-added item can carry one. Made of situations.

**Situation**:
One set of tests within a stored condition, all of which must hold. A stored condition applies if any of its situations matches; one with no situations always applies.
_Avoid_: Group, clause, branch

**Test**:
One check inside a situation: a trip field is one of, or none of, some values, or a threshold on nights.
_Avoid_: Filter, rule, check

**Catalogue**:
The built-in set of items shipped with the app, the same for everyone.
_Avoid_: Master list, defaults, library

**Override**:
One user's change to the catalogue: an item they added, hid, or altered. Belongs to the user, not to any one trip.
_Avoid_: Customisation, preference, edit

**Effective catalogue**:
What a particular user's generation actually runs against: the catalogue with that user's overrides applied. Computed, never stored.

**Packing list**:
The result of running one user's effective catalogue against one trip. Saved, and ticked off as the user packs.
_Avoid_: Generated list, output, results
