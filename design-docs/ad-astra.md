# Alea Imperii: Ad Astra — Game Specification

> *A dice-rolling civilization game of chance and ambition*

---

## Vision

Alea Imperii is a solo/multiplayer dice-rolling civilization game spanning the full arc of human history — from the first campfire to the colonization of space. Built on the mechanical foundation of Roll Through the Ages, it extends that core with age progression, a non-linear technology web, evolving dice, and roguelike meta-progression. A full run takes 60–90 minutes.

---

## Structure

### Ages

The game is divided into **6 ages**. Each age is a self-contained phase of ~8–12 rounds. Players advance through ages at their own pace; opponents may be in different ages simultaneously.

| # | Age | Flavour |
|---|---|---|
| 1 | Stone Age | Survival, fire, basic tools |
| 2 | Bronze Age | Metal, irrigation, early writing |
| 3 | Antiquity | Philosophy, roads, statecraft |
| 4 | Middle Ages | Feudalism, religion, gunpowder |
| 5 | Industrial | Steam, medicine, mass production |
| 6 | Modernity | Nuclear power, AI, space colonization |

### Age advancement

Advancing to the next age requires:
1. Completing at least one **monument** of the current age, AND
2. Paying an **advancement cost** (a one-time sacrifice of goods and/or food, scaling with age).

Advancement is optional — a player may stay in their current age to extract more value from it. However, later ages have higher-scoring monuments and more powerful technologies, so indefinite stalling is not optimal.

When advancing, the player drafts one **transition perk** (see Roguelike Layer).

---

## Core Mechanics

The base turn structure from Roll Through the Ages is preserved:

1. Roll dice and collect resources
2. Feed cities and resolve disasters
3. Build cities and/or monuments
4. Buy at most one development
5. Discard excess goods and pass dice

The key extensions are **evolving dice**, **an expanded resource set**, and **a non-linear tech web**.

---

## Resources

Each age introduces or recontextualizes resources. The core goods track expands across ages:

| Age | New resources introduced |
|---|---|
| Stone | Food, Wood, Stone, Workers |
| Bronze | Pottery, Cloth, Metal |
| Antiquity | Spearheads → Iron, Scrolls (knowledge) |
| Middle Ages | Gold, Faith |
| Industrial | Coal, Steel, Science |
| Modernity | Energy, Data |

Earlier resources remain relevant (Wood is always needed; Food is always needed). Later resources layer on top rather than replacing them.

---

## Dice

Each age modifies the dice pool. One or two faces change when a player enters a new age, reflecting the shifting economy of their civilization. Earlier faces don't disappear entirely — they're diluted by new options.

| Age | New/changed face examples |
|---|---|
| Stone | All faces: Food, Workers, Skulls, basic Goods |
| Bronze | Coin face appears; Goods face upgraded to Metal/Pottery |
| Antiquity | Scroll face (generates Knowledge resource) |
| Middle Ages | Faith face; Gold face replaces basic Coins |
| Industrial | Industry face (4 Workers at once); Science face |
| Modernity | Energy face; Data face; Skulls can now trigger global disasters |

Die faces are **age-locked**: a player's dice reflect their current age, not their opponents'. This means a player racing ahead will roll differently from one who is stalling.

---

## Technology Web

Technologies are arranged in a **non-linear web**, not a list or simple tree. Each age has its own web. Within a web, technologies have prerequisites but multiple valid paths exist — a player will never unlock everything in a single run.

### Principles

- **Multiple paths to similar goals.** Wanting more workers? You can go Masonry → Engineering, or Forced Labour → Civil Works. Different costs, different side effects.
- **Cross-age carry-forward.** Technologies persist into later ages and may unlock options in the next age's web. Unlocking Writing in Bronze Age opens Philosophy in Antiquity.
- **Upgrades, not replacements.** Later technologies augment earlier ones rather than obsoleting them. Agriculture (Bronze) + Crop Rotation (Antiquity) stack.
- **Divergent endgames.** By Modernity, two players will have taken meaningfully different paths. One may have a military-industrial complex; another a science-faith hybrid.

### Example web fragment (Bronze Age)

```
Fire (Stone) ──► Agriculture ──► Irrigation
                      │
                      └──► Animal Husbandry ──► Cavalry (Antiquity)

Toolmaking (Stone) ──► Metalworking ──► Bronze Weapons ──► Iron (Antiquity)
                              │
                              └──► Coinage

Writing ──► Administration ──► Statecraft
      │
      └──► Astronomy ──► Navigation (Antiquity)
```

Prerequisites are shown as arrows. A technology with two prerequisites requires both.

### Technology effects

Each technology does one or more of:
- Modify a dice face (passive, permanent)
- Grant a turn action (active, per-turn)
- Protect against a disaster type
- Unlock a monument to build
- Provide an advancement bonus
- Unlock a branch in the next age's web

---

## Monuments

Each age has **3–5 monuments**. Monuments are:
- Built by spending workers (and sometimes other resources)
- Worth points at game end (first-completer bonus remains)
- Sometimes gating: completing the age's **capstone monument** is one of the two requirements to advance

| Age | Example monuments |
|---|---|
| Stone | Burial Mound, Standing Stones, Stonehenge *(capstone)* |
| Bronze | Ziggurat, Great Pyramid, Hanging Gardens *(capstone)* |
| Antiquity | Colosseum, Library of Alexandria, Parthenon *(capstone)* |
| Middle Ages | Cathedral, Silk Road, Great Wall *(capstone)* |
| Industrial | Suez Canal, Crystal Palace, Transcontinental Railway *(capstone)* |
| Modernity | Space Station, Dyson Array, Generation Ship *(capstone — also the win condition)* |

Completing the Generation Ship ends the game for that player. All other players finish the current round.

---

## Disasters

Disasters scale with age. The skull mechanic is preserved but the disaster table expands:

| Age | New disaster types |
|---|---|
| Stone | Famine, Drought (as RTTA) |
| Bronze | Plague (like Pestilence), Invasion |
| Antiquity | Revolt, Barbarian Raid (destroy a city progress) |
| Middle Ages | Crusade (forced goods sacrifice), Black Death (affects all) |
| Industrial | Revolution (lose developments if no Statecraft), Pollution (persistent −1/round) |
| Modernity | Nuclear Meltdown, AI Misalignment (global; affects all players) |

**Global disasters** (introduced in Industrial/Modernity) affect all players regardless of who rolled them. They create shared tension and encourage diplomatic or cooperative play in multiplayer.

---

## Roguelike Layer

### Meta-progression

Completing a run (reaching Modernity and finishing the Generation Ship) unlocks **legacy points**. These are spent between runs on a persistent unlock tree:

- Starting bonuses (extra food, a free technology, +1 city)
- New civilization archetypes (see below)
- Additional monument variants
- New disaster modifiers ("hard mode" options)

### Civilization archetypes

At run start, the player drafts one of three randomly offered **civ archetypes**, each providing a passive that shapes the whole run:

| Archetype | Passive |
|---|---|
| Agrarian | Food cap +3; Agriculture technologies cost −2 |
| Militarist | Invasion never affects you; military techs cost −3 |
| Merchant | Coin faces yield +3; can carry 2 coins between turns |
| Scholar | Each age, start with 1 free technology from the web |
| Builder | Monument boxes cost 1 fewer worker (min 1) |

### Transition perks

When advancing between ages, the player drafts **1 of 3 random perks**:

Examples:
- *Institutional Memory:* carry forward 1 extra technology from the previous age for free
- *Golden Age:* first 3 rounds of next age, dice have no skull faces
- *Infrastructure:* start next age with 1 city already partially built
- *Abundance:* start next age with food pegged to maximum

### Age cards

Each age, one global **age card** is drawn and applies to all players for that age's duration:

Examples (Bronze Age):
- *Trade Winds:* all goods are worth +1 coin when spent on developments
- *Drought Year:* food costs +1 per city per round
- *Heroic Era:* first player to complete a monument steals 3 goods from any opponent

---

## Scoring

At game end (when any player completes the Generation Ship, or after a fixed round limit in shorter modes):

```
+ Development/technology points (circled at purchase)
+ Monument points (large if first completer, small otherwise)
+ Archetype bonus (varies per civ)
+ Transition perk bonuses
+ Age advancement bonuses (small points for each age reached)
─────────────────────────────────────────────────────
= Subtotal
─ Disaster points (accumulated across all ages)
─────────────────────────────────────────────────────
= Final score
```

Tiebreaker: highest total remaining goods value.

---

## Modes

| Mode | Description |
|---|---|
| Full run | All 6 ages, ~60–90 min |
| Sprint | Stone → Antiquity only, ~30 min, good for learning |
| Endless | No generation ship; score-attack after Modernity |
| Multiplayer | 2–4 players, shared dice pool, simultaneous age progression |

---

## Open questions

- Exact box counts and point values per monument (to be playtested)
- Exact tech web nodes per age beyond Bronze (to be designed per age)
- Whether multiplayer uses simultaneous turns or strict turn order
- Balance of advancement cost scaling across ages
- Whether global disasters in Modernity need an opt-in difficulty toggle
