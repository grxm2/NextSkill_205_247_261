// Deterministic scene geometry. Roof tiles and masonry share the same contours
// as their surfaces, so details cannot leave disconnected strokes in the sky.
const fs = require('node:fs');
const path = require('node:path');
const destination = path.resolve(__dirname,'../NextSkill_205_247_261/wwwroot/images/journey/knowledge-sanctum.svg');
const roof = 'M151 225C248 222 307 109 400 65C493 109 552 222 649 225L638 252C537 247 479 146 400 104C321 146 263 247 162 252Z';
const portal = 'M286 612V334A114 114 0 0 1 514 334V612Z';
const arch = 'M246 606V334A154 154 0 0 1 554 334V606H514V334A114 114 0 0 0 286 334V606Z';
const colors = ['#D7BC87','#8DC7C0','#D39C7D','#B5D3BB','#78A8AA','#E3CDA1'];
const shelves = Array.from({length:3},(_,row) => {
    const books = Array.from({length:6},(_,col) => {
        const height = [27,32,25,35,30,26][(col+row)%6];
        const x=9+col*12,y=42+row*42-height;
        return `<g><rect x="${x}" y="${y}" width="9" height="${height}" rx="1.5" fill="${colors[(col+row*2)%colors.length]}"/><path d="M${x+2} ${y+5}h5m-5 ${height-10}h5" stroke="#F5EAD0" stroke-width=".8" opacity=".65"/></g>`;
    }).join('');
    return books+`<path d="M6 ${45+row*42}h78" stroke="#CBAF7F" stroke-width="4"/>`;
}).join('');
const joints = [192,210,230,250,270,290,310,330,348].map(degrees => {
    const angle=degrees*Math.PI/180;
    const point=r=>`${(400+Math.cos(angle)*r).toFixed(2)} ${(334+Math.sin(angle)*r).toFixed(2)}`;
    return `<path d="M${point(153)}L${point(115)}"/>`;
}).join('');
const tiles = Array.from({length:15},(_,i) => {
    const x=155+i*35;
    return `<path d="M${x-30} 58Q${x-15} 155 ${x+10} 264"/>`;
}).join('');
const board = (x,y,w,h) => `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="5" fill="#C4AB7B"/><rect x="4" y="4" width="${w-8}" height="${h-8}" rx="3" fill="#F7EBCB"/></g>`;
const shrub = (x,y,scale,extra='') => `<g transform="translate(${x} ${y}) scale(${scale})"><g class="sanctum-foliage ${extra}"><use href="#shrub"/></g></g>`;
const lamp = (x,y,scale=1,extra='') => `<g transform="translate(${x} ${y}) scale(${scale})"><g class="sanctum-lantern ${extra}"><use href="#lantern"/></g></g>`;
const boat = (x,y,scale,extra='') => `<g transform="translate(${x} ${y}) scale(${scale})"><g class="sanctum-boat-drift ${extra}" data-sanctum-motion><path d="M-29 8c18 5 43 5 61 0m-51 7h32" stroke="#DCF3E9" stroke-width="2" stroke-linecap="round" opacity=".65"/><g class="sanctum-boat-bob" data-sanctum-motion><path d="M-28-3H30L20 9H-13Z" fill="#9C8E70"/><path d="M-4-46V-3" stroke="#7F958F" stroke-width="2"/><path d="M-8-43-26-7H-8Z" fill="#FFF0D2"/><path d="M0-37 24-7H0Z" fill="#C4DFD8"/><path d="M-24 0h48" stroke="#CEB994" stroke-width="2"/></g></g></g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 700" fill="none">
<defs>
 <linearGradient id="stone" x1="270" y1="230" x2="565" y2="610" gradientUnits="userSpaceOnUse"><stop stop-color="#FFF3D4"/><stop offset=".65" stop-color="#EBD5AC"/><stop offset="1" stop-color="#D8BF93"/></linearGradient>
 <linearGradient id="roof" x1="350" y1="65" x2="480" y2="260" gradientUnits="userSpaceOnUse"><stop stop-color="#79D8E5"/><stop offset=".55" stop-color="#3DAFC7"/><stop offset="1" stop-color="#2187A5"/></linearGradient>
 <linearGradient id="sand" x1="0" y1="532" x2="0" y2="625" gradientUnits="userSpaceOnUse"><stop stop-color="#FFF0C6"/><stop offset="1" stop-color="#E7C591"/></linearGradient>
 <linearGradient id="submerged" x1="0" y1="624" x2="0" y2="671" gradientUnits="userSpaceOnUse"><stop stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
 <linearGradient id="portal-depth" x1="400" y1="220" x2="400" y2="612" gradientUnits="userSpaceOnUse"><stop stop-color="#155775"/><stop offset=".52" stop-color="#269CAF"/><stop offset="1" stop-color="#86DCCE"/></linearGradient>
 <radialGradient id="portal-haze"><stop stop-color="#EDFFF0" stop-opacity=".9"/><stop offset=".4" stop-color="#B7F3E4" stop-opacity=".55"/><stop offset="1" stop-color="#68D7D4" stop-opacity="0"/></radialGradient>
 <clipPath id="portal-aperture"><path d="${portal}"/></clipPath>
 <clipPath id="roof-contour"><path d="${roof}"/></clipPath>
 <clipPath id="arch-contour"><path d="${arch}"/></clipPath>
 <mask id="water-edge"><rect width="800" height="625" fill="white"/><rect y="624" width="800" height="47" fill="url(#submerged)"/></mask>
 <pattern id="portal-stars" width="64" height="72" patternUnits="userSpaceOnUse"><circle cx="12" cy="18" r="1.5" fill="#E1FFF4" opacity=".5"/><circle cx="43" cy="48" r="1" fill="#D2FFF3" opacity=".35"/><path d="M50 8v6m-3-3h6" stroke="#D4FFF1" opacity=".3"/></pattern>
 <g id="book-mark" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M0-11c-9-5-18-5-25-2v30c9-3 17-2 25 3 8-5 16-6 25-3v-30c-7-3-16-3-25 2Z"/><path d="M0-11v31"/></g>
 <g id="books"><rect width="90" height="139" rx="18" fill="#547C7B"/>${shelves}<path d="M8 11v118" stroke="#AAC9B6" opacity=".22"/></g>
 <g id="lantern"><circle class="sanctum-lamp-light" cy="9" r="26" fill="#FFF0AB" opacity=".17"/><path d="M0-20v12m-13 4L0-12 13-4" stroke="#987C4C" stroke-width="2.4" stroke-linecap="round"/><path d="M-12-4h24L8 27H-8Z" fill="#FFE6A2" stroke="#B08E52" stroke-width="2" stroke-linejoin="round"/><path d="M0-1v26m-8 3H8" stroke="#C4A05E" stroke-width="2"/><path d="M-7 1h4v18h-4Z" fill="#FFFADE"/></g>
 <g id="shrub"><path d="M0 0c-24 0-42-12-46-31C-23-32-6-20 0 0Z" fill="#729F4B"/><path d="M0 0c-18-22-22-46-10-63C7-45 9-20 0 0Z" fill="#93BA5D"/><path d="M2 0C-3-26 8-49 28-59 35-35 25-12 2 0Z" fill="#6F9E4B"/><path d="M2 0c15-24 39-32 60-21C49 0 27 8 2 0Z" fill="#83B154"/><path d="M-2 0c-16-10-30-11-40-3C-29 9-13 10-2 0Z" fill="#9DC16A"/><path d="M0 0c1-18 9-31 23-36C25-19 16-5 0 0Z" fill="#A6C772"/><path d="M-33-23-4-2m-5-48L0-4m22-43L4-4m42-14L7 0" stroke="#567E40" stroke-linecap="round" opacity=".45"/></g>
</defs>

<!-- Distant boats remain small and desaturated relative to the foreground. -->
<g opacity=".55" class="sanctum-distant-boats">${boat(45,478,.75)}${boat(755,492,.62,'sanctum-boat-drift--right')}</g>

<g class="sanctum-portal" data-dimension-portal="true" clip-path="url(#portal-aperture)">
 <path d="${portal}" fill="url(#portal-depth)"/>
 <g class="sanctum-portal-stars"><rect x="275" y="160" width="250" height="550" fill="url(#portal-stars)"/></g>
 <ellipse class="sanctum-portal-haze" cx="400" cy="438" rx="125" ry="190" fill="url(#portal-haze)"/>
 <g stroke="#C5F9E8" stroke-linecap="round"><path d="M299 612V334a101 101 0 0 1 202 0v278" stroke-width="2.5" opacity=".75"/><path d="M323 612V371a77 77 0 0 1 154 0v241" stroke-width="2" opacity=".5"/><path d="M348 612V410a52 52 0 0 1 104 0v202" stroke-width="1.5" opacity=".35"/></g>
 <g class="sanctum-portal-orbit" stroke="#E1FFF1" stroke-width="1.5" opacity=".42"><ellipse cx="400" cy="442" rx="78" ry="129" stroke-dasharray="25 17 4 18"/><ellipse cx="400" cy="442" rx="52" ry="92" stroke-dasharray="14 24 3 17"/></g>
 <g transform="translate(400 442)"><g class="sanctum-portal-book" color="#F2FFE4"><circle r="38" fill="#D4F8D4" opacity=".13"/><use href="#book-mark" transform="scale(.74)"/></g></g>
 <g fill="#E3FFF0"><circle class="sanctum-mote" cx="350" cy="367" r="2"/><circle class="sanctum-mote" cx="451" cy="318" r="1.5"/><circle class="sanctum-mote" cx="379" cy="524" r="2"/><circle class="sanctum-mote" cx="457" cy="493" r="1.5"/><circle class="sanctum-mote" cx="316" cy="556" r="1.5"/><circle class="sanctum-mote" cx="483" cy="572" r="2"/></g>
 <ellipse class="sanctum-portal-entry-light" cx="400" cy="493" rx="118" ry="180" fill="url(#portal-haze)" opacity="0"/>
</g>

<g mask="url(#water-edge)">
 <!-- Continuous shore silhouettes and retained rock faces, with a clear canal. -->
 <g class="sanctum-shore-banks">
  <path d="M12 611 28 571 78 540 151 525 237 536 285 560 305 594 306 637 267 654 113 659 43 641Z" fill="#92A69C"/>
  <path d="m12 611 34-21 31 7 3 53-37-9Zm70-67 39-10 16 123-57-7Zm46-11 49-7 17 131-57 0Zm57-6 49 9 12 119-52 2Zm57 11 43 22 20 34-20 53-39 8Z" fill="#BDC6B0"/>
  <path d="m47 591 10 46m44-96 12 110m38-121 13 122m44-119 13 115m41-99 9 87" stroke="#8CA094" stroke-width="1.8" opacity=".55"/>
  <path d="M24 575c20-30 78-49 136-45 61 2 117 26 138 57-31 32-88 43-151 36-64-7-108-22-123-48Z" fill="#FFF2CF"/>
  <path d="M37 574c30-26 80-38 132-32 47 5 88 21 113 44-34 23-82 30-133 24-51-6-91-19-112-36Z" fill="url(#sand)"/>
  <path d="M39 598c57 29 162 38 234 14" stroke="#C8A56E" stroke-width="2" opacity=".5"/>
  <path d="m494 637 1-43 20-34 48-24 86-11 73 15 50 31 16 40-31 30-70 18-154-5Z" fill="#92A69C"/>
  <path d="m494 637 1-43 20-34 43-22-4 117-39-8Zm60 18 12-119 49-9-9 130Zm52 2 17-131 49 7-9 124Zm57 0 16-123 39 10 2 106Zm57-7 3-53 31-7 34 21-31 30Z" fill="#BDC6B0"/>
  <path d="m529 636 9-87m41 99 13-115m44 119 13-122m38 121 12-110m44 96 10-46" stroke="#8CA094" stroke-width="1.8" opacity=".55"/>
  <path d="M502 587c21-31 77-55 138-57 58-4 116 15 136 45-15 26-59 41-123 48-63 7-120-4-151-36Z" fill="#FFF2CF"/>
  <path d="M518 586c25-23 66-39 113-44 52-6 102 6 132 32-21 17-61 30-112 36-51 6-99-1-133-24Z" fill="url(#sand)"/>
  <path d="M527 612c72 24 177 15 234-14" stroke="#C8A56E" stroke-width="2" opacity=".5"/>
 </g>
 <path d="M51 547c7-37 33-64 66-65 32-2 53 21 67 57l-5 23Z" fill="#9EBB79"/>
 <path d="M635 548c15-38 43-58 75-47 25 8 39 29 47 58Z" fill="#A4BB7E"/>
 <path d="M92 562c-1-38-7-78-17-113l13-6c13 40 18 79 19 119Z" fill="#B08046"/>
 <path d="m88 483-12-6m17 29-12-6m17 29-13-5" stroke="#896136" stroke-width="2.5" stroke-linecap="round"/>
 <g class="sanctum-palm"><g fill="#78AA4E"><path d="M86 447c-32-19-65-14-85 11 30-8 57-9 85-11Z"/><path d="M85 448c-39 1-62 24-66 58 23-25 44-43 66-58Z"/><path d="M85 442c-21-33-15-66 10-90 2 35-1 65-10 90Z"/><path d="M89 444c21-29 55-34 85-14-31-1-56 5-85 14Z"/><path d="M89 448c38-2 65 16 76 48-30-18-54-34-76-48Z"/></g><path d="M87 443c-24-12-48-11-69-6 24-20 51-16 69 6Zm4-3c7-27 7-52 4-88 12 33 9 64-4 88Z" fill="#A1C36B"/></g>

 <!-- Returns, facade and arch all share the same frontal elevation. -->
 <path d="m126 298-19 14v238l19 13Zm548 0 19 14v238l-19 13Z" fill="#C2AE87"/>
 <path d="M126 298h122v265H126Zm426 0h122v265H552Z" fill="url(#stone)"/>
 <path d="M235 302h13v261h-13Zm317 0h13v261h-13Z" fill="#D0B990"/>
 <path d="M105 278c52 13 94 9 151-9l9 25c-58 20-107 24-155 10Zm430 16 9-25c57 18 99 22 151 9l-5 26c-48 14-97 10-155-10Z" fill="#2E9CB5" stroke="#23849E" stroke-width="1.2" stroke-linejoin="round"/>
 <path d="M108 278c50 12 94 8 145-9m294 0c51 17 95 21 145 9" stroke="#9AE2E8" stroke-width="3" stroke-linecap="round"/>
 <path d="M113 308h139m296 0h139" stroke="#F8E8C4" stroke-width="5"/>
 <path d="M133 315v13m32-13v13m32-13v13m32-13v13m342-13v13m32-13v13m32-13v13m32-13v13" stroke="#C9B084" stroke-width="3" stroke-linecap="round"/>
 <use href="#books" transform="translate(140 346)"/><use href="#books" transform="translate(570 346)"/>
 <rect x="135" y="341" width="100" height="149" rx="22" stroke="#C3A97C" stroke-width="2"/><rect x="565" y="341" width="100" height="149" rx="22" stroke="#C3A97C" stroke-width="2"/>
 <path d="M135 496h100m330 0h100" stroke="#CBB285" stroke-width="5" stroke-linecap="round"/>
 <path d="M126 518h122m304 0h122M126 557h122m304 0h122" stroke="#D3BD95" stroke-width="1.5"/>
 ${board(151,523,70,29)}<path d="M161 532h49m-49 6h35m-35 6h42" stroke="#A5A585" stroke-width="1.5" stroke-linecap="round"/>
 <path d="M580 531c9-8 17-8 26 0s17 8 26 0m-52 11c9-8 17-8 26 0s17 8 26 0" stroke="#B69F77" stroke-width="2" stroke-linecap="round"/>
 <path d="${arch}" fill="url(#stone)" stroke="#C8B084" stroke-width="1.2" stroke-linejoin="round"/>
 <path d="M252 604V334a148 148 0 0 1 296 0v270" stroke="#FFF6DD" stroke-width="4"/>
 <path d="M281 603V334a119 119 0 0 1 238 0v269" stroke="#BBA174" stroke-width="2"/>
 <g clip-path="url(#arch-contour)" stroke="#CCB58A" stroke-width="1.5">${joints}<path d="M244 380h45m-45 44h45m-45 44h45m-45 44h45m223-132h45m-45 44h45m-45 44h45m-45 44h45"/></g>
 <path d="M234 565h60v50h-60Zm272 0h60v50h-60Z" fill="#D3BC92"/>
 <path d="M234 565h60v12h-60Zm272 0h60v12h-60Z" fill="#F5E4BE"/>
 <path d="M258 386v163m284-163v163" stroke="#F8EDCE" stroke-width="4" stroke-linecap="round"/>
 <path d="m267 403-5 7 5 7 5-7Zm0 81-5 7 5 7 5-7Zm266-81-5 7 5 7 5-7Zm0 81-5 7 5 7 5-7Z" fill="#68AEB1"/>

 <!-- The fascia, tile grid and highlights are clipped to one continuous roof. -->
 <path d="M166 249C263 244 321 143 400 101C479 143 537 244 634 249L622 273C529 259 473 172 400 133C327 172 271 259 178 273Z" fill="#D7BB87"/>
 <path d="M178 254C278 228 326 142 400 108C474 142 522 228 622 254L554 334A154 154 0 0 0 246 334Z" fill="#F1DEB7"/>
 <path d="${roof}" fill="url(#roof)" stroke="#23849E" stroke-width="1.5" stroke-linejoin="round"/>
 <g clip-path="url(#roof-contour)" stroke="#247F9C" stroke-width="1.3" opacity=".4">${tiles}<path d="M138 230C249 230 304 118 400 78C496 118 551 230 662 230M145 244C253 244 311 134 400 92C489 134 547 244 655 244"/></g>
 <path d="M154 225C249 221 308 109 400 68C492 109 551 221 646 225" stroke="#A2E7E9" stroke-width="4" stroke-linecap="round"/>
 <path d="M162 248C263 243 321 144 400 102C479 144 537 243 638 248" stroke="#1F7A97" stroke-width="2"/>
 <path d="M388 71h24l-4 28h-16Z" fill="#E5C78F"/><path d="M393 75h8v20h-8Z" fill="#F8E6BC"/>
 <g color="#458C99" transform="translate(400 163) scale(.72)"><use href="#book-mark"/></g>
 <rect x="310" y="198" width="180" height="49" rx="11" fill="#D3B783"/>
 <rect x="313" y="196" width="174" height="47" rx="10" fill="#FFF1CE" stroke="#C8AA76" stroke-width="1.5"/>
 <path d="M323 202h154" stroke="#FFFBEB" stroke-width="2" stroke-linecap="round"/>
 <text x="400" y="228" text-anchor="middle" fill="#256378" font-family="Prompt, 'Segoe UI', sans-serif" font-size="29" font-weight="600">NextSkill</text>
 ${lamp(237,316)}${lamp(563,316,1,'sanctum-lantern--right')}
 <g transform="translate(651 317)"><g class="sanctum-vine"><path d="M0 0c-12 25-4 43-20 66" stroke="#789951" stroke-width="2"/><path d="M-4 10c-13-7-23-3-24 6 12 5 21 1 24-6Zm-1 21c13-8 23-5 24 4-12 6-20 3-24-4Zm-8 18c-11-6-21-1-20 8 11 3 18-1 20-8Z" fill="#86AE59"/></g></g>
 <g transform="translate(207 274)"><g class="sanctum-vine sanctum-vine--left"><path d="M0 0c12 21 7 38 20 58" stroke="#789951" stroke-width="2"/><path d="M3 9c13-7 23-3 24 5-11 6-20 3-24-5Zm7 23C-3 25-12 30-12 39c11 5 19 2 22-7Z" fill="#97B96C"/></g></g>

 <!-- Shore furnishings sit on the same ground plane. -->
 <path d="M54 555h30v37H54Z" fill="#C8B087"/><path d="M49 550h40v10H49Z" fill="#F6E3BB"/>${lamp(69,523,.9,'sanctum-lantern--shore')}
 <path d="M141 300V180" stroke="#A67F48" stroke-width="4" stroke-linecap="round"/><circle cx="141" cy="179" r="5" fill="#E4C48C"/>
 <g class="sanctum-flag"><path d="M145 187c19 6 38-5 58 0l-8 23 8 22c-20-5-39 6-58 0Z" fill="#3DAFC0"/><g color="#F1FBE9" transform="translate(172 207) scale(.5)"><use href="#book-mark"/></g></g>
 <g class="sanctum-reading-nook"><path d="M665 543v41m75-41v41" stroke="#98794F" stroke-width="4" stroke-linecap="round"/><path d="M659 533h88v13h-88Z" fill="#86B4B0"/><path d="M657 558h93v10h-93Z" fill="#BD9C6D"/><path d="M665 536h74" stroke="#BBD8C7" stroke-width="2"/><rect x="680" y="550" width="36" height="8" rx="2" fill="#D29A79"/><path d="M686 548v-18c9-3 17-1 24 4 7-5 15-7 24-4v18c-9-2-17-1-24 4-7-5-15-6-24-4Z" fill="#FFF0CC" stroke="#C7AC7A" stroke-width="1.4"/><path d="M710 534v18" stroke="#C7AC7A" stroke-width="1.3"/></g>
 <g class="sanctum-star-chart"><path d="m687 476-6 54m44-54 6 54" stroke="#987B51" stroke-width="3" stroke-linecap="round"/>${board(675,431,60,53)}<rect x="680" y="436" width="50" height="43" rx="3" fill="#4B8D99"/><path d="m688 465 11-17 12 15 11-18m-34 20 23-2" stroke="#BCDCCA" stroke-width="1.2"/><g fill="#F5E9BB"><circle cx="688" cy="465" r="2"/><circle cx="699" cy="448" r="2"/><circle cx="711" cy="463" r="2"/><circle cx="722" cy="445" r="2"/></g></g>
 <g class="sanctum-book-cart"><path d="M91 566h44v24H91Z" fill="#AF9062"/><path d="M92 572h42m-34-6v24m25-24v24m12-4h7v-31" stroke="#8D734E" stroke-width="1.5" stroke-linecap="round"/><circle cx="99" cy="593" r="3.5" fill="#766B53"/><circle cx="127" cy="593" r="3.5" fill="#766B53"/><rect x="94" y="558" width="34" height="7" rx="2" fill="#82B2AE"/><rect x="101" y="549" width="30" height="8" rx="2" fill="#D29D7A"/><path d="M97 561h27m-20-8h23" stroke="#F4E5C2" stroke-width="1.5"/></g>
 ${shrub(117,586,.78)}${shrub(637,599,.75,'sanctum-foliage--right')}${shrub(238,608,.38)}${shrub(559,613,.38)}${shrub(720,537,.47)}
 <g fill="#F5E9C4"><circle cx="45" cy="601" r="4"/><circle cx="51" cy="597" r="4"/><circle cx="56" cy="604" r="4"/><circle cx="744" cy="603" r="4"/><circle cx="750" cy="599" r="4"/><circle cx="755" cy="606" r="4"/></g><g fill="#D0AC62"><circle cx="51" cy="603" r="2.5"/><circle cx="750" cy="605" r="2.5"/></g>
 <g fill="#C6A679" opacity=".7"><ellipse cx="168" cy="607" rx="9" ry="3"/><ellipse cx="193" cy="613" rx="5" ry="2"/><ellipse cx="601" cy="617" rx="7" ry="2.5"/></g>
</g>

<g class="sanctum-ripples" stroke="#D8FAF3" stroke-linecap="round"><path d="M14 628c24 18 69 30 119 32m27 0c56 3 111-4 145-18m190 0c34 14 89 21 145 18m27 0c50-2 95-14 119-32" stroke-width="2.5" opacity=".7"/><path d="M32 649c37 18 89 27 140 26m27-1c29-2 55-6 75-12m252 0c20 6 46 10 75 12m27 1c51 1 103-8 140-26" stroke-width="1.8" opacity=".35"/></g>

<!-- A gull flies in, folds its wings to perch, then leaves on a longer loop. -->
<g class="sanctum-gull" data-sanctum-motion transform="translate(175 282)">
 <path d="m-8-1-1 4m10-4 2 4" stroke="#AF9B72" stroke-width="1.8" stroke-linecap="round"/>
 <path d="M-11-14-26-15l13 10" fill="#BCCEC7"/>
 <ellipse cx="-2" cy="-11" rx="15" ry="9" fill="#FFFBEB" stroke="#668791" stroke-width="1.2"/>
 <g class="sanctum-gull-head"><path d="M3-12c0-7 1-15 8-15 8 0 11 6 7 12l-5 7" fill="#FFFBEB" stroke="#668791" stroke-width="1.2"/><path d="m18-21 11 4-12 2" fill="#C4A467"/><circle cx="13" cy="-22" r="1.4" fill="#375E70"/></g>
 <g class="sanctum-gull-wings" data-sanctum-motion><g class="sanctum-gull-wing" data-sanctum-motion><path d="M0-13c-13-23-31-28-49-24 18 6 30 15 38 30Z" fill="#ECF3E5" stroke="#7D9BA0" stroke-width="1.2"/></g><g class="sanctum-gull-wing sanctum-gull-wing--far" data-sanctum-motion><path d="M2-13c13-21 27-27 42-24-16 7-25 15-31 29Z" fill="#D6E5DC" stroke="#7D9BA0" stroke-width="1.2"/></g></g>
 <path d="M-13-11c7 1 13 0 18-2" stroke="#A8BCB5" stroke-width="2" stroke-linecap="round"/>
</g>
<!-- The fish stays in foreground water beyond the entrance route. -->
<g transform="translate(690 677)"><g class="sanctum-jumping-fish" data-sanctum-motion opacity="0"><path d="m-10-2-10-10 1 18 10-4" fill="#B98755"/><path d="M-11-5C-2-15 13-12 21-1 11 10-3 10-11-5Z" fill="#E0B37C" stroke="#A98457" stroke-width="1.2"/><path d="m0-10 6-7 5 8" fill="#D09F68"/><path d="M-6 1 5 4" stroke="#F6DBA9" stroke-width="1.5"/><circle cx="14" cy="-2" r="1.6" fill="#405F61"/></g></g>
<g transform="translate(764 681)"><g class="sanctum-fish-splash" data-sanctum-motion opacity="0" stroke="#E0FAEF" stroke-width="1.5" stroke-linecap="round"><ellipse rx="23" ry="4"/><path d="m-11-5-3-7m17 6 3-8m9 9 6-4"/></g></g>
</svg>`;
fs.writeFileSync(destination,svg.replace(/\r?\n/g,'\r\n'));
console.log('Drew the enlarged sea-library scene with shared architectural contours and wildlife.');
