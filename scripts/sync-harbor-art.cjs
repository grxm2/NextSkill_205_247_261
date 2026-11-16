// Keep the editable SVG and its interactive Razor rendering in sync.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'NextSkill_205_247_261');
let svg = fs.readFileSync(path.join(root, 'wwwroot/images/journey/course-harbor.svg'), 'utf8').trim();
svg = svg.replace(/id="([^"]+)"/g, 'id="@(harborArtId)-$1"')
    .replace(/url\(#/g, 'url(#@(harborArtId)-')
    .replace(/href="#/g, 'href="#@(harborArtId)-')
    .replace('<svg ', '<svg id="@harborArtId" class="course-harbor-art" width="800" height="700" aria-hidden="true" focusable="false" ');
const razor = `@* Generated from course-harbor.svg by scripts/sync-harbor-art.cjs. *@
@model bool
@{ var harborArtId = "harbor-" + Guid.NewGuid().ToString("N"); }
<div class="harbor-model" data-harbor-model data-harbor-interactive="@Model.ToString().ToLowerInvariant()" data-door-state="open" data-harbor-motion="paused">
${svg}
</div>
`;
fs.writeFileSync(path.join(root, 'Views/Shared/_CourseHarborArt.cshtml'), razor.replace(/\r?\n/g, '\r\n'));
console.log('Synced harbor SVG to interactive Razor partial.');
