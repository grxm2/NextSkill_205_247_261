# Starting-island wildlife

The home island keeps its existing SVG palms, shrubs, Nimo anchor and camera, with a separate painted terrain base in `_StartingIslandTerrain.cshtml`. `_StartingIslandWildlife.cshtml` adds decorative SVG groups in the same 760 × 520 coordinate system, so their habitat and scale stay attached to the island throughout the voyage. The crab is positioned inside the new left sand cove; the turtle's existing routes retain a clear beach beneath them.

- A smaller crab has a bounded 14-unit walk on the left sand and occasional gentle claw movements in a 20-second cycle.
- The starfish has been removed, leaving more open sand.
- The original three silhouette birds remain in the sky through `_OceanBirds.cshtml` and the existing `ocean-life.js` flight controller. The white gull, its rock and its animation styles have been removed.
- `_IslandTortoiseArt.cshtml` replaces the swimming turtle with a land turtle. Its domed shell has separate scutes, a shaded rim and highlights; the head has eyes and skin markings, and all four legs have defined feet and claws. It walks a bounded 24-unit lane on sand in a 24-second cycle, alternating its feet and turning to face the return direction.
- Both coral patches and their animation styles have been removed to leave the water clear.

The outer SVG transforms establish fixed placements. Inner groups animate only `transform`; roots, rocks and sand stay still. `ocean-life.css` uses the existing easing token. `home-island-life.js` subscribes to `NextSkillMotion` for this island specifically, freezing its animation phase when paused, hidden, covered by a dialog or outside the camera. Reduced motion keeps the complete static illustration. Wildlife has no focus targets or pointer handlers and is covered by the island's accessible description.

The island artwork is 5% larger around its existing waterline. Turtle and crab models are scaled to 68% within it, a further 20% reduction from the previous 85% scale. The narrowest turtle placement also scales down by 20%. The turtle has slower 1.8-second leg cycles, reduced vertical lift and an eased turn instead of a step change. Boat departure clearance measures the painted SVG bounds so the larger island keeps its water contact.

Home keeps the original entrance: the existing boat sails in from the left, then the singleton Nimo jumps to the reserved shore anchor and waits for interaction. The catalog-departure attribute only marks the destination and no longer skips this entrance. Reduced or paused motion starts on shore. `scripts/verify-home-arrival.cjs` checks the live entrance, landing, mascot interaction, course departures during both phases and interruption recovery.

Compact layouts move the walking turtle to the right sand and shorten its lane to 14 units. The crab retains the left shore on compact layouts. Fish-jump placement excludes every wildlife group with an additional safety margin.

Run `scripts/verify-home-wildlife.cjs` with Playwright on `NODE_PATH` and `NEXTSKILL_TEST_URL` pointing to a Development server. It samples 25 animation phases for collisions using visible model parts and the actual curved trunk silhouettes. It checks the two remaining shore animals, the silhouette flock, 320–1440px layouts, both themes, pause/resume, dialogs, offscreen suspension and reduced motion. Results and screenshots are written to `artifacts/home-wildlife-qa/`.
