# Roll Through the Ages — The Bronze Age: Implementation Rules

Complete rules reference extracted from rulebook and score sheet for browser game implementation.

---

## 1. Game overview

- 1–4 players
- Each player manages their own civilization independently
- Goal: score the most points via cities, monuments, and developments while avoiding disasters
- One score sheet per player; pegboard tracks food and goods

---

## 2. State model (per player)

| Field | Initial value | Notes |
|---|---|---|
| `cities` | 3 | Also = number of dice rolled per turn |
| `food` | 3 | Tracks on pegboard; max depends on board |
| `wood` | 0 | Goods peg |
| `stone` | 0 | Goods peg |
| `pottery` | 0 | Goods peg |
| `cloth` | 0 | Goods peg |
| `spearheads` | 0 | Goods peg |
| `developments[]` | [] | Set of purchased development IDs |
| `monumentProgress{}` | all 0 | Boxes checked per monument |
| `monumentCompleted{}` | all false | Whether player has completed each |
| `disasterPoints` | 0 | Accumulated penalty points |
| `isStartPlayer` | one player | Marked with Star; determines last-turn player |

**Total goods** = sum of all 5 peg values. Max 6 (unless Caravans dev owned).

---

## 3. Goods ordering

Goods are always added **bottom to top** in this fixed order:

1. Wood
2. Stone
3. Pottery
4. Cloth
5. Spearheads

When adding multiple goods, fill from Wood upward. If you exceed 5, wrap back to Wood and continue up again. If a peg is already at its max, that good is lost but still counts toward the goods total earned this turn.

**Good values** (for purchasing developments):

| Good | Value |
|---|---|
| Wood | 1 |
| Stone | 2 |
| Pottery | 3 |
| Cloth | 4 |
| Spearheads | 5 |

---

## 4. Dice

7 dice total (shared, passed left). Each player rolls 1 die per city owned (min 3, max 7).

### Faces

| Face | Collect | Notes |
|---|---|---|
| 3 Food | +3 food | Advance food peg |
| 1 Good | +1 good | Add to lowest available goods slot |
| 2 Goods + 1 Skull | +2 goods, +1 skull | Die is **locked** (cannot be re-rolled) |
| 3 Workers | +3 workers | Check off 3 building boxes |
| 2 Food **or** 2 Workers | +2 food OR +2 workers | Player chooses at collection time |
| 7 Coins | +7 coins | Not saved between turns; used only this turn |

### Rolling mechanic (3 rolls max)

1. **Roll 1:** roll all dice. Set aside any showing skulls (locked). Optionally re-roll any remaining dice.
2. **Roll 2:** set aside any new skulls (add to previous skull count). Optionally re-roll any non-skull dice (including ones kept from roll 1).
3. **Roll 3:** must keep all results. No further re-rolls.

**Skull count** = total skulls accumulated across all 3 rolls. Resets to 0 each turn.

**Leadership dev exception:** after the final roll, may re-roll exactly 1 die of choice (including a skull die). Must accept the new result.

---

## 5. Turn phases

### Phase 1 — Roll dice and collect

1. Roll dice (up to 3 times as above).
2. Collect food: advance food peg by total food symbols.
3. Collect goods: add goods one at a time, Wood → Spearheads, wrapping if needed.
4. Collect workers: hold for phase 3.
5. Collect coins: hold for phase 4 (cannot carry over).

**Agriculture dev:** +1 food per food-face die (including the 2-food-or-workers face if food is chosen).  
**Masonry dev:** +1 worker per worker-face die (including the 2-food-or-workers face if workers are chosen).  
**Coinage dev:** coin face yields 12 coins instead of 7.  
**Quarrying dev:** +1 stone whenever any stone is produced.

### Phase 2 — Feed cities and resolve disasters

**Feeding:**
- Spend 1 food per city owned.
- If insufficient food: each unfed city = **−1 point** (Famine). Track in disaster section.

**Disasters** (triggered if total skulls ≥ 2):

| Skulls | Disaster | Effect | Protection |
|---|---|---|---|
| 1 | None | No effect | — |
| 2 | Drought | −2 points | Irrigation dev |
| 3 | Pestilence | Opponents each lose −3 points | Medicine dev (opponents) |
| 4 | Invasion | −4 points | Great Wall monument (completed) |
| 5+ | Revolt | Lose **all** goods including just-collected | Religion dev: opponents lose all goods instead; opponents with Religion are unaffected |

All disaster penalty points are recorded on the score sheet and subtracted at game end.

### Phase 3 — Build cities and/or monuments

**Workers** (from dice results) → check off boxes in cities or monuments (player's choice).

**Engineering dev:** may additionally spend stone → 3 boxes per stone spent. Any amount of stone allowed.

**Building a city:**
- Each city has a fixed number of boxes (see section 8).
- Once all boxes checked: city complete. Player now rolls +1 die from next turn.
- Max 4 new cities (7 total → 7 dice max).

**Building a monument:**
- Each monument has a fixed number of boxes (see section 8).
- First player to complete a monument: scores the **large** point value. All other players cross off the large value; they score only the **small** value if they later complete it.
- Incomplete monuments = 0 points at game end.

### Phase 4 — Buy at most 1 development

- May purchase 0 or 1 development per turn.
- Cost = coins (from dice this turn) + goods spent.
- When spending a good type, must spend **all** of that type. No change given; excess value lost.
- **Granaries dev:** during this phase, may sell food at 4 coins each (toward the purchase only). Unused coins are still lost at end of turn.
- Each development purchasable once per player.
- Mark on score sheet; circle point value for end-game scoring.

### Phase 5 — Discard excess goods and pass dice

- Maximum 6 goods total (sum of all pegs).
- **Caravans dev:** skip this step entirely; no discard required.
- Otherwise: discard goods of your choice down to 6 by moving pegs left.
- Pass dice to the player on the left.

---

## 6. Developments

| Development | Cost | Points | Effect |
|---|---|---|---|
| Leadership | 10 | 2 | After last roll: re-roll 1 die of choice (incl. skulls). Must keep new result. |
| Irrigation | 10 | 2 | Immune to Drought. |
| Agriculture | 15 | 3 | +1 food per food-face die. Applies to 2-food-or-workers face if food chosen. |
| Quarrying | 15 | 3 | +1 stone whenever stone is produced. |
| Medicine | 15 | 3 | Immune to Pestilence caused by opponents. |
| Coinage | 20 | 4 | Coin die face yields 12 coins instead of 7. |
| Caravans | 20 | 4 | No need to discard goods at end of turn (hold any amount). |
| Religion | 20 | 6 | On Revolt: you keep your goods; opponents lose all theirs. Opponents with Religion are unaffected. |
| Granaries | 30 | 6 | During Buy phase: sell food at 4 coins each toward development purchase. Coins not saved. |
| Masonry | 30 | 6 | +1 worker per worker-face die. Applies to 2-food-or-workers face if workers chosen. |
| Engineering | 40 | 6 | During Build phase: spend stone for 3 boxes each. Any amount. |
| Architecture | 50 | 8 | End game bonus: +1 point per completed monument. |
| Empire | 60 | 8 | End game bonus: +1 point per city owned (including starting 3). |

---

## 7. Cities

Cities are built by checking off boxes with workers. Each new city grants +1 die per turn.

| City # | Boxes to build |
|---|---|
| City 4 | 2 |
| City 5 | 3 |
| City 6 | 4 |
| City 7 | 5 |

(Cities 1–3 are pre-built at game start.)

---

## 8. Monuments

| Monument | Boxes | 1st place pts | Later pts | Removed for |
|---|---|---|---|---|
| Step Pyramid | 3 | 1 | 0 | — |
| Stone Circle | 5 | 2 | 1 | — |
| Temple | 7 | 4 | 2 | 2-player game |
| Hanging Gardens | 11 | 8 | 4 | 3-player game |
| Great Pyramid | 15 | 12 | 6 | 2-player game |
| Great Wall | 13 | 10 | 5 | — |
| Obelisk | 9 | 6 | 3 | — |


**Player count / monument availability:**

| Players | Monuments removed |
|---|---|
| 4 | None |
| 3 | Hanging Gardens |
| 2 | Temple + Great Pyramid |
| Solitaire | None (all active) |

---

## 9. Game end

### Trigger

The round ends (all players finish their turns) when either:
- One player purchases their **5th development**, or
- **All active monuments** have been completed at least once.

All players must finish the round for equal turns. The last player is always the player to the **right** of the start player (the one with the Star).

### Final scoring

```
+ Sum of circled development point values
+ Sum of monument point values (large if first, small if later)
+ Architecture bonus: +1 per monument completed (0–7)
+ Empire bonus: +1 per city owned (3–7)
─────────────────────────────────────────
= Subtotal
─ Total disaster points (every box checked in disaster section)
─────────────────────────────────────────
= Final total
```

### Tiebreaker

Tied players: award the win to the player whose **remaining goods are worth the most** (using good values: Wood=1, Stone=2, Pottery=3, Cloth=4, Spearheads=5).

---

## 10. Variant rules

### 3-player game
Same as base rules. Remove the **Hanging Gardens** monument before play.

### 2-player game
Same as base rules. Remove the **Temple** and **Great Pyramid** monuments before play.

### Solitaire (1 player)
- Play for exactly **10 rounds**. Goal: maximize score.
- All monuments are active.
- **Pestilence** affects you (not opponents) unless you have Medicine.
- **Religion** prevents Revolt for you.
- Skulls **can** be re-rolled like any die (no lockout during rolling phase).

### Trading variant (optional multiplayer add-on)
- Insert a **Trade step** between phase 2 and phase 3.
- Active player may trade goods and/or food with any opponent in any mutually agreed combination.
- Non-active players may only trade with the active player (not with each other).
- A player may not hold more of any good than their pegboard allows after the trade.

---

## 11. Implementation notes

- **Coins are ephemeral:** generated during phase 1, used only in phase 4, never carried over.
- **Skulls are ephemeral:** accumulate during rolling (phase 1), trigger disaster in phase 2, reset to 0 after.
- **Disaster points accumulate** across the whole game; subtracted at final scoring.
- **Monument first-completion flag** is global (not per-player): once any player completes a monument, all other players lose access to the large point value.
- **Good value for purchasing** = the peg value listed above (Wood=1 … Spearheads=5); when spending a good type, the entire stack of that type is consumed, no partial spending.
- **Workers from dice are not stored** — they are used immediately in phase 3 or lost.
- **Food peg** has a maximum (pegboard limit); excess food collected beyond max is lost silently.