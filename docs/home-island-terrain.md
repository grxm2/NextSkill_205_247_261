# Home island terrain

The home island uses an irregular low beach with layered sand, grassy rear ledges and lavender coastal rocks. The terrain is separate from the original SVG palms and shrubs. Palm foliage, upper trunks, shrubs and their motion remain unchanged; trunk-base contact was subsequently refined at the user's request. Nimo's shore anchor, the existing entrance and the 760 × 520 artwork coordinates remain in place. Crab and turtle keep their latest reduced sizes. The left crab moves slightly inward onto its sand cove; the turtle keeps its usual routes, with the narrowest layout shifted slightly inward from the wet edge. A wider right beach provides clear ground. Starfish, white gull and coral remain absent.

Production asset: `NextSkill_205_247_261/wwwroot/images/journey/home-island-terrain-v2.webp` — 2172 × 724, transparent alpha, 237,564 bytes.

`_StartingIslandTerrain.cshtml` places only this terrain below the existing vegetation and wildlife. Its animated broken swashes follow 43 samples of the generated asset's opaque front coastline. The foam and wet-sand animation retain the existing pause/reduced-motion policy. The original shoreline's front height is retained, preserving vessel clearance and shore jumping.

The ground and its shoreline are enlarged by a further 6% around the front waterline (390, 420), while the existing canopy and animal sizes remain unchanged. The trunk bases now have small feathered soil/contact shadows, tapered roots and short overlapping grass. Upper trunks, palm foliage, shrubs and their motion stay unchanged.

## Verification

The initial terrain replacement passed the MVC build with zero warnings/errors, wildlife placement and motion at six viewport sizes, and 900 raster-ground contact samples. Exact SVG fingerprints confirmed the original vegetation was unchanged before the subsequent root-contact refinement. The original rowing entrance, jump, shore interaction and complete Home-to-catalog voyage passed at 1440 × 900 and 390 × 844. Reports and before/after screenshots are in `artifacts/home-island-redesign/` and `artifacts/home-wildlife-qa/`.

The 6% ground enlargement and root-contact refinement also passed the MVC build with zero warnings/errors, the six-size wildlife checks and all 900 raster-ground contact samples. Original canopy/coconut groups and the four upper-trunk paths were compared directly and remain unchanged.
