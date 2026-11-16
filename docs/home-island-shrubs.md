# Home island shrubs

The three existing planting positions now use a rounded coastal broadleaf model
with seventeen overlapping leaves per clump. `_StartingIslandShrubDefs.cshtml`
defines curved blade outlines, three shaded leaf materials, subtle veins and a
soft contact shadow. `_StartingIslandShrub.cshtml` renders separate rear,
middle and foreground branches. The original palm models, terrain, animal
routes and mascot anchors are retained.

`ocean-world.css` animates the crown, three branch layers and three leaf tips.
The crown and branches pivot at the planted root `(34, 0)`; each tip pivots at
its own attachment. Outer placement, contact shadows and root lines stay still.
The eight-second wind envelope passes through the three clumps with small
phase offsets. Leaf tips have a softer 7.6-second flutter. Only transforms
animate, with the existing `--ns-ease-in-out` curve; no frame loop or animation
library is added.

`home-island-life.js` shares the existing island-specific `NextSkillMotion`
subscription between wildlife and shrub wind. It sets `data-island-wind` on
the island artwork. CSS starts paused, freezes its current phase on pause,
dialogs, offscreen or hidden-page state, and resumes when allowed. Reduced
motion removes all shrub animation and retains the full static model.

Verification: the focused browser probe in `artifacts/home-shrubs-qa/check.cjs`
samples all twenty-one wind tracks at twenty-five phases on desktop/mobile.
It verifies roots remain fixed while tips move, and checks pause/resume,
dialogs and reduced motion. `scripts/verify-home-wildlife.cjs` passed six
viewport sizes, animal clearance, both themes, offscreen suspension and
existing motion policies. Reports and close-up screenshots are in
`artifacts/home-shrubs-qa/` and `artifacts/home-wildlife-qa/`.
