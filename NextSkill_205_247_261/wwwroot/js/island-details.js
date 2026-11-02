(() => {
 const detail=document.getElementById('island-detail'),sheet=document.getElementById('island-detail-dialog');if(!detail||!sheet)return;
 const slot=document.getElementById('island-detail-slot'),current=document.querySelector('.sj-current-island'),mobile=matchMedia('(max-width:850px)');let launch;
 function reset(){if(sheet.open)sheet.close();detail.hidden=true;current.hidden=false;slot.append(detail);}
 function show(lesson,courseId,action){
  launch=action;document.getElementById('detail-number').textContent=`ด่าน ${lesson.id} · ${lesson.islandName}`;
  document.getElementById('detail-title').textContent=lesson.title;
  document.getElementById('detail-meta').textContent=`${lesson.minutes} นาที · ${lesson.xp} XP เมื่อผ่านครั้งแรก`;
  document.getElementById('detail-status').textContent=lesson.status==='completed'?'ผ่านด่านนี้แล้ว กลับมาทบทวนได้ทุกเมื่อ':'พร้อมเริ่มบทเรียนและแบบฝึกท้ายบท';
  document.getElementById('detail-start').textContent=lesson.status==='completed'?'ทบทวนบทเรียน →':'เริ่มเรียน →';
  detail.hidden=false;
  if(mobile.matches){sheet.append(detail);sheet.showModal();}else{slot.append(detail);current.hidden=true;document.getElementById('detail-start').focus({preventScroll:true});}
 }
 document.getElementById('detail-start').addEventListener('click',()=>{const action=launch;reset();action?.();});
 document.getElementById('detail-back').addEventListener('click',reset);document.getElementById('detail-sheet-close').addEventListener('click',reset);
 sheet.addEventListener('close',()=>{detail.hidden=true;slot.append(detail);current.hidden=false;});mobile.addEventListener('change',reset);
 window.NextSkillIslandDetails={show,reset};
})();
