# Home ocean journey and course gate

Home ends at the course harbor. The public page does not render preview islands, a lesson route, or any scroll segment beyond course selection.

- `Views/Home/Index.cshtml`: starting island, one shared boat/Niko, ocean and course harbor. The final navigation control opens the existing course chooser.
- `wwwroot/js/ocean-world.js`: one GSAP master timeline/ScrollTrigger. Camera travels from 0 to -50vw to -220vw and ends at the harbor. There is no post-harbor Y animation. Map hash links open course selection. Native scrolling may continue to the footer, which contains no Journey.
- Reduced Motion and unavailable GSAP render the same course gate in ordinary document flow. No preview islands are present in either fallback.
- Selecting a course uses the existing SelectCourse API. Authenticated selection waits for the saved state, covers the screen with clouds, navigates to Learning/Island and reveals the current course stage. Guest selection goes through login first.
- Returning learners still use smart root routing or My Island to resume the saved active course without repeating onboarding.
- Real current/completed/locked stages and progressive unlocks remain on Learning/Island and use persisted account state. Course changes preserve previous progress.

The cloud transition uses the supplied clouds-reference-v1.png unchanged across five masked depth planes. Near/far clouds separate along different paths to reveal the real island route in about two seconds. Reduced Motion bypasses animation.

Validation: build passed (8 existing nullable warnings). Desktop1440 and mobile390 checks verify scroll End/wheel cannot reveal Journey before choice, direct map hash opens the chooser, guest selection requires login, and Reduced Motion/GSAP-unavailable fallbacks preserve the gate. Report: C:/Users/gram/Desktop/Web/course-gate/report.json. Earlier real-account tests verified cloud arrival, course switching and server-graded island unlocks; QA accounts were removed by exact recorded identity.
