# Cave water cleanup — 16 November 2026

Tool: built-in `image_gen.imagegen`, edit mode, transparent background.

Input: `NextSkill_205_247_261/wwwroot/images/journey/learning-portal-island-v1.png`.

Output: `NextSkill_205_247_261/wwwroot/images/journey/learning-portal-island-v2.png`.

The original output remains in the Codex generated_images directory. The website uses the workspace copy. The external pool and static falling water were removed to support independent live water rendering. The stonework, greenery, books and overall composition were preserved.

## Final prompt

Use case: precise-object-edit. Edit target: the attached transparent cartoon cave-island asset currently used on a website. Preserve the exact island design, camera angle, placement, proportions, dimensions, stone arch, stairs, books, plants, flowers, lanterns and soft bright cartoon rendering. This is an asset cleanup for animated game compositing, not a new concept. Remove ALL of the foreground/exterior painted sea, cyan pool, water oval, sea reflections, ground shadows, pale-blue rim, foam and ripple rings surrounding the island. Those exterior areas must be true transparent alpha all the way up to the natural contact edge of each solid rock, so the island can sit in a separately animated ocean without a visible water patch. Remove the water between the two front rocky banks below the mouth of the portal as well. Preserve opaque magical blue corridor only INSIDE the arch; its water floor should fade softly into transparent alpha near the front mouth, with no exterior pool. The foreground gap is open transparent water space for a live boat. The right-hand WATERFALL will be rendered and animated separately in code: remove its static falling water and static foam, leaving the same dark teal blue smooth curved recessed wet rock channel at the same location for animated water to be placed over it. Keep the lip and surrounding rocks/plants unchanged. The dark channel should taper from the top waterfall lip toward its base. Do not add new scenery. Nothing should be added outside the island silhouette. No sky, sea background, floor, boats, UI, text, checkerboard or solid backdrop. Full transparent background. Keep the same near-square 800:700 composition, fully contained, no crop. Most important: no painted ocean puddle underneath or in front of the island, no hard edge blue oval; actual rocks are the outer bottom silhouette.
