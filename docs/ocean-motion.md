# Ocean motion — 1 November 2026

Home keeps the existing NextSkill ocean artwork and MVC flow. Motion now preserves spatial continuity: a continuous scroll camera, steady land, moving shore wash, directional birds and a fish that physically crosses the water surface.

## Implementation

- `wwwroot/js/ocean-world.js`: one linear camera track with ScrollTrigger catch-up of 480ms on fine pointers and 320ms on coarse pointers. The scene uses a CSS sticky track instead of a pin/reparent swap, keeping the same painted ocean through the header-to-scene transition. Harbor interactivity follows the rendered timeline. Pause preserves manual navigation; hidden scenes and dialogs suspend ambient work. There is no wheel interception or new scroll library.
- `wwwroot/css/ocean-world.css` and the five `ocean-swell-*.svg` files: continuous, seamless currents at different depths, sufficient overscan at either end of the scroll route, soft sunlight and shore wash. Matching crest heights and tangents remove directional seams.
- `Views/Shared/_StartingIslandArt.cshtml`: existing island paths rendered inline so the two palm crowns can sway independently. The island itself stays still. `Views/Home/Index.cshtml` composes this partial and the ocean-life partial.
- `wwwroot/css/niko-voyage.css`: steady paddle cadence and restrained hull rocking. Scrolling no longer abruptly remaps animation duration.
- `Views/Shared/_OceanLife.cshtml`, `wwwroot/css/ocean-life.css`, `wwwroot/js/ocean-life.js`: three distinct fish jump at separately selected positions, with articulated tails and fins, 1.2s ballistic arcs, individual waterline clipping, and separate takeoff and landing effects. Their size and splash scale follow distance; geometry is measured once per school. Three birds cross the sky with staggered wingbeats and gliding. Flight loop boundaries remain outside the scene at both camera endpoints and account for each bird's scale.

The first school is scheduled after 0.7–1.4s. Later schools are scheduled 0.8–1.8s on desktop or 1–2s on compact/coarse-pointer screens after the preceding water effects finish. Fish can appear while scrolling, and the boat tour requests a school when it begins. A clear patch of water is required; on compact screens, the actual beach and palms are protected separately from the transparent SVG canvas, with a narrower jump available when space is limited.

`NextSkillMotion` controls pause, dialog, visibility and reduced-motion behavior. Ordinary pause freezes fish and bird animation phases; resume continues them. Reduced motion cancels fish, removes parallax and exposes the harbor in the static layout. Resizing cancels an active fish event because its water geometry has changed.

## Validation

Final validation passed all 17 browser checks in Chrome: 320, 360, 390, 768, 1024 and 1440px viewports, a coarse-pointer context and a 200% zoom-equivalent layout. No JavaScript errors or failed network requests occurred. The integrated .NET build passed with zero errors and a NU1900 warning because the NuGet audit feed was unavailable.

The regression also verifies bird loop endpoints at both ends of the camera route and that pausing during camera catch-up resumes to the correct destination without another scroll event. Final machine-readable results are in `artifacts/ocean-motion/report.json`.

Run the Development app and the focused, read-only browser check from the repository root:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project NextSkill_205_247_261 --no-launch-profile --urls http://127.0.0.1:5299
# Separate terminal, with Playwright available on NODE_PATH:
node scripts/verify-ocean-motion.cjs
```

The script writes `artifacts/ocean-motion/report.json`, screenshots and a browser recording. It checks responsive layout, the Nimo singleton, camera settling and reversal, rendered-stage synchronization, full wave-loop coverage, fish trajectories and waterline clipping, scroll interruption, pause/resume, dialogs, reduced motion, offscreen suspension, page lifecycle and bird flight. QA creates no accounts or learning progress.

Browser viewport checks are Chromium simulations, not physical-device performance measurements. The pagehide/pageshow check exercises lifecycle handlers synthetically. Build may report NU1900 when the NuGet vulnerability feed is unreachable; this is separate from compiler errors.

The rendered-timeline callback follows [GSAP's guidance for numeric scrub](https://gsap.com/docs/v3/Plugins/ScrollTrigger/#onUpdate): the animation may continue updating after the scroll position has stopped.
