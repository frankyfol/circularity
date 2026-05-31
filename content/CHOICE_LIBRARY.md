# CIRCULAR CITY — Choice Library & Year Summary (v4 content layer)

*Plain-language scenes, jargon-free choices, and a pros/cons entry for every decision — plus the end-of-year summary that reads back from it.*

This file is the **rich content layer**. It uses the same event/action IDs as `EVENT_DATABASE_SPEC.md`, so it overlays without changing any logic. Where this file gives a `scene`, `plainLabel`, `plainMeaning`, `pros`, and `cons`, those **replace the terse `brief`/label/`Why`** in the original spec. All mechanics (effects, flags, weighting, scoring) stay exactly as specified there.

**Why this exists (your feedback):**
- Descriptions were one-liners → every event now has a 3–5 sentence **Scene** written like a story, in everyday language.
- Choices were "term-like" → every choice now has a **plain label** a non-expert understands, plus a one-line **what this really means**.
- New **Year Summary** → at the end of each round the student sees what they chose, the upside, the downside, and why it moved their score.

---

## 1. Data schema (add to each action)

```jsonc
Event {
  ...existing fields...,
  scene: "3–5 sentence plain-language narration (story tone)"
}
Action {
  ...existing fields (effects, flags, etc.)...,
  plainLabel:   "Everyday-language button text (no jargon)",
  plainMeaning: "One line: what this choice actually does, in simple terms",
  pros: [ "short plain benefit", ... ],   // 2–3 items
  cons: [ "short plain drawback", ... ],  // 2–3 items
  conceptLink:  "the geography idea this teaches (for the summary & teacher)"
}
```

The `pros`/`cons` are **plain-language** and tied to the metric effects, so the Year Summary can say *"You chose X. Good: …. Bad: …."* automatically.

---

## 2. The Year Summary (end of each round)

After a student resolves all 4 events in a round, show a **"Year in Review" card** before the leaderboard:

```
YEAR {n} IN REVIEW — {City Name}
Your population grew to {pop}; waste rose to {wasteLoad}.

YOU CHOSE:
 • {Event title}: "{plainLabel}"
     👍 Why it helped:  {top pro, tied to the pillar that rose most}
     👎 Watch out:      {top con, tied to the pillar that fell most}
     📊 Net effect:     {▲pillars} / {▼pillars}, {+/- score change}
 • {Event 2 …}
 • {Event 3 …}
 • World event {name}: "{plainLabel}"  …

THE VERDICT THIS YEAR:
 {1–2 sentences: was this a balanced year or a lopsided one? Which
  pillar is now your weakest link and why it matters for your score.}

CONSEQUENCE WATCH:
 {If a flag was set that unlocks future trouble/opportunity, foreshadow it:
  e.g. "Your open dump will haunt you — health risks are rising."}
```

**How the summary is generated (no extra authoring needed):**
1. **YOU CHOSE** — list each resolved action's `plainLabel`.
2. **Why it helped** — pick the action's `pros` item matching the pillar that increased most from that choice.
3. **Watch out** — pick the `cons` item matching the pillar that decreased most.
4. **Net effect** — show the actual pillar deltas and the round's score change (recompute geometric-mean balance before/after).
5. **Verdict** — compare the five pillars: if the spread is wide, warn about the weakest pillar (geometric mean punishes it); if narrow, praise the balance.
6. **Consequence Watch** — if any `setsFlags` from this round gates/weights a future event (look it up in Decision-Tree Part B), surface a one-line foreshadow. This makes the cause→effect logic *felt*.

A **final Year 6 summary** expands this into the full City Report Card (already specced), now also listing the single best and worst decision of the whole game using the pros/cons.

**Teacher value:** the Year Summary is formative assessment in disguise — it tells each student, in plain English, which sustainability trade-off they got right or wrong, every single round.

---

## 3. Notation for the library below

Each event: **Scene** (story narration) → **Choices** with `plainLabel`, *what it means*, ✅ Pros, ❌ Cons. The action IDs/effects/flags are unchanged from `EVENT_DATABASE_SPEC.md` — match by order (A/B/C/D). Concept link is given per event.

---

## FOUNDING EVENT

### r1_founding — "The Founding Charter"
**Scene:** Your city is young, but it's growing fast — new families arrive every week and the bins are filling quicker than anyone expected. The council gathers for its very first big decision: *how should this city deal with its rubbish, as a rule?* Everyone is watching. Whatever you decide today will shape the roads, factories, habits and budgets of the city for years to come. There's no going back to a blank page after this.
*Concept: linear vs circular city — do you treat waste as rubbish to get rid of, or as a resource to reuse?*

**Choices:**
- **A) "Just bury it — keep it cheap"** — *Collect the rubbish and bury it in a tip. The simplest, cheapest way to start.*
  - ✅ Pros: Cheapest option, so you keep money for other things; quick and easy to set up; makes space problems disappear for now.
  - ❌ Cons: The land fills up and runs out; buried rubbish pollutes soil, air and water over time; you're building lazy "throw-it-away" habits that are hard to undo later.
- **B) "Burn it for electricity"** — *Build a high-tech furnace that burns rubbish and turns the heat into power.*
  - ✅ Pros: Shrinks the rubbish pile dramatically; makes electricity you can use or sell; needs far less land than a tip.
  - ❌ Cons: Expensive to build; the chimney emits pollution that worries nearby residents; you still have to deal with the toxic ash left behind.
- **C) "Sort and recycle it"** — *Ask people to separate their rubbish so materials can be recovered and sold or reused.*
  - ✅ Pros: Turns waste into useful materials and income; cuts pollution and saves land; builds a city that bounces back from shocks.
  - ❌ Cons: Costs more to set up; only works if residents actually sort properly; the payoff builds slowly, not overnight.
- **D) "Stop the waste before it starts"** — *Push to reduce packaging and throwaway goods so less rubbish is ever created.*
  - ✅ Pros: The most powerful fix — rubbish you prevent costs nothing to handle; biggest long-term win for the environment; positions you as a zero-waste leader.
  - ❌ Cons: The most expensive and slowest to show results; businesses and shoppers resist new rules; tight on the early budget.

---

## ROUND 1 — RANDOM EVENTS

### r1_packaging_boom — "The Convenience Trap"
**Scene:** Walk down any high street and everything is wrapped in plastic — fruit in trays, drinks in double layers, snacks in pouches inside boxes. Shops love it because shiny packaging sells, but your bins are overflowing overnight. Residents are starting to notice the mountains of wrapping on collection day.
*Concept: where waste comes from — affluence and convenience packaging.*
- **A) "Charge a small fee on excess packaging"** — *Make shops pay a little for wasteful wrapping, nudging them to use less.*
  - ✅ Pros: Cuts rubbish at the source; raises a bit of money; rewards shops that pack lightly.
  - ❌ Cons: Shops and shoppers grumble about higher prices; the benefit takes time to show.
- **B) "Run a 'bring your own bag/cup' campaign"** — *Encourage people to refuse single-use packaging voluntarily.*
  - ✅ Pros: Cheap and popular; builds good habits; no one feels forced.
  - ❌ Cons: Only some people join in; the effect is small and slow.
- **C) "Do nothing, just collect more"** — *Leave shops alone and keep picking up the extra rubbish.*
  - ✅ Pros: No backlash; keeps shops and shoppers happy today.
  - ❌ Cons: Rubbish keeps climbing; you've locked in a throwaway culture.

### r1_fast_fashion — "Built to be Binned"
**Scene:** Cheap gadgets and clothes are everywhere, and they're designed to be tossed, not fixed — when a phone battery dies, it's cheaper to buy a new phone than repair it. Landfills are filling with stuff that barely got used. People shrug; that's just how things are now.
*Concept: "built-in obsolescence" — products made to be replaced, driving endless waste.*
- **A) "Fund repair cafés and reuse shops"** — *Set up places where people can fix and re-sell things instead of binning them.*
  - ✅ Pros: Extends the life of products; creates local jobs and community; cuts waste meaningfully.
  - ❌ Cons: Costs money up front; only works if people choose to use them.
- **B) "Pass a 'right to repair' rule"** — *Force makers to design products that can actually be fixed.*
  - ✅ Pros: Tackles the root cause; long-lasting impact; popular with consumers.
  - ❌ Cons: Manufacturers lobby hard against it; takes time to bite.
- **C) "Just collect the extra rubbish"** — *Expand collection to cope with all the discarded goods.*
  - ✅ Pros: Keeps streets tidy now; no fight with industry.
  - ❌ Cons: Treats the symptom, not the cause; waste keeps rising.

### r1_food_delivery — "Lockdown Leftovers"
**Scene:** Food delivery has exploded — every meal arrives in a stack of plastic tubs, bags and cutlery. In just two months the city has buried the equivalent of dozens of bus-loads of extra plastic. It's convenient, but the bins tell the story.
*Concept: consumption habits spiking waste (the COVID delivery surge).*
- **A) "Launch a reusable container scheme"** — *Set up returnable tubs so meals don't need throwaway packaging.*
  - ✅ Pros: Cuts packaging waste for good; popular with eco-minded residents.
  - ❌ Cons: Needs a return-and-wash system to work; costs to run.
- **B) "Add recycling bins at food courts"** — *Put clearly-labelled bins where the takeaway waste is created.*
  - ✅ Pros: Captures materials if people sort right; relatively cheap.
  - ❌ Cons: Lots of food-soiled plastic can't be recycled; depends on sorting.
- **C) "Send it all to the tip"** — *Just bury the extra packaging.*
  - ✅ Pros: No effort or cost now.
  - ❌ Cons: Plastic lasts centuries; the tip fills faster.

### r1_new_suburb — "Edge City"
**Scene:** A brand-new neighbourhood is rising at the city's edge — homes are filling up before the bin lorries even have a route out there. Residents are already leaving bags on the kerb with nowhere for them to go. You can shape how this suburb deals with waste from day one.
*Concept: urban sprawl and getting services to the fringe.*
- **A) "Build full sorting + collection from day one"** — *Give the new suburb proper recycling and collection immediately.*
  - ✅ Pros: Designs good habits in from the start; future-proof; clean neighbourhood.
  - ❌ Cons: Most expensive option up front.
- **B) "Basic bin collection only"** — *Just send lorries to pick up mixed rubbish.*
  - ✅ Pros: Cheaper; gets the streets clean quickly.
  - ❌ Cons: Locks in throwaway habits; no recycling.
- **C) "Let residents sort it out themselves"** — *Leave the new suburb to manage its own waste for now.*
  - ✅ Pros: Saves money today.
  - ❌ Cons: Illegal dumping and resentment grow; harder to fix later.

### r1_collection_gap — "Streets of Refuse"
**Scene:** In the older, crowded districts the bin lorries simply can't keep up. Rubbish piles on corners, sometimes catching fire in the heat, and rats and flies are moving in. Families living there are getting sick, and they're angry.
*Concept: uncollected waste in fast-growing cities and its health toll.*
- **A) "Invest in more lorries and routes"** — *Expand the collection fleet to clear the backlog.*
  - ✅ Pros: Quickly removes the health hazard; visible improvement; residents relieved.
  - ❌ Cons: Costs money; you still have to dispose of all that waste somewhere.
- **B) "Hire local informal collectors"** — *Pay the people already collecting waste by cart to do it officially.*
  - ✅ Pros: Cheap and fast; boosts recycling and gives people fair work; uses local know-how.
  - ❌ Cons: Needs organising and support to be safe and fair.
- **C) "Leave it for now"** — *Don't act; focus the budget elsewhere.*
  - ✅ Pros: Saves money this year.
  - ❌ Cons: Disease spreads; water gets contaminated; residents lose trust in you.

### r1_recycling_pilot — "Sort It Out"
**Scene:** Your team proposes a city-wide scheme: give every household separate bins for paper, glass, plastic and food scraps, and make sorting the easy, normal thing to do. It could transform how the city handles waste — if people get on board.
*Concept: household recycling only works with real participation.*
- **A) "Full kerbside sorting for every home"** — *Roll out separate bins citywide and collect each stream.*
  - ✅ Pros: Big jump in recycling; recovers valuable materials; sets a circular foundation.
  - ❌ Cons: Expensive to launch; flops if households don't sort properly.
- **B) "Just set up drop-off points"** — *Place recycling banks around the city for people to use.*
  - ✅ Pros: Much cheaper; helps motivated recyclers.
  - ❌ Cons: Lower take-up; misses most households.
- **C) "Wait until the budget is healthier"** — *Delay recycling for now.*
  - ✅ Pros: Saves money today.
  - ❌ Cons: You lose early momentum and stay a throwaway city.

### r1_industrial_zone — "Factory Lines"
**Scene:** A new industrial park has opened, bringing jobs and tax money — and a flood of commercial and factory waste that's very different from household rubbish. Some of it is bulky, some hazardous, all of it lands on your disposal system.
*Concept: city waste is industrial and commercial, not just domestic.*
- **A) "Require factories to audit and reuse waste"** — *Make businesses track their waste and reuse what they can.*
  - ✅ Pros: Pushes industry to be circular; cuts the waste load; cleaner city.
  - ❌ Cons: Some firms complain about red tape.
- **B) "Charge factories a disposal fee"** — *Make businesses pay for what they throw away.*
  - ✅ Pros: Raises useful revenue; gives a mild nudge to waste less.
  - ❌ Cons: Some firms may cut corners or dump illegally.
- **C) "Take their waste into the general system"** — *Handle factory waste alongside household rubbish.*
  - ✅ Pros: Keeps businesses happy and attracts more.
  - ❌ Cons: Overloads your disposal; more pollution.

### r1_river_dumping — "Wrap and Throw"
**Scene:** With no proper sewers or collection in the poorest districts, people wrap their waste in paper and throw it straight into the river — the "wrap and throw" habit. The water downstream is turning foul, and the wells nearby are no longer safe to drink from.
*Concept: how dumping in water spreads pollution far downstream.*
- **A) "Build basic sanitation and collection"** — *Give these districts toilets, sewers and rubbish pickup.*
  - ✅ Pros: Fixes the real cause; protects health and clean water.
  - ❌ Cons: Expensive and takes time to build.
- **B) "Clean the river and run awareness drives"** — *Clear the waterway and teach people why dumping harms them.*
  - ✅ Pros: Visible quick win; shifts attitudes; fairly cheap.
  - ❌ Cons: The waste still needs somewhere proper to go.
- **C) "Tolerate it"** — *Do nothing about the river dumping.*
  - ✅ Pros: Costs nothing now.
  - ❌ Cons: Wells and the sea get poisoned; sickness spreads.

### r1_school_campaign — "Teach the Future"
**Scene:** Teachers want to bring waste and recycling into every classroom — turning kids into the city's keenest sorters and gentle nags at home. It won't show up in this year's numbers, but it could change the city's habits for a generation.
*Concept: attitudes and participation are what make recycling work.*
- **A) "City-wide schools programme"** — *Teach every school about reducing and sorting waste.*
  - ✅ Pros: Builds lasting recycling habits cheaply; lifts community spirit.
  - ❌ Cons: Slow to show in the metrics.
- **B) "One-off advertising campaign"** — *Run a short media push on recycling.*
  - ✅ Pros: Cheap; a small nudge.
  - ❌ Cons: Limited reach; fades fast.
- **C) "Skip it"** — *Don't invest in education.*
  - ✅ Pros: No cost.
  - ❌ Cons: Habits never shift; future recycling struggles.

### r1_ewaste_influx — "Digital Discards"
**Scene:** Old phones, laptops and chargers are piling up as people upgrade constantly. This "e-waste" is tricky — it's full of toxic metals, but also valuable materials worth recovering. Right now most of it is just getting tossed in with normal rubbish.
*Concept: e-waste as both a hazard and a recoverable resource ("urban mining").*
- **A) "Set up e-waste take-back and recovery"** — *Collect old electronics and recover the valuable metals inside.*
  - ✅ Pros: Recovers precious materials and income; keeps toxins out of the ground.
  - ❌ Cons: Costs to set up specialist handling.
- **B) "Open a hazardous-waste drop-off"** — *Give people a safe place to hand in dangerous items.*
  - ✅ Pros: Stops the worst contamination; simple.
  - ❌ Cons: Recovers less of the value.
- **C) "Mix it into normal rubbish"** — *Treat e-waste like any other waste.*
  - ✅ Pros: Cheapest, no effort.
  - ❌ Cons: Toxic metals leak into soil and water; valuable materials wasted.

---

## ROUND 2 — RUNNING OUT OF ROOM

### r2_landfill_full — "The Last Cell"
**Scene:** The city's main rubbish tip is nearly full — engineers reckon it has less than a year left. Finding new land near a crowded city is hard and unpopular, and the trucks keep rolling in every day. You need a plan before the gates are forced shut.
*Concept: cities are running out of landfill space.*
- **A) "Build a proper sealed landfill"** — *Construct a modern, lined tip that won't leak into the environment.*
  - ✅ Pros: Buys safe disposal space; far cleaner than an open tip.
  - ❌ Cons: Expensive; the space is still finite and will fill again.
- **B) "Open a cheap open dump"** — *Just start tipping rubbish on open ground.*
  - ✅ Pros: Instant relief; almost free.
  - ❌ Cons: Poisons land, air and water; fire and disease risk; haunts you for years.
- **C) "Cut the rubbish coming in with recycling"** — *Reduce how much waste needs burying in the first place.*
  - ✅ Pros: Tackles the real problem; sustainable long term.
  - ❌ Cons: Slower; needs spending and public participation.

### r2_open_dump_pressure — "The Cheap Option"
**Scene:** Budget hawks on the council are pushing hard for the cheapest fix: just dump it on open land and move on. It would save a fortune this year. But you've seen what open dumps do to the people who live near them.
*Concept: open dumping vs engineered disposal in poorer cities.*
- **A) "Refuse — pay for a proper sealed tip"** — *Spend more to protect health and the environment.*
  - ✅ Pros: Protects residents; the responsible long-term call; builds trust.
  - ❌ Cons: Strains the budget now.
- **B) "Approve the open dump"** — *Take the cheapest route.*
  - ✅ Pros: Big budget saving; instant capacity.
  - ❌ Cons: Severe pollution and health damage; a problem that grows every year.
- **C) "Compromise: controlled tipping with soil cover"** — *A halfway option — cover the rubbish daily but skip full engineering.*
  - ✅ Pros: Cheaper than full engineering; better than an open dump.
  - ❌ Cons: Still leaks and pollutes more than a sealed site.

### r2_semakau_offshore — "Island of Last Resort"
**Scene:** Engineers pitch something bold: a landfill built offshore, ringed with clay and waterproof lining, with its own plant to treat the toxic runoff so the sea stays clean. It's world-class — and it comes with a world-class price tag.
*Concept: a well-engineered landfill (the Semakau model) and why lining matters.*
- **A) "Fund the full sealed island tip"** — *Build it properly, borrowing money to do so.*
  - ✅ Pros: Best protection for the sea and groundwater; lots of safe capacity.
  - ❌ Cons: Heavy debt that drains future budgets.
- **B) "Build a cheaper unlined version"** — *Skip the expensive lining to save money.*
  - ✅ Pros: Cheaper; still adds capacity.
  - ❌ Cons: Toxic runoff threatens groundwater and the sea.
- **C) "Reject it — push recycling instead"** — *Avoid the landfill by cutting waste volume.*
  - ✅ Pros: No giant tip needed if you can reduce enough; cleaner path.
  - ❌ Cons: Risky if recycling can't keep up with the waste.

### r2_hinterland_protest — "Not in Our Backyard, Either"
**Scene:** For years you've trucked your rubbish out to a rural town that quietly took it. Now that town has had enough — its people are blockading the road, sick of bearing your city's waste. The lorries are backing up.
*Concept: "waste hinterlands" — the countryside that carries the city's burden.*
- **A) "Negotiate a fair deal with the town"** — *Share benefits and compensation so they'll keep helping.*
  - ✅ Pros: Keeps disposal flowing; fair and respectful; rebuilds goodwill.
  - ❌ Cons: Costs money to compensate them.
- **B) "Truck it even further away"** — *Find a more distant site to dump in.*
  - ✅ Pros: Solves it quickly without a fight.
  - ❌ Cons: More fuel, more emissions, higher cost — and the same problem elsewhere.
- **C) "Send them less by recycling more"** — *Shrink the waste you export.*
  - ✅ Pros: Eases the pressure for good; cuts your footprint.
  - ❌ Cons: Costs money and takes time to ramp up.

### r2_leachate_wells — "Poison in the Water"
**Scene:** Tests come back grim: a dark, toxic liquid is seeping out of your rubbish site and creeping toward the wells families drink from. Doctors are warning of risks to pregnant women and babies. The clock is ticking.
*Concept: leachate — the poisonous liquid that drips from rotting waste.*
- **A) "Build a runoff treatment plant"** — *Capture and clean the toxic liquid before it spreads.*
  - ✅ Pros: Stops the contamination directly; protects health.
  - ❌ Cons: Expensive to build and run.
- **B) "Hand out bottled water for now"** — *A stopgap while you decide what to do.*
  - ✅ Pros: Cheap; buys a little time.
  - ❌ Cons: Doesn't fix anything; pollution keeps spreading.
- **C) "Deny it and just monitor"** — *Downplay the problem and watch it.*
  - ✅ Pros: Costs almost nothing now.
  - ❌ Cons: People get sick; trust collapses; the legacy worsens.

### r2_methane_vent — "The Invisible Threat"
**Scene:** Deep in the rubbish mound, rotting food is releasing methane — an invisible gas that's both explosive and a powerful driver of climate change. Workers can smell it. One spark and the whole tip could catch fire for months.
*Concept: buried organic waste makes methane, a potent greenhouse gas.*
- **A) "Capture the gas and turn it into power"** — *Trap the methane and burn it for electricity.*
  - ✅ Pros: Turns a dangerous gas into useful energy and income; cuts emissions.
  - ❌ Cons: Costs money to install the system.
- **B) "Safely flare it off"** — *Burn the gas off in a controlled way.*
  - ✅ Pros: Removes the explosion risk; less harmful than letting it escape.
  - ❌ Cons: Wastes the energy; small ongoing cost.
- **C) "Leave it"** — *Do nothing about the gas.*
  - ✅ Pros: No spend.
  - ❌ Cons: Fire risk and powerful warming emissions remain.

### r2_transport_cost — "The Long Haul"
**Scene:** Your rubbish trucks are driving further and further to reach disposal sites, guzzling fuel and clogging roads. The fuel bill is ballooning and so are the exhaust fumes. Something has to give.
*Concept: hauling waste long distances adds cost and emissions to the footprint.*
- **A) "Build a local sorting/transfer station"** — *Set up a nearby hub so trucks travel less and materials get recovered.*
  - ✅ Pros: Cuts driving and fuel; recovers recyclables on the way.
  - ❌ Cons: Upfront building cost.
- **B) "Use smart route planning"** — *Optimise truck routes with technology.*
  - ✅ Pros: Saves fuel and money with little disruption.
  - ❌ Cons: Doesn't reduce the underlying waste volume.
- **C) "Accept the rising costs"** — *Keep hauling as is.*
  - ✅ Pros: No upfront spend.
  - ❌ Cons: Bleeds budget and emissions every year.

### r2_land_conflict — "Whose Land?"
**Scene:** A closed-off chunk of land beside the old tip has become a tug-of-war: developers want it for housing, locals want a park, and your team wants to keep it as a safety buffer. Everyone's lobbying you hard.
*Concept: land-use conflict around waste sites in crowded cities.*
- **A) "Turn the capped tip into a park"** — *Seal the old site safely and open green space on top.*
  - ✅ Pros: Old tips can become parks and pitches; big liveability win; popular.
  - ❌ Cons: Costs money; no revenue.
- **B) "Sell it to developers"** — *Cash in by allowing housing.*
  - ✅ Pros: Quick money for the city.
  - ❌ Cons: Homes near old contamination; residents angry.
- **C) "Keep it as a buffer"** — *Leave the land empty for safety.*
  - ✅ Pros: Safe and cautious.
  - ❌ Cons: Misses out on both money and amenity.

### r2_illegal_dumping — "Fly-Tipping"
**Scene:** Since disposal got pricier, piles of rubbish are appearing overnight on roadsides, empty lots and quiet lanes — people dodging the fees by dumping illegally. The blight is spreading and residents are furious.
*Concept: fees backfire into illegal dumping if there's no easy legal option.*
- **A) "Offer free drop-off plus enforcement"** — *Give people an easy legal option and fine those who still dump.*
  - ✅ Pros: Removes the reason to dump; cleans up; fair.
  - ❌ Cons: Costs to run both carrot and stick.
- **B) "Just hand out heavy fines"** — *Crack down with penalties alone.*
  - ✅ Pros: Cheap deterrent; raises some money.
  - ❌ Cons: Drives dumping underground if there's no easy alternative; resented.
- **C) "Ignore it"** — *Leave the fly-tipping alone.*
  - ✅ Pros: No cost.
  - ❌ Cons: Blight and contamination spread.

### r2_landfill_mining — "Digging Up the Past"
**Scene:** Someone proposes an unusual idea: dig up an old, settled rubbish tip, sift out the recyclable metals and plastics, and reclaim the land underneath for the growing city. It's part treasure hunt, part clean-up.
*Concept: "urban mining" — recovering materials and land from old tips.*
- **A) "Mine and clean up the old tip"** — *Excavate, recover materials, and restore the land.*
  - ✅ Pros: Wins back valuable land and materials; very circular.
  - ❌ Cons: Costly and disruptive to do.
- **B) "Just cap it and green it over"** — *Seal the old tip and plant over it.*
  - ✅ Pros: Cheaper; creates green space.
  - ❌ Cons: Materials stay buried and wasted.
- **C) "Leave the old site alone"** — *Do nothing with it.*
  - ✅ Pros: No spend.
  - ❌ Cons: Land and materials stay locked away.

---

## ROUND 3 — WASTE TO ENERGY?

### r3_incinerator_proposal — "Burn or Bury?"
**Scene:** With land tight, a proposal lands on your desk: a modern incinerator that could burn most of the city's rubbish, shrink it to a fraction, and generate electricity for thousands of homes. It sounds like magic — but the neighbours near the proposed site are already nervous about the smoke.
*Concept: the central trade-offs of incineration.*
- **A) "Build a big modern incinerator"** — *Construct a large furnace to burn rubbish and make power.*
  - ✅ Pros: Massively cuts the rubbish pile; generates electricity income; saves land.
  - ❌ Cons: Air pollution and health worries; fierce local opposition; heavy debt to build.
- **B) "Build a smaller waste-to-energy plant"** — *A more modest furnace with less impact.*
  - ✅ Pros: Lower pollution and cost; still recovers energy.
  - ❌ Cons: Handles less waste, so capacity relief is smaller.
- **C) "Don't burn — expand recycling instead"** — *Avoid incineration and grow recycling.*
  - ✅ Pros: Keeps the air clean and materials in use.
  - ❌ Cons: Slower to relieve the capacity crunch; needs participation.

### r3_nimby_protest — "Not Near My Home"
**Scene:** Residents near the plant are out in force with placards — worried about their children's lungs and their house prices. The science is debated, but the anger is real, and the local press is camped outside your office.
*Concept: NIMBY ("not in my back yard") and why public trust matters.*
- **A) "Be transparent and monitor health openly"** — *Share data and set up independent health checks to earn trust.*
  - ✅ Pros: Rebuilds public trust; reassures residents; fairer process.
  - ❌ Cons: Slows the project; costs money.
- **B) "Compensate the affected residents"** — *Pay nearby households to accept the plant.*
  - ✅ Pros: Buys acceptance quickly.
  - ❌ Cons: Doesn't reduce the actual pollution.
- **C) "Override the protest"** — *Push the project through regardless.*
  - ✅ Pros: Fast; keeps the timeline.
  - ❌ Cons: Poisons trust for every future decision; residents turn against you.

### r3_w2e_partnership — "Private Power"
**Scene:** A private energy company offers to build and run a waste-to-energy plant for you, taking on much of the cost. It's tempting — less spending for the city — but you'd be handing over control of how cleanly it's run.
*Concept: financing and the risks of privatising waste services.*
- **A) "Form a public-private partnership"** — *Share the cost and risk with the company.*
  - ✅ Pros: Spreads the cost; gets the plant built sooner.
  - ❌ Cons: You give up some control over emission standards.
- **B) "Build and run it publicly"** — *Keep full control by funding it yourself.*
  - ✅ Pros: You set the cleanliness standards; public keeps the benefits.
  - ❌ Cons: Full cost and heavy debt.
- **C) "Decline — stay with landfill + recycling"** — *Pass on the offer.*
  - ✅ Pros: No burning, no debt.
  - ❌ Cons: The capacity squeeze continues.

### r3_dioxin_study — "The Downwind Data"
**Scene:** A health study drops a bombshell: families living downwind of your incinerator show worrying health patterns. The findings are contested, but parents are scared and reporters want answers today.
*Concept: incineration's emissions and health risks.*
- **A) "Fit advanced pollution scrubbers"** — *Upgrade the plant to filter out the toxic emissions.*
  - ✅ Pros: Sharply cuts harmful pollution; protects health; restores confidence.
  - ❌ Cons: Costly upgrade.
- **B) "Tweak operating hours and wind timing"** — *Run the plant to minimise downwind exposure.*
  - ✅ Pros: Cheap; a small improvement.
  - ❌ Cons: The core pollution remains.
- **C) "Dispute the study"** — *Challenge the findings publicly.*
  - ✅ Pros: Costs nothing now.
  - ❌ Cons: Harms residents and your credibility.

### r3_ash_disposal — "What's Left Behind"
**Scene:** Burning rubbish doesn't make it vanish — it leaves behind piles of ash, some of it laced with toxic metals. That ash has to go somewhere, and right now it's stacking up at the plant.
*Concept: incineration leaves residue that still needs managing.*
- **A) "Treat the ash and reuse it in construction"** — *Make the ash safe and use it in building materials.*
  - ✅ Pros: Turns residue into a resource; saves landfill space.
  - ❌ Cons: Needs careful testing and treatment.
- **B) "Send ash to a sealed landfill"** — *Bury it safely in a lined site.*
  - ✅ Pros: Safe containment.
  - ❌ Cons: Eats up scarce landfill space.
- **C) "Dump the ash untreated"** — *Get rid of it the cheap way.*
  - ✅ Pros: Cheapest, easiest.
  - ❌ Cons: Toxic metals contaminate land and water.

### r3_energy_deal — "Selling the Spark"
**Scene:** The national grid offers to buy the electricity your plant produces. With energy prices where they are, this could turn your rubbish into a genuine money-spinner — if you lock in the right deal.
*Concept: energy recovery can offset incineration's costs.*
- **A) "Sign a long-term grid deal and reuse the heat"** — *Lock in steady electricity sales and capture waste heat too.*
  - ✅ Pros: Reliable income; squeezes maximum value from burning.
  - ❌ Cons: Upfront connection cost.
- **B) "Sell on the open market"** — *Sell power flexibly at market rates.*
  - ✅ Pros: Flexible income.
  - ❌ Cons: Exposed to price swings.
- **C) "Just power your own facilities"** — *Use the electricity internally.*
  - ✅ Pros: Modest savings.
  - ❌ Cons: No outside revenue.

### r3_emissions_cap — "The New Rules"
**Scene:** National regulators announce tough new air-quality limits. Every furnace in the country must clean up or face penalties, and your plant is on the list. The deadline is firm.
*Concept: regulating the toxic gases from burning waste.*
- **A) "Upgrade early to comply"** — *Invest now to meet the new standards.*
  - ✅ Pros: Protects health; future-proofs the plant.
  - ❌ Cons: Upfront cost.
- **B) "Buy compliance credits"** — *Pay to meet the rules on paper.*
  - ✅ Pros: Meets the law without rebuilding.
  - ❌ Cons: Doesn't cut your own pollution.
- **C) "Lobby for a delay"** — *Push to postpone the rules.*
  - ✅ Pros: Saves money short-term.
  - ❌ Cons: Pollution and reputational damage grow.

### r3_aging_plant — "Retrofit or Retire"
**Scene:** Your older incinerator is wheezing — inefficient and dirtier than modern ones. You can pour money into modernising it, keep limping along, or shut it and pivot to recycling.
*Concept: infrastructure ages, and the hierarchy favours cleaner options over time.*
- **A) "Retrofit it with modern technology"** — *Upgrade the old plant to run cleaner and better.*
  - ✅ Pros: Extends its life cleanly; better recovery.
  - ❌ Cons: Costs money.
- **B) "Run it as-is"** — *Keep using the old plant without upgrades.*
  - ✅ Pros: Cheap capacity now.
  - ❌ Cons: Gets dirtier each year.
- **C) "Retire it and shift to recycling"** — *Close the plant and grow recovery instead.*
  - ✅ Pros: Cleaner long-term path.
  - ❌ Cons: Loses capacity you must replace; costs to transition.

### r3_district_heating — "Warmth from Waste"
**Scene:** Engineers point out that the plant pumps out huge amounts of heat that's currently going to waste. Pipe it into homes and you could warm whole neighbourhoods cheaply — turning a by-product into a public good.
*Concept: recovering heat makes the system more circular (the Copenhagen model).*
- **A) "Build a district heating network"** — *Pipe the waste heat to warm homes across the city.*
  - ✅ Pros: Squeezes maximum value from burning; cuts heating emissions; warm, happy residents.
  - ❌ Cons: Expensive network to build (financed by debt).
- **B) "Heat public buildings only"** — *A smaller version warming schools and offices.*
  - ✅ Pros: Cheaper; still useful.
  - ❌ Cons: Limited reach.
- **C) "Let the heat escape"** — *Don't capture the heat.*
  - ✅ Pros: No spend.
  - ❌ Cons: Wastes free, useful energy.

### r3_carbon_market — "Credits for Methane"
**Scene:** A new carbon market lets you earn money by capturing greenhouse gases instead of releasing them. Your waste sites leak plenty — so cleaning them up could actually pay.
*Concept: the climate and financial value of cutting waste emissions.*
- **A) "Capture emissions and sell carbon credits"** — *Trap the gases and earn money for doing so.*
  - ✅ Pros: Makes cutting emissions profitable; reinforces good behaviour.
  - ❌ Cons: Setup cost.
- **B) "Capture only, don't trade"** — *Cut the emissions without entering the market.*
  - ✅ Pros: Clear environmental gain.
  - ❌ Cons: No income from it.
- **C) "Skip it"** — *Do nothing.*
  - ✅ Pros: No spend.
  - ❌ Cons: You forgo both emission cuts and revenue.

---

## ROUND 4 — THE FOOTPRINT BILL

### r4_ecological_deficit — "Beyond Our Means"
**Scene:** The numbers are in: your city is now consuming far more land, water and resources than the surrounding region can naturally replace. You're effectively living on credit borrowed from nature — and the bill is coming due in the form of damage near and far.
*Concept: ecological footprint vs biocapacity — using more nature than the land can renew.*
- **A) "Launch a city-wide 'consume less' strategy"** — *Cut the city's overall demand for resources and goods.*
  - ✅ Pros: Tackles the root cause; biggest environmental win; positions you as a leader.
  - ❌ Cons: Politically hard; squeezes the economy short-term.
- **B) "Offset with green infrastructure"** — *Plant and restore nature to rebuild local capacity.*
  - ✅ Pros: Restores some of nature's balance; popular green spaces.
  - ❌ Cons: Doesn't reduce the underlying demand.
- **C) "Keep importing and emitting"** — *Carry on as normal.*
  - ✅ Pros: No change or cost now.
  - ❌ Cons: The deficit deepens; damage piles up elsewhere.

### r4_forest_encroach — "Eating the Forest"
**Scene:** The city keeps sprawling outward, and the bulldozers are now at the forest edge. Clearing it would free land for growth — but it would wipe out rare wildlife and release a huge amount of stored carbon into the air.
*Concept: sprawl, habitat loss and the carbon cost of clearing forest.*
- **A) "Set a green belt and build upward instead"** — *Protect the forest and grow the city densely, not outward.*
  - ✅ Pros: Saves habitat and carbon; curbs sprawl.
  - ❌ Cons: Limits cheap outward growth; politically tricky.
- **B) "Allow it but buy conservation offsets"** — *Permit clearing while funding protection elsewhere.*
  - ✅ Pros: Some compensation for the loss.
  - ❌ Cons: The local forest still goes.
- **C) "Let the city expand into the forest"** — *Clear the land for growth.*
  - ✅ Pros: Fuels growth and revenue.
  - ❌ Cons: Destroys biodiversity and releases stored carbon.

### r4_sand_mining — "Concrete Hunger"
**Scene:** Your building boom is devouring sand, stone and metal, ripped from rivers and hillsides that are already fragile. The construction never stops, and neither does the digging.
*Concept: resource extraction strains ecosystems.*
- **A) "Require recycled building materials"** — *Make construction reuse crushed concrete and salvaged materials.*
  - ✅ Pros: Cuts fresh digging and its damage; very circular.
  - ❌ Cons: Costs to set up; some builders resist.
- **B) "Demand certified, responsible sourcing"** — *Insist materials come from better-managed sources.*
  - ✅ Pros: Reduces the worst harm.
  - ❌ Cons: Doesn't cut overall demand.
- **C) "Extract freely"** — *Let the digging continue unchecked.*
  - ✅ Pros: Cheapest building.
  - ❌ Cons: Wrecks rivers and land.

### r4_water_stress — "Drawing Down the Wells"
**Scene:** The city is pumping groundwater faster than the rains can refill it. Wells are dropping, and in a few years the taps could run dry if nothing changes.
*Concept: depleting aquifers to feed a growing city.*
- **A) "Recycle water and fix the leaks"** — *Reuse water and stop wasting it through leaky pipes.*
  - ✅ Pros: Closes the water loop; eases the strain on wells.
  - ❌ Cons: Upfront cost.
- **B) "Charge more to discourage waste"** — *Use pricing to curb overuse.*
  - ✅ Pros: Effective at cutting demand; raises revenue.
  - ❌ Cons: Unpopular, especially with poorer residents.
- **C) "Just drill more wells"** — *Tap more groundwater to meet demand.*
  - ✅ Pros: Meets demand now.
  - ❌ Cons: Speeds up the depletion.

### r4_food_imports — "Feeding the City"
**Scene:** Your city's food now travels from ever further away, arriving wrapped in packaging and trailing emissions. Meanwhile, all the nutrients in that food leave the city as waste, never returning to any soil.
*Concept: the food hinterland and broken nutrient cycles.*
- **A) "Grow food locally and compost the scraps"** — *Set up urban farms and return food waste to the soil.*
  - ✅ Pros: Shortens supply chains; returns nutrients to the land; very circular.
  - ❌ Cons: Costs to establish.
- **B) "Incentivise local sourcing"** — *Encourage shops to buy from nearby farms.*
  - ✅ Pros: Trims the food footprint a bit.
  - ❌ Cons: Modest effect.
- **C) "Rely on distant imports"** — *Keep importing food from afar.*
  - ✅ Pros: Convenient.
  - ❌ Cons: High emissions; nutrients lost as waste.

### r4_new_capital — "The Greenfield Gamble"
**Scene:** Politicians are excited by a grand plan: build a shiny new satellite city on untouched land. It promises growth and prestige — but it means clearing vast wilderness and locking in decades of new resource demand.
*Concept: building new cities from scratch and the environmental cost.*
- **A) "Reject it — build up the existing city"** — *Grow what you have rather than clearing new land.*
  - ✅ Pros: Avoids destroying wilderness; more efficient.
  - ❌ Cons: Less glamorous; politically unpopular.
- **B) "Build it to strict green standards"** — *Allow the new city but with tough environmental rules.*
  - ✅ Pros: Growth with some protection.
  - ❌ Cons: Still clears land; expensive.
- **C) "Build it cheap and fast"** — *Rush the new city up to maximise growth.*
  - ✅ Pros: Maximum growth and revenue.
  - ❌ Cons: Maximum ecological destruction.

### r4_packaging_tax_push — "Tax the Trash"
**Scene:** Pressure is mounting to hit packaging and throwaway goods with a tax, forcing waste down at the source. It's proven to work elsewhere — but businesses are lobbying hard and shoppers don't love new charges.
*Concept: "polluter pays" — taxing waste to cut it at source.*
- **A) "Bring in a strong packaging tax"** — *Tax disposable packaging firmly to slash waste.*
  - ✅ Pros: Powerful long-term waste cut; drives recycling; raises revenue.
  - ❌ Cons: Immediate political and economic pain; public pushback.
- **B) "Phase in a modest levy"** — *Introduce a gentler tax gradually.*
  - ✅ Pros: More acceptable; eases people in.
  - ❌ Cons: Smaller effect.
- **C) "No tax"** — *Leave packaging untaxed.*
  - ✅ Pros: Avoids backlash.
  - ❌ Cons: Waste keeps growing.

### r4_carbon_emissions — "The Climate Ledger"
**Scene:** Your city's emissions — from bin lorries, dumps and furnaces — are climbing on the national climate scorecard. The spotlight is turning toward you to clean up the waste sector.
*Concept: the waste sector's greenhouse-gas emissions.*
- **A) "Switch to clean vehicles and capture emissions"** — *Decarbonise the waste fleet and trap emissions.*
  - ✅ Pros: Cuts emissions at the source; modernises the system.
  - ❌ Cons: Investment needed.
- **B) "Buy carbon offsets"** — *Pay to balance your emissions elsewhere.*
  - ✅ Pros: Neutral on paper.
  - ❌ Cons: Doesn't change your own system.
- **C) "Carry on as normal"** — *Take no action.*
  - ✅ Pros: No cost.
  - ❌ Cons: Emissions and climate exposure grow.

### r4_invasive_species — "Unwanted Guests"
**Scene:** The disturbed, polluted land ringing the city has become a foothold for aggressive invasive plants and pests that are crowding out native wildlife. The damaged edges of your city are spreading the problem.
*Concept: how sprawl and degradation let invasive species take over.*
- **A) "Run a habitat restoration programme"** — *Rebuild native ecosystems to push back the invaders.*
  - ✅ Pros: Restores biodiversity and resilience.
  - ❌ Cons: Costs money.
- **B) "Targeted control only"** — *Tackle the worst invasive hotspots.*
  - ✅ Pros: Holds the line cheaply.
  - ❌ Cons: Doesn't restore the habitat.
- **C) "Ignore it"** — *Leave nature to fend for itself.*
  - ✅ Pros: No spend.
  - ❌ Cons: Native wildlife keeps disappearing.

### r4_repair_economy — "Mend, Don't End"
**Scene:** A grassroots movement of menders, tinkerers and second-hand sellers is booming, and they want the city's backing to grow. They could help wean the city off its buy-new-throw-away habit.
*Concept: reuse and the circular economy.*
- **A) "Fund a city-wide reuse economy"** — *Back repair, resale and remanufacturing across the city.*
  - ✅ Pros: Builds a lasting circular culture and local jobs; cuts waste.
  - ❌ Cons: Costs to support.
- **B) "Support a few flagship repair cafés"** — *Help a handful of showcase projects.*
  - ✅ Pros: Cheap; builds momentum.
  - ❌ Cons: Limited scale.
- **C) "Leave it to the market"** — *Don't get involved.*
  - ✅ Pros: No spend.
  - ❌ Cons: The throwaway culture persists.

---

## ROUND 5 — PEOPLE & LIVELIHOODS

### r5_zabbaleen — "The Recyclers Nobody Sees"
**Scene:** Thousands of people in your city already make a living picking through rubbish, recovering and selling materials by hand. They recycle more than your official system does — but they work in filth, without protection, pay or recognition. Their future is in your hands.
*Concept: informal recyclers and the social side of sustainability.*
- **A) "Bring them into the official system"** — *Give informal pickers safe conditions, fair pay and a real role.*
  - ✅ Pros: Cheap boost to recycling; gives people dignity, safety and income; a social and green win.
  - ❌ Cons: Needs organising and some funding.
- **B) "License them but don't support them"** — *Recognise them without investing in their safety.*
  - ✅ Pros: Acknowledges their role cheaply.
  - ❌ Cons: They still work in unsafe conditions.
- **C) "Clear them out"** — *Remove the informal pickers from the streets.*
  - ✅ Pros: A "tidier", more formal-looking city.
  - ❌ Cons: Destroys livelihoods and a big chunk of your recycling; people turn against you.

### r5_slum_no_collection — "The Unserved"
**Scene:** In the informal settlements, no bin lorry has ever come. Rubbish piles between the homes, children play beside it, and disease is never far away. These residents are part of your city too — but they've been forgotten.
*Concept: service gaps in slums and liveable cities for all (SDG 11).*
- **A) "Set up community-run collection"** — *Help residents organise their own local waste service.*
  - ✅ Pros: Affordable; improves health and inclusion; empowers the community.
  - ❌ Cons: Needs setting up and ongoing support.
- **B) "Place communal skips"** — *Drop large shared bins in the settlements.*
  - ✅ Pros: A cheap basic improvement.
  - ❌ Cons: Limited reach; no sorting.
- **C) "Leave it unserved"** — *Don't extend service there.*
  - ✅ Pros: Saves money.
  - ❌ Cons: Entrenches inequality; disease risk soars; trust falls.

### r5_disease_outbreak — "Vectors"
**Scene:** It's happened: rotting, uncollected rubbish has bred swarms of mosquitoes and rats, and now dengue and cholera are sweeping through a district. Hospitals are filling. People are demanding to know why their warnings were ignored.
*Concept: waste as a public-health emergency.*
- **A) "Launch an emergency clean-up and pest control"** — *Clear the waste and wipe out the breeding grounds fast.*
  - ✅ Pros: Stops the outbreak at its source; saves lives; clears the legacy.
  - ❌ Cons: Costly emergency spending.
- **B) "Treat the sick only"** — *Focus on medical care without clearing the cause.*
  - ✅ Pros: Helps patients now.
  - ❌ Cons: The breeding grounds remain; it'll recur.
- **C) "Downplay it"** — *Minimise the crisis publicly.*
  - ✅ Pros: Cheapest.
  - ❌ Cons: The epidemic and public anger spread.

### r5_scavenger_tragedy — "Collapse at the Dump"
**Scene:** Disaster strikes: a towering rubbish mound collapses (or catches fire), and the people who live and work on it are caught in it. The tragedy makes headlines, and the world sees the human cost of your city's waste.
*Concept: the deadly dangers of open dumps and waste-picking.*
- **A) "Close the dump, relocate and retrain the pickers"** — *Shut the dangerous site and give the workers safe new livelihoods.*
  - ✅ Pros: Ends the danger; offers dignity and a fresh start; rebuilds trust.
  - ❌ Cons: Costly; you must replace the lost disposal capacity.
- **B) "Add safety measures, keep it open"** — *Make the dump a bit safer but keep using it.*
  - ✅ Pros: Reduces risk somewhat; keeps capacity.
  - ❌ Cons: The fundamental hazard remains.
- **C) "Carry on as before"** — *Take no action.*
  - ✅ Pros: No cost.
  - ❌ Cons: More deaths and pollution; reputational disaster.

### r5_child_labour — "Lost Schooldays"
**Scene:** Many of the waste-pickers are children, sorting rubbish for family income instead of sitting in classrooms. Every day on the dump is a day not in school — and a future quietly slipping away.
*Concept: how waste-picking traps families and steals education.*
- **A) "Offer schooling plus family stipends"** — *Pay families so children can go to school instead of picking waste.*
  - ✅ Pros: Breaks the poverty cycle; gets kids into school.
  - ❌ Cons: Ongoing cost.
- **B) "Ban child picking and enforce it"** — *Make it illegal for children to work the dumps.*
  - ✅ Pros: Right in principle.
  - ❌ Cons: Removes family income without offering an alternative.
- **C) "Ignore it"** — *Take no action.*
  - ✅ Pros: No cost.
  - ❌ Cons: Poverty passes to the next generation.

### r5_coop_formation — "Strength in Numbers"
**Scene:** The recyclers you've supported want to band together into a cooperative — pooling their materials, getting fair prices, and supplying local workshops. With a little backing, they could become a real engine of the circular economy.
*Concept: cooperatives turning informal recovery into stable circular supply chains.*
- **A) "Back the co-op and link it to industry"** — *Help them organise and connect them to buyers and workshops.*
  - ✅ Pros: Turns picking into a stable, fair circular business; steady recycling supply.
  - ❌ Cons: Some funding and coordination needed.
- **B) "Provide equipment only"** — *Give them tools but no market links.*
  - ✅ Pros: A useful, cheap boost.
  - ❌ Cons: Misses the bigger opportunity.
- **C) "Decline"** — *Don't support the cooperative.*
  - ✅ Pros: No spend.
  - ❌ Cons: Misses a cheap circularity win.

### r5_green_exchange — "Trash for Tokens"
**Scene:** Inspired by a famous scheme abroad, you could let residents swap sorted recyclables for bus tickets or fresh food. It makes recycling rewarding — and it especially helps poorer families who need the tokens most.
*Concept: incentive schemes (the Curitiba Green Exchange).*
- **A) "Launch a 'recycle for tokens' scheme"** — *Let people trade sorted waste for bus tickets or food.*
  - ✅ Pros: Huge boost to participation; helps low-income families; popular and effective.
  - ❌ Cons: Costs to run the rewards.
- **B) "Pay cash for recyclables"** — *Buy back sorted materials for money.*
  - ✅ Pros: Works for many people.
  - ❌ Cons: Less community spirit than tokens.
- **C) "Make sorting mandatory, no reward"** — *Force people to sort without any incentive.*
  - ✅ Pros: Cheap.
  - ❌ Cons: Resented; low real participation.

### r5_gender_health — "The Women at the Sorting Line"
**Scene:** Much of the hand-sorting is done by women and children at home, with bare hands and no masks, surrounded by hazardous waste. They keep the system running while quietly paying for it with their health.
*Concept: worker health and equity in the social dimension of sustainability.*
- **A) "Provide protective gear, clinics and safe facilities"** — *Give the workers safety equipment and healthcare.*
  - ✅ Pros: Protects the most exposed people; real dignity for modest cost.
  - ❌ Cons: Ongoing cost.
- **B) "Offer health screening only"** — *Check workers' health without changing conditions.*
  - ✅ Pros: Detects problems early.
  - ❌ Cons: Doesn't prevent the harm.
- **C) "Do nothing"** — *Leave conditions as they are.*
  - ✅ Pros: No cost.
  - ❌ Cons: Preventable illness continues.

### r5_eviction_pressure — "Cleared Out"
**Scene:** Developers are lobbying hard to bulldoze a waste-pickers' settlement and put up new buildings. It would mean quick development cash — but it would scatter a community that quietly recycles much of your city.
*Concept: displacement of the urban poor vs incorporating them.*
- **A) "Refuse and protect them"** — *Block the eviction and formally integrate the community.*
  - ✅ Pros: Keeps recycling and community intact; the just choice.
  - ❌ Cons: Foregoes development cash; some funding needed.
- **B) "Relocate them with support"** — *Move the community but help them resettle.*
  - ✅ Pros: A more humane move.
  - ❌ Cons: Disrupts their established recycling networks.
- **C) "Allow the eviction"** — *Let developers clear the site.*
  - ✅ Pros: Quick development gain.
  - ❌ Cons: Recycling and trust collapse; livelihoods destroyed.

### r5_community_composting — "Back to the Soil"
**Scene:** Neighbourhoods want to turn their food scraps and garden clippings into compost for local gardens, instead of sending heavy, smelly organics to the tip where they rot and leak methane. It's simple, local and satisfying.
*Concept: composting organics closes the natural nutrient loop.*
- **A) "Roll out community composting"** — *Help neighbourhoods compost their organic waste locally.*
  - ✅ Pros: Diverts heavy waste; cuts methane; returns nutrients to soil; very circular.
  - ❌ Cons: Needs some setup and participation.
- **B) "Build a central composting facility"** — *Compost the city's organics at one big plant.*
  - ✅ Pros: Efficient at scale.
  - ❌ Cons: Less community involvement; costs more.
- **C) "Keep organics in the tip"** — *Bury food and garden waste as usual.*
  - ✅ Pros: No effort.
  - ❌ Cons: It rots into methane and fills the tip.

---

## ROUND 6 — ZERO-WASTE VISION

### r6_polluter_pays — "The Danish Model"
**Scene:** It's the final stretch, and you can pass a landmark law: make those who create waste pay for it, taxing dumping heavily and rewarding recycling. Done right, it could reshape the city's habits for good — but it's a political fight.
*Concept: comprehensive "polluter pays" taxation (the Denmark model).*
- **A) "Pass a full polluter-pays law"** — *Tax waste creation hard, with the highest charges on dumping.*
  - ✅ Pros: Powerful, lasting push toward recycling and reduction; defines your legacy.
  - ❌ Cons: Politically costly; short-term economic pain.
- **B) "Bring in a disposal tax only"** — *Tax dumping and burning, more gently.*
  - ✅ Pros: Nudges waste up the hierarchy without full reform.
  - ❌ Cons: Smaller impact.
- **C) "No new tax"** — *Leave waste untaxed.*
  - ✅ Pros: Avoids backlash.
  - ❌ Cons: Misses the chance to lock in a circular city.

### r6_zero_waste_pledge — "Aiming for Zero"
**Scene:** You can commit the city to a bold, binding goal: send almost nothing to landfill, like the world's leading "zero-waste" cities. It's a statement of ambition that will demand real investment to back it up.
*Concept: zero-waste-city targets (Copenhagen, Yokohama).*
- **A) "Commit to a binding zero-waste roadmap"** — *Set a legal target to virtually eliminate landfilling.*
  - ✅ Pros: A clear circular trajectory; inspiring and credible if backed up.
  - ❌ Cons: Demands sustained investment and public buy-in.
- **B) "Set a voluntary aspiration"** — *Announce a goal without binding teeth.*
  - ✅ Pros: Signals intent cheaply.
  - ❌ Cons: Weak follow-through.
- **C) "Reject it as unrealistic"** — *Don't make the pledge.*
  - ✅ Pros: Pragmatic.
  - ❌ Cons: Forgoes the circular prize.

### r6_circular_industry — "Industrial Symbiosis"
**Scene:** Your factories could be linked so that one company's waste becomes another's raw material — a clever web where almost nothing is thrown away. It takes coordination, but it could make your industry world-leading in circularity.
*Concept: industrial symbiosis and the technical materials cycle.*
- **A) "Build an eco-industrial park"** — *Cluster industries so they swap and reuse each other's by-products.*
  - ✅ Pros: Creates closed material loops and local value; cutting-edge.
  - ❌ Cons: Needs coordination and investment.
- **B) "Set up a by-product exchange platform"** — *A lighter system matching waste to firms that can use it.*
  - ✅ Pros: Lower-cost matchmaking for waste-as-resource.
  - ❌ Cons: Less impact than a full park.
- **C) "Keep the status quo"** — *Leave industry as is.*
  - ✅ Pros: No spend.
  - ❌ Cons: Industrial materials stay wasteful.

### r6_deposit_law — "Return and Refund"
**Scene:** A deposit-return law would add a small refundable charge to every bottle and can — pay it at purchase, get it back when you return the empty. Where it's been tried, return rates have soared.
*Concept: deposit-return schemes driving reuse and recycling.*
- **A) "Pass a full deposit-return law"** — *Add refundable deposits to drinks containers citywide.*
  - ✅ Pros: Proven, popular, high return rates; strong all-rounder.
  - ❌ Cons: Needs collection infrastructure.
- **B) "Pilot it in one district"** — *Test the scheme small-scale first.*
  - ✅ Pros: Low-risk trial.
  - ❌ Cons: Limited reach.
- **C) "Rely on voluntary recycling"** — *Skip the deposit.*
  - ✅ Pros: No new system.
  - ❌ Cons: Return rates stay low.

### r6_landfill_ban — "Close the Hole"
**Scene:** You can ban dumping anything that could be recycled or burned instead — forcing the city to choose better options. It only works because you've built the alternatives; now you can shut the easy escape hatch.
*Concept: banning landfilling of recyclable/combustible waste.*
- **A) "Ban landfilling of recyclables and combustibles"** — *Forbid dumping anything that can be recovered.*
  - ✅ Pros: Forces waste up the hierarchy; saves scarce land.
  - ❌ Cons: Only works if you've built the alternatives.
- **B) "Phase the ban in by material"** — *Ban materials one at a time.*
  - ✅ Pros: A smoother, gradual transition.
  - ❌ Cons: Slower to take effect.
- **C) "No ban"** — *Keep landfilling allowed.*
  - ✅ Pros: Keeps the easy option open.
  - ❌ Cons: Circular progress stalls.

### r6_green_jobs — "The Circular Workforce"
**Scene:** A circular economy needs people who can repair, sort, recover and remanufacture — so you can invest in training a whole new green workforce. It's a chance to make sustainability a source of good jobs.
*Concept: the jobs and skills a circular economy creates.*
- **A) "Launch a city-wide green-skills programme"** — *Train residents for repair, recycling and remanufacturing jobs.*
  - ✅ Pros: Builds the workforce circularity needs; lifts livelihoods.
  - ❌ Cons: Training costs.
- **B) "Subsidise circular start-ups"** — *Fund new businesses in the circular economy.*
  - ✅ Pros: Seeds innovation.
  - ❌ Cons: Narrower than broad training.
- **C) "No programme"** — *Don't invest in skills.*
  - ✅ Pros: No spend.
  - ❌ Cons: The transition lacks skilled workers.

### r6_producer_responsibility — "Make Makers Pay"
**Scene:** Why should the city foot the bill for disposing of products companies sell? An "extended producer responsibility" law would make manufacturers pay to handle their goods at end of life — and design them to be recyclable in the first place.
*Concept: extended producer responsibility (EPR).*
- **A) "Bring in full producer responsibility"** — *Make manufacturers fund the end-of-life of what they sell.*
  - ✅ Pros: Shifts cost and design incentives onto producers; less burden on the city.
  - ❌ Cons: Industry friction.
- **B) "Apply it to packaging and electronics only"** — *Target the worst waste streams first.*
  - ✅ Pros: Tackles the biggest problems.
  - ❌ Cons: Narrower scope.
- **C) "Decline"** — *Don't introduce EPR.*
  - ✅ Pros: Avoids industry fights.
  - ❌ Cons: The city keeps paying the bill.

### r6_citizen_referendum — "Putting It to the People"
**Scene:** You decide to put a new waste levy to a public vote — a real test of whether the city trusts you. If you've earned their faith over the years, they'll back it; if not, this could backfire.
*Concept: public trust and participation in waste policy.*
- **A) "Campaign honestly for the levy"** — *Make the open, transparent case to voters.*
  - ✅ Pros: Wins lasting public consent; easier if you've built trust.
  - ❌ Cons: Risky if trust is already low.
- **B) "Water it down to ensure it passes"** — *Offer a weaker version voters will accept.*
  - ✅ Pros: Likely to pass.
  - ❌ Cons: Weaker measure, smaller impact.
- **C) "Skip the vote and impose it"** — *Bring in the levy without asking.*
  - ✅ Pros: Fast.
  - ❌ Cons: Deepens distrust and future resistance.

### r6_smart_waste — "Pay As You Throw"
**Scene:** New technology lets you charge households by exactly how much rubbish they throw out, with smart bins tracking it. People who waste less pay less — a direct, personal incentive to cut down. You just have to keep it fair.
*Concept: pay-as-you-throw pricing and smart waste tech.*
- **A) "Roll out smart bins and pay-as-you-throw"** — *Charge each household by how much waste they produce.*
  - ✅ Pros: Strong personal incentive to reduce and sort; data-driven.
  - ❌ Cons: Must be designed carefully so it's fair to poorer households.
- **B) "Use smart bins for monitoring only"** — *Track waste without charging by volume.*
  - ✅ Pros: Improves logistics.
  - ❌ Cons: Doesn't change behaviour much.
- **C) "No new tech"** — *Carry on without it.*
  - ✅ Pros: No spend.
  - ❌ Cons: Misses the data and incentive gains.

### r6_legacy_review — "The Final Audit"
**Scene:** As your term ends, an independent review weighs up what kind of city you've built — one that treats waste as a resource and thrives, or one still stuck in the throwaway mindset. The verdict will define your legacy.
*Concept: linear vs circular city as the city's lasting identity.*
- **A) "Publish the results and commit to keep improving"** — *Be transparent and lock in continuous improvement.*
  - ✅ Pros: Cements a circular path and accountability; pays off most for circular cities.
  - ❌ Cons: Invites scrutiny; small cost.
- **B) "Hold a quiet internal review"** — *Keep the review low-key.*
  - ✅ Pros: Low effort.
  - ❌ Cons: Little momentum or learning.
- **C) "Declare success and move on"** — *Skip honest reflection.*
  - ✅ Pros: Avoids scrutiny.
  - ❌ Cons: No learning; trust dips.

---

## TEACHER WORLD EVENTS — scenes, plain choices & pros/cons

Each world event shares the same 3-response pattern (**A) Invest to mitigate · B) Adapt cheaply · C) Absorb it**). The pros/cons below cover that pattern; the *outcome* still depends on the city's flags (the conditional effects in `EVENT_DATABASE_SPEC.md`), which the Year Summary will surface as "your past choices helped/hurt here."

### W1 — Recyclables Market Crash
**Scene:** Overnight, the global price of recycled materials collapses — buyers vanish and your recycling suddenly costs money instead of earning it. Cities everywhere are scrambling.
- **A) "Stockpile and ride it out"** (invest) — *Store materials until prices recover.* ✅ Protects long-term recycling; signals commitment. ❌ Costs money to store; ties up budget.
- **B) "Pause some recycling temporarily"** (adapt) — *Scale back the costliest collections for now.* ✅ Saves money short-term. ❌ Habits and circularity slip.
- **C) "Absorb the loss"** — *Keep going and eat the cost.* ✅ No disruption to residents. ❌ Budget takes a real hit, worst if you rely heavily on recycling income.

### W2 — National Carbon / Landfill Tax
**Scene:** The government slaps steep new taxes on dumping and burning waste. Suddenly the cheap disposal options aren't cheap anymore.
- **A) "Fast-track recycling and reduction"** (invest) — *Shift away from taxed disposal quickly.* ✅ Dodges the tax; future-proof. ❌ Upfront cost.
- **B) "Pass costs to residents"** (adapt) — *Raise fees to cover the tax.* ✅ Keeps the budget steady. ❌ Unpopular.
- **C) "Keep dumping and pay the tax"** — *Carry on and absorb the charges.* ✅ No change needed. ❌ Expensive, especially for dump/landfill-reliant cities.

### W3 — Consumption Surge (COVID-style)
**Scene:** A sudden crisis sends home-delivery and packaging through the roof; rubbish volumes spike almost overnight.
- **A) "Surge collection + emergency sorting"** (invest) — *Scale up fast to cope.* ✅ Keeps the city clean; prevents overflow. ❌ Expensive crash response.
- **B) "Temporary extra bins"** (adapt) — *Quick, cheap capacity.* ✅ Cheap stopgap. ❌ Limited; lots ends up unsorted.
- **C) "Let it pile up"** — *Absorb the surge.* ✅ No spend. ❌ Capacity overwhelmed, worst if you have little headroom.

### W4 — Landfill Fire
**Scene:** A rubbish mountain ignites and burns for weeks, blanketing neighbourhoods in toxic smoke. The whole city is watching the air turn grey.
- **A) "Full firefighting + air monitoring"** (invest) — *Put it out and protect residents.* ✅ Limits the health and air damage. ❌ Costly emergency.
- **B) "Contain and wait"** (adapt) — *Limit spread cheaply.* ✅ Lower cost. ❌ Smoke and harm linger.
- **C) "Let it burn out"** — *Absorb the disaster.* ✅ No spend. ❌ Severe health and environment hit — catastrophic for dump-reliant cities; engineered landfills fare far better.

### W5 — Heatwave & Drought
**Scene:** A brutal heatwave and water shortage grip the region, hitting hardest where the environment is already degraded.
- **A) "Emergency greening + water measures"** (invest) — *Cool and water-proof the city.* ✅ Eases the stress; builds resilience. ❌ Costly.
- **B) "Targeted relief"** (adapt) — *Help the worst-hit areas only.* ✅ Cheaper. ❌ Partial.
- **C) "Endure it"** — *Absorb the heat.* ✅ No spend. ❌ Health and environment suffer, worst for high-footprint, polluted cities.

### W6 — Monsoon Flooding
**Scene:** Heavy rains hit — and where rubbish has clogged the drains, streets turn into filthy rivers. Clean systems cope; choked ones don't.
- **A) "Clear drains + flood defences"** (invest) — *Unclog and protect.* ✅ Prevents flooding and disease. ❌ Costly works.
- **B) "Emergency pumping"** (adapt) — *React when it floods.* ✅ Cheaper. ❌ Reactive, not preventive.
- **C) "Ride it out"** — *Absorb the floods.* ✅ No spend. ❌ Floods and contamination hit hard, worst for linear/dumping cities.

### W7 — Zero-Waste Grant
**Scene:** A national fund offers grants to cities pushing circular waste solutions. Free money — if you've been moving in the right direction.
- **A) "Bid big and co-invest"** (invest) — *Match the grant to scale up circular projects.* ✅ Multiplies the funding; accelerates circularity (huge for circular cities). ❌ Requires matching spend.
- **B) "Take the basic grant"** (adapt) — *Accept the no-strings portion.* ✅ Easy money. ❌ Smaller benefit.
- **C) "Don't bother"** — *Skip the application.* ✅ No effort. ❌ Misses free funding.

### W8 — Plastic Import Ban
**Scene:** International rules tighten and you can no longer ship waste abroad. Everything you generate now has to be handled at home.
- **A) "Build domestic recycling capacity"** (invest) — *Process it yourself.* ✅ Self-reliant; boosts circularity (easy if you already recycle). ❌ Costs to build.
- **B) "Find new export routes"** (adapt) — *Ship elsewhere.* ✅ Quick fix. ❌ Temporary; just moves the problem.
- **C) "Let it accumulate"** — *Absorb it.* ✅ No spend. ❌ Capacity crunch, worst for linear cities.

### W9 — Energy Price Spike
**Scene:** Global energy prices soar. For cities that turn waste into power, this is suddenly a windfall; for everyone else, costs climb.
- **A) "Maximise energy recovery"** (invest) — *Ramp up waste-to-energy output.* ✅ Big income if you have an incinerator. ❌ Needs the infrastructure already.
- **B) "Cut energy use"** (adapt) — *Trim consumption.* ✅ Modest savings. ❌ Limited upside.
- **C) "Absorb the costs"** — *Do nothing.* ✅ No effort. ❌ Bills rise (but incinerator cities profit).

### W10 — Health Study Released
**Scene:** A major study links pollution from waste facilities to ill health, and the headlines name your city. Residents want reassurance now.
- **A) "Upgrade facilities + open monitoring"** (invest) — *Clean up and prove it.* ✅ Protects health; restores trust. ❌ Costly.
- **B) "Public reassurance campaign"** (adapt) — *Communicate and tweak operations.* ✅ Cheaper. ❌ Doesn't fix the cause.
- **C) "Dismiss it"** — *Absorb the criticism.* ✅ No spend. ❌ Health and trust suffer, worst for incinerator/low-trust cities.

### W11 — International Eco-Award
**Scene:** Your city is shortlisted for a global sustainability award. A clean, circular track record could win the spotlight — and investment.
- **A) "Showcase and build on it"** (invest) — *Leverage the recognition fully.* ✅ Boosts reputation and economy (big for circular/high-trust cities). ❌ Small cost to promote.
- **B) "Quiet acknowledgement"** (adapt) — *Accept modestly.* ✅ Easy. ❌ Misses the momentum.
- **C) "Ignore it"** — *Do nothing.* ✅ No effort. ❌ Wasted opportunity.

### W12 — Recession & Budget Cuts
**Scene:** An economic downturn slashes the city's budget. Waste services — often a fifth or more of municipal spending — are squarely in the firing line.
- **A) "Protect core services via efficiency"** (invest) — *Find smarter, leaner ways to keep services running.* ✅ Maintains services; circular efficiency helps. ❌ Hard choices needed.
- **B) "Trim services modestly"** (adapt) — *Cut back carefully.* ✅ Balances the books. ❌ Some decline.
- **C) "Deep cuts"** — *Absorb the shortfall by slashing spending.* ✅ Saves money. ❌ Services collapse, worst for debt-heavy cities.

### W13 — Population Boom
**Scene:** A wave of new residents arrives, swelling the city and its rubbish stream faster than expected.
- **A) "Scale up systems ahead of demand"** (invest) — *Expand capacity proactively.* ✅ Keeps pace; prevents crisis. ❌ Big upfront cost.
- **B) "Stretch existing services"** (adapt) — *Make do for now.* ✅ Cheaper. ❌ Strain shows.
- **C) "Let it overwhelm"** — *Absorb the growth.* ✅ No spend. ❌ Capacity buckles, worst for linear cities; recyclers cope better.

### W14 — Tech Breakthrough: AI Sorting
**Scene:** A leap in automated sorting technology could supercharge recycling — especially for cities that already have systems to plug it into.
- **A) "Invest in the new tech"** (invest) — *Adopt AI sorting at scale.* ✅ Big recycling and income jump (huge if you already recycle). ❌ Capital cost.
- **B) "Small pilot"** (adapt) — *Trial it modestly.* ✅ Low-risk. ❌ Limited gain.
- **C) "Skip it"** — *Don't adopt.* ✅ No spend. ❌ Falls behind.

### W15 — Waste-Picker Strike
**Scene:** The informal recyclers down tools, and suddenly the city realises how much of its recycling depended on them. How you've treated them now decides how this plays out.
- **A) "Negotiate a fair deal"** (invest) — *Reach a fair settlement.* ✅ Restores recycling; rewards cities that integrated pickers. ❌ Costs to meet demands.
- **B) "Temporary replacement crews"** (adapt) — *Patch the gap.* ✅ Keeps things moving. ❌ Costly and less effective.
- **C) "Wait them out"** — *Absorb the disruption.* ✅ No spend. ❌ Recycling collapses, worst for cities that evicted pickers; integrated cities barely affected.

### W16 — Ocean Plastic Scandal
**Scene:** Investigators trace a tide of ocean plastic back to your city's mismanaged waste. The images go global and the pressure is intense.
- **A) "Clean-up + leakage prevention"** (invest) — *Stop waste escaping into waterways.* ✅ Repairs damage and reputation. ❌ Costly.
- **B) "PR response + minor fixes"** (adapt) — *Manage the message.* ✅ Cheaper. ❌ Doesn't fix the leakage.
- **C) "Weather the storm"** — *Absorb the scandal.* ✅ No spend. ❌ Environment and reputation hit, worst for polluting/linear cities.

### W17 — Methane Explosion Risk
**Scene:** Engineers warn that gas building up in your waste sites could ignite. It's a ticking clock for any city sitting on big landfills or dumps.
- **A) "Install gas capture/venting"** (invest) — *Make the sites safe (and maybe make energy).* ✅ Removes the danger; can earn energy income. ❌ Costs to install.
- **B) "Safety inspections"** (adapt) — *Monitor closely.* ✅ Cheap vigilance. ❌ Risk remains.
- **C) "Hope for the best"** — *Absorb the risk.* ✅ No spend. ❌ Explosion/fire danger, worst for landfill/dump-reliant cities.

### W18 — Green Tourism Surge
**Scene:** Word spreads that your city is clean and liveable, and visitors start pouring in — a reward for years of caring for the environment.
- **A) "Invest in eco-tourism"** (invest) — *Build on the clean reputation.* ✅ Strong economic and liveability boost (best for clean, high-trust cities). ❌ Small investment.
- **B) "Welcome visitors modestly"** (adapt) — *Accept the trade gently.* ✅ Easy income. ❌ Smaller gain.
- **C) "Do nothing special"** — *Absorb the interest.* ✅ No effort. ❌ Missed boost; polluted cities may even repel visitors.

### W19 — Stricter Recycling Targets
**Scene:** National law raises the recycling rates every city must hit. Those who prepared sail through; those who didn't face penalties.
- **A) "Invest to exceed the target"** (invest) — *Push recycling above the new bar.* ✅ Compliant and rewarded (easy for circular cities). ❌ Costs to ramp up.
- **B) "Scrape to the minimum"** (adapt) — *Just meet the target.* ✅ Avoids penalties cheaply. ❌ No upside.
- **C) "Miss it"** — *Absorb the penalties.* ✅ No spend now. ❌ Fines and reputational damage, worst for linear cities.

### W20 — Climate Summit Spotlight
**Scene:** A global climate summit puts your city's pledges under the microscope. Bold, credible action earns acclaim; empty words get exposed.
- **A) "Announce ambitious, credible commitments"** (invest) — *Lead with real circular pledges.* ✅ Big reputation, economic and morale boost (huge for zero-waste cities). ❌ Commits you to delivery.
- **B) "Modest, safe commitments"** (adapt) — *Pledge cautiously.* ✅ Low risk. ❌ Little recognition.
- **C) "Stay quiet"** — *Absorb the scrutiny.* ✅ No effort. ❌ Looks evasive, worst for linear cities.

---

## INTEGRATION NOTES FOR THE AI

- **Overlay, don't fork:** keep all IDs, effects, flags and weighting from `EVENT_DATABASE_SPEC.md`. This file only adds `scene`, `plainLabel`, `plainMeaning`, `pros`, `cons`, `conceptLink`. Merge by matching event ID and action order (A/B/C/D).
- **Show plain text to students:** the UI should display `plainLabel` on buttons (with `plainMeaning` as a subtitle/tooltip) and `scene` as the event narration. Keep the geography terms only in the `conceptLink` and the post-choice explanation, so students learn the vocabulary *after* understanding the idea.
- **Year Summary build:** after each round, generate the "Year in Review" card (Part 2) by pulling each chosen action's `plainLabel`, its best-matching `pro` (pillar that rose most) and `con` (pillar that fell most), the actual pillar deltas, and the round's score change. Add the Consequence Watch line whenever a `setsFlags` gates/weights a future event.
- **Tone:** keep `scene` text vivid but short (3–5 sentences) and jargon-free; keep each pro/con to one plain clause. Aim for a 13–17 year-old reading level.

*End of Choice Library (v4).*
