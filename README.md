# Skylark Canyon Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/tomli16700-spec/flight-game-01/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/tomli16700-spec/flight-game-01/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete, original flight game for the [make.fun bounty "Make the best flight game"](https://make.fun/bounty/best-flight-game-20261126-0057). Fly the SK-7 Skylark down a canyon valley in chase view: thread glowing rings, dodge rock spires, balloons and birds, mind the fuel gauge, and — on the courier run — put her down on the island airstrip. Everything is drawn on one canvas with plain JavaScript; there are no libraries, no images, no audio files and no network requests. Sound is synthesised with WebAudio.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` with any static server). No build step, no install.

- **Steer** — `←` `→` or `A` / `D`, or drag with the mouse / touch.
- **Climb / dive** — `↑` `↓` or `W` / `S`.
- **Throttle** — `Shift` up, `Ctrl` down, or the mouse wheel.
- **Pause** — `P` or `Esc`. **Mute** — `M`. **Restart** — `R`.
- Pick a mission on the title screen with `1`, `2`, `3` or a click.

## The three missions

1. **Ring Runner** — thread 12 rings. Each ring pays 100 points (plus a combo bonus) and 8 fuel. Miss one and the combo resets.
2. **Courier Run** — carry the mail 3,200 m down the valley and land on the strip: under 130 knots, on the centreline, wheels down. Too fast or crooked is a crash.
3. **Storm Dash** — survive 90 seconds of storm wind and dense obstacles, and bring 8 stars home.

Fuel burns faster the harder the engine works; fuel cans pay 25 fuel. Three hard hits ends the sortie. Best score is kept in the browser.

## What is in this repo

| Path | What it does |
| --- | --- |
| `game/index.html` | The page: canvas, stylesheet, module entry point. |
| `game/app.css` | Page chrome around the canvas. |
| `game/src/config.js` | Tuning numbers, mission definitions, palette. |
| `game/src/input.js` | Keyboard, mouse and touch in one place. |
| `game/src/audio.js` | WebAudio synth: engine hum, chimes, crash, fanfare. |
| `game/src/plane.js` | The flight model: bank, pitch, throttle, fuel, damage. |
| `game/src/world.js` | The valley: rings, spires, balloons, birds, pickups. |
| `game/src/missions.js` | Win and lose rules for the three missions. |
| `game/src/render.js` | Everything drawn: sky, canyon, runway, plane, HUD, screens. |
| `game/src/main.js` | Game loop, state machine, scoring, particles. |
| `main.ts` | Hand-in program: copies `game/` and `screenshots/`, writes `dossier.json`. |
| `vendor/makefun-game.ts` | The kit's dossier library, unchanged. |
| `screenshots/` | 3 renders of the game itself (menu, ring run, final approach). |

## How to verify

```sh
# Play it locally (any static server; the kit's serve.ts works too)
cd game && python3 -m http.server 8080
# then open http://localhost:8080

# Build the hand-in output
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# out/ holds game/, screenshots/ and dossier.json
```

The output is deterministic: run `main.ts` twice and the bytes match. The game makes no network request: every script, image and sound is a file under `game/` or synthesised at run time.
