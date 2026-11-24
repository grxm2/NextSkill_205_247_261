(() => {
    'use strict';
    const chart = document.getElementById('arch-chart');
    if (!chart || !document.body.classList.contains('island-journey-page')) return;
    const root = document.body;
    const seed = JSON.parse(document.getElementById('arch-data').textContent);
    const storageKey = 'nextskill.archipelago.v1';
    const practiceKey = 'nextskill.practice.feedback.v1';
    const practiceIds = ['notice-strength', 'offer-alternative', 'invite-response'];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const practice = document.getElementById('niko-practice-dialog');
    const challenge = document.getElementById('arch-challenge');
    const boat = document.getElementById('arch-vessel');
    const robot = document.querySelector('.skill-buddy');
    const guide = document.querySelector('.map-guide');
    const status = document.getElementById('home-status');
    const islands = {
        english: {name:'เกาะภาษา',course:'English for Business',lessons:seed.lessons.map((lesson,i)=>({...lesson,name:seed.lessonNames[i]}))},
        ux:{name:'เกาะนักออกแบบ',course:'UX Research',lessons:[{number:1,name:'เริ่มจากเข้าใจผู้ใช้',title:'Intro to UX'},{number:2,name:'ถามให้ได้เรื่องราว',title:'User Interviews'},{number:3,name:'ออกแบบคำถามแบบสำรวจ',title:'Surveys'}]},
        javascript:{name:'เกาะนักพัฒนา',course:'JavaScript Basics',lessons:['ตัวแปรและข้อมูล','เลือกชนิดข้อมูล','ตัดสินใจด้วยเงื่อนไข','ทำงานซ้ำด้วยลูป','แยกงานด้วยฟังก์ชัน','เก็บหลายค่าด้วยอาร์เรย์','อธิบายสิ่งของด้วยออบเจ็กต์','เชื่อมโค้ดกับหน้าเว็บ','รับเหตุการณ์จากผู้ใช้','ประกอบเป็นเว็บที่โต้ตอบได้'].map((name,i)=>({number:i+1,name,title:['Variables','Data types','Conditions','Loops','Functions','Arrays','Objects','The DOM','Events','Your first interaction'][i]}))}
    };
    const defaults = seed.lessons.filter(lesson=>lesson.status==='completed').map(lesson=>lesson.number);
    let state={version:1,completed:{english:[...defaults],ux:[],javascript:[]},uxOpen:false};
    let selected='english';
    let paused=window.NextSkillAgent?.isPaused()||false;
    let storageAvailable=true;
    let frame=0,geometryFrame=0;
    let sailingTimer,locateTimer;
    let manualUntil=0;
    let travelMotion=false;
    const controller=new AbortController();
    const eventOptions={signal:controller.signal};
    try{
        const saved=JSON.parse(localStorage.getItem(storageKey));
        if(saved?.version===1&&saved.completed){
            for(const key of Object.keys(islands)){
                const valid=Array.isArray(saved.completed[key])?saved.completed[key].filter(n=>Number.isInteger(n)&&n>0&&n<=islands[key].lessons.length):[];
                const done=new Set(key==='english'?[...defaults,...valid]:valid);
                state.completed[key]=islands[key].lessons.map(lesson=>lesson.number).filter((n,i,all)=>all.slice(0,i+1).every(value=>done.has(value)));
            }
            state.uxOpen=saved.uxOpen===true;
        }
    }catch{}
    function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{storageAvailable=false;document.querySelector('.island-preview-note').textContent='เบราว์เซอร์นี้บันทึกข้อมูลไม่ได้ · ยังสำรวจและฝึกต่อได้ในหน้านี้ แยกจากผลการเรียนและ XP จริง';}}
    function unlocked(key){return key==='english'||(key==='ux'?state.uxOpen:state.uxOpen&&state.completed.ux.length===islands.ux.lessons.length);}
    function currentNumber(key){return Math.min(state.completed[key].length+1,islands[key].lessons.length);}
    function motionAllowed(){return !paused&&!reduce.matches&&!document.hidden;}
    function announce(text){status.textContent=text;}
    function pose(name,event){window.NextSkillBuddyMotion?.play(name,robot,{motion:motionAllowed()&&event?.detail>0});}
    function setText(selector,text){const node=document.querySelector(selector);if(node)node.textContent=text;}
    function practiceComplete(){
        if(document.getElementById('niko-home-progress').textContent.trim()==='3 / 3')return true;
        try{const value=JSON.parse(localStorage.getItem(practiceKey));return value?.version===1&&Array.isArray(value.completed)&&practiceIds.every(id=>value.completed.includes(id));}catch{return false;}
    }
    function syncPractice(){
        if(practiceComplete()&&!state.uxOpen){
            state.uxOpen=true;if(!state.completed.english.includes(3))state.completed.english.push(3);
            save();render();setText('#niko-continue-lesson','ล่องเรือไปเกาะนักออกแบบ →');
            announce('ฝึกครบแล้ว หมอกที่เกาะนักออกแบบเปิดออก พร้อมเดินทางต่อ');pose('celebrate',{detail:1});
        }
    }
    function lessonButton(key,lesson){
        const button=document.createElement('button');button.type='button';button.className='island-lesson';
        const done=state.completed[key].includes(lesson.number);
        const current=unlocked(key)&&!done&&lesson.number===currentNumber(key);
        button.classList.add(done?'completed':current?'current':'locked');
        button.dataset.lesson=String(lesson.number);button.dataset.lessonIsland=key;
        button.disabled=!unlocked(key)||(!done&&!current);
        button.title=`${lesson.number}. ${lesson.name}`;
        button.setAttribute('aria-label',`${done?'ทบทวน':current?'เรียนต่อ':'ยังไม่ปลดล็อก'} ด่าน ${lesson.number} ${lesson.name}`);
        if(current)button.setAttribute('aria-current','step');
        const number=document.createElement('span');number.textContent=lesson.number;
        const icon=document.createElement('span');icon.className=`icon ${done?'icon-check':current?'icon-book':'icon-lock'}`;icon.setAttribute('aria-hidden','true');
        button.append(number,icon);return button;
    }
    function render(){
        for(const [key,island]of Object.entries(islands)){
            const open=unlocked(key),count=state.completed[key].length,complete=count===island.lessons.length;
            const stop=document.querySelector(`[data-stop="${key}"]`),button=stop.querySelector('[data-island]');
            stop.classList.toggle('is-fogged',!open);stop.classList.toggle('is-selected',selected===key);
            button.classList.toggle('is-fogged',!open);button.classList.toggle('is-selected',selected===key);
            button.setAttribute('aria-pressed',String(selected===key));
            button.setAttribute('aria-label',`${island.name} ${open?`สำรวจแล้ว ${count} จาก ${island.lessons.length} ด่าน`:'ยังมีหมอกบัง กดสำรวจได้'}`);
            setText(`[data-island-state="${key}"]`,open?`${count}/${island.lessons.length}`:'รอสำรวจ');
            setText(`[data-stop-state="${key}"]`,!open?'ยังมีหมอกบัง':complete?'สำรวจครบแล้ว':count?'กำลังเรียน':'พร้อมออกเดินทาง');
            setText(`[data-progress-caption="${key}"]`,`สำรวจแล้ว ${count} จาก ${island.lessons.length} ด่าน`);
            setText(`[data-progress-value="${key}"]`,`${Math.round(count/island.lessons.length*100)}%`);
            const progress=stop.querySelector('progress');progress.max=island.lessons.length;progress.value=count;progress.textContent=`${count} / ${island.lessons.length}`;
            setText(`[data-next-lesson="${key}"]`,!open?(key==='ux'?'เปิดเส้นทางเมื่อฝึกฟีดแบ็กกับ Nimo ครบ 3 สถานการณ์':'เปิดเส้นทางเมื่อผ่านแบบฝึก UX ทั้ง 3 ด่าน'):complete?'สำรวจครบแล้ว กลับมาทบทวนได้เสมอ':`ด่านถัดไป · ${island.lessons[currentNumber(key)-1].name}`);
            stop.querySelector('[data-start-island]').firstChild.textContent=!open?'ไปเปิดเส้นทาง ':complete?'ทบทวนกับ Nimo ':count?'เรียนต่อกับ Nimo ':'เริ่มสำรวจเกาะนี้ ';
            const list=stop.querySelector('[data-lesson-list]');
            const focused=document.activeElement?.dataset.lessonIsland===key?Number(document.activeElement.dataset.lesson):null;
            list.replaceChildren(...island.lessons.map(lesson=>lessonButton(key,lesson)));
            if(focused&&!document.querySelector('dialog[open]'))list.querySelector(`[data-lesson="${focused}"]`)?.focus({preventScroll:true});
            const port=document.querySelector(`[data-select-island="${key}"]`);port.setAttribute('aria-pressed',String(selected===key));
            port.querySelector('.icon').className=`icon ${open?'icon-compass':'icon-lock'}`;
        }
        const pin=document.querySelector('.arch-pin');document.querySelector(`[data-island="${selected}"]`).append(pin);pin.hidden=!unlocked(selected);
        setText('#arch-open-count',Object.keys(islands).filter(unlocked).length);
        document.querySelectorAll('.route-ux').forEach(line=>line.classList.toggle('is-open',unlocked('ux')));
        document.querySelectorAll('.route-javascript').forEach(line=>line.classList.toggle('is-open',unlocked('javascript')));
        const all=unlocked('javascript');
        setText('#arch-voyage-title',all?'สามเกาะ เชื่อมทักษะของคุณ':state.uxOpen?'จากการออกแบบ สู่การเขียนโค้ด':'จากภาษา สู่การออกแบบ');
        setText('#arch-voyage-description',all?'ทุกเส้นทางเปิดแล้ว ลองต่อยอดหรือกลับมาทบทวนทักษะที่อยากฝึก':state.uxOpen?'ผ่านแบบฝึก UX ทั้ง 3 ด่าน เพื่อเปิดเส้นทางไปเกาะ JavaScript':'ฝึกฟีดแบ็กกับ Nimo ครบ 3 สถานการณ์ เพื่อเปิดหมอกไปยังเกาะ UX');
        document.getElementById('arch-voyage-action').firstChild.textContent=all?'ไปเกาะนักพัฒนา ':state.uxOpen?'ไปฝึกบนเกาะนักออกแบบ ':'เริ่มภารกิจเปิดเส้นทาง ';
        queueGeometry();
    }
    function selectIsland(key,event,notify=true){
        if(!islands[key])return;selected=key;travelMotion=event?event.detail>0:true;render();
        pose(unlocked(key)?'point':'think',event);
        if(notify)announce(`เลือก${islands[key].name} ${unlocked(key)?`สำรวจแล้ว ${state.completed[key].length} จาก ${islands[key].lessons.length} ด่าน`:'ยังมีหมอกบัง ดูภารกิจเปิดเส้นทางที่เกาะนี้ได้'}`);
    }
    function scrollTo(target,event,block='center'){target?.scrollIntoView({block,behavior:motionAllowed()&&event?.detail>0?'smooth':'instant'});}
    function visit(key,event){manualUntil=performance.now()+1400;selectIsland(key,event);scrollTo(document.querySelector(`[data-stop="${key}"]`),event,'start');}
    function locate(event){
        const key=unlocked(selected)?selected:state.uxOpen?'ux':'english';
        manualUntil=performance.now()+1400;selectIsland(key,event,false);
        const stop=document.querySelector(`[data-stop="${key}"]`);stop.querySelector('details').open=true;
        const target=stop.querySelector('.island-lesson.current')||stop.querySelector('.island-lesson.completed');
        scrollTo(target,event,'center');target?.focus({preventScroll:true});target?.classList.add('is-located');
        clearTimeout(locateTimer);locateTimer=setTimeout(()=>target?.classList.remove('is-located'),1800);queueGeometry();
    }
    function openPractice(){document.getElementById('niko-practice-start').click();}
    function startLesson(key,number,event){
        manualUntil=performance.now()+1400;selectIsland(key,event,false);
        if(!unlocked(key))return startVoyage(event,key==='javascript'?'ux':'english');
        if(key==='english'&&number===3)return openPractice();
        openChallenge(key,number,event);
    }
    function startVoyage(event,target){
        if(target==='english'||!state.uxOpen){selectIsland('english',event,false);openPractice();}
        else if(target==='ux'||(!target&&!unlocked('javascript'))){selectIsland('ux',event,false);openChallenge('ux',currentNumber('ux'),event);}
        else visit('javascript',event);
    }
    document.querySelectorAll('[data-island]').forEach(button=>button.addEventListener('click',event=>{manualUntil=performance.now()+1400;selectIsland(button.dataset.island,event);},eventOptions));
    document.querySelectorAll('[data-select-island]').forEach(button=>button.addEventListener('click',event=>visit(button.dataset.selectIsland,event),eventOptions));
    document.querySelectorAll('[data-start-island]').forEach(button=>button.addEventListener('click',event=>startLesson(button.dataset.startIsland,currentNumber(button.dataset.startIsland),event),eventOptions));
    chart.addEventListener('click',event=>{const button=event.target.closest('[data-lesson]');if(button&&!button.disabled)startLesson(button.dataset.lessonIsland,Number(button.dataset.lesson),event);},eventOptions);
    document.querySelector('[data-course-link="english"]').addEventListener('click',event=>{event.preventDefault();selected='english';locate(event);},eventOptions);
    document.getElementById('arch-locate').addEventListener('click',locate,eventOptions);
    document.getElementById('arch-voyage-action').addEventListener('click',event=>startVoyage(event),eventOptions);
    chart.querySelectorAll('details').forEach(details=>details.addEventListener('toggle',queueGeometry,eventOptions));
    const practiceObserver=new MutationObserver(syncPractice);practiceObserver.observe(document.getElementById('niko-home-progress'),{childList:true,subtree:true});
    practice.addEventListener('close',()=>{syncPractice();render();dockNiko();},eventOptions);
    document.getElementById('niko-continue-lesson').addEventListener('click',event=>state.uxOpen?visit('ux',event):locate(event),eventOptions);

    const uxQuestions = [
        { question: 'ทีมอยากเพิ่มฟีเจอร์ใหม่ ก่อนเริ่มออกแบบ ควรทำอะไรเป็นอันดับแรก?', choices: ['เลือกสีและฟอนต์ให้สวยก่อน', 'ทำความเข้าใจปัญหาและบริบทของผู้ใช้', 'เพิ่มทุกฟีเจอร์ที่คู่แข่งมี'], answer: 1, explanation: 'เริ่มจากเข้าใจคนและปัญหาที่เขาเจอ จะช่วยให้เรารู้ว่าควรแก้อะไร ก่อนตัดสินใจสร้างฟีเจอร์' },
        { question: 'คำถามไหนช่วยให้ผู้ใช้เล่าประสบการณ์จริงได้ดีที่สุด?', choices: ['เล่าครั้งล่าสุดที่คุณจองตั๋วให้ฟังหน่อยได้ไหม?', 'คุณชอบแอปของเราใช่ไหม?', 'ถ้าแอปสีฟ้าขึ้น คุณจะใช้แน่นอนใช่ไหม?'], answer: 0, explanation: 'คำถามเปิดที่อิงเหตุการณ์จริง ช่วยให้ได้เรื่องราวและบริบท โดยไม่ชี้นำคำตอบของผู้ใช้' },
        { question: 'อยากรู้ว่าผู้ใช้เจอปัญหาบ่อยแค่ไหน ควรถามอย่างไร?', choices: ['คุณเห็นด้วยไหมว่าแอปเราง่ายและรวดเร็ว?', 'ทำไมคุณถึงไม่ชอบแอปของเรา?', 'ใน 7 วันที่ผ่านมา คุณเจอปัญหานี้กี่ครั้ง?'], answer: 2, explanation: 'กำหนดช่วงเวลาและถามเรื่องเดียวให้ชัด ช่วยให้ผู้ใช้ตอบได้ตรงและนำผลไปเปรียบเทียบได้' }
    ];
    const englishQuestions = [
        ['คุณจะเริ่มนำเสนอหัวข้อของวันนี้อย่างไร?', ['Today, I’ll walk you through our proposal.', 'You must listen to me.', 'I have nothing to share.'], 0, 'บอกให้ผู้ฟังรู้ว่าจะได้ฟังเรื่องอะไร ช่วยให้ตามการนำเสนอได้ง่ายขึ้น'],
        ['อยากเสนอข้อตกลงที่เป็นประโยชน์กับทั้งสองฝ่าย ควรพูดว่าอะไร?', ['Take it or leave it.', 'Could we find an option that works for both sides?', 'Only our needs matter.'], 1, 'ชวนหาทางเลือกที่ตอบโจทย์ทั้งสองฝ่าย ทำให้การเจรจาเปิดกว้างขึ้น'],
        ['หัวข้ออีเมลไหนบอกงานและกำหนดเวลาได้ชัดที่สุด?', ['Hello', 'Important thing', 'Review request: Q3 proposal by Friday'], 2, 'ระบุสิ่งที่ต้องการให้ทำ เรื่องที่เกี่ยวข้อง และกำหนดเวลาในหัวข้อให้ชัด'],
        ['ก่อนจบประชุม คุณควรสรุปอย่างไร?', ['Let’s confirm the next steps and who owns each one.', 'I guess we’re done.', 'Someone will do something.'], 0, 'สรุปขั้นตอนถัดไปพร้อมคนรับผิดชอบ ช่วยให้ทุกคนเข้าใจตรงกัน'],
        ['เมื่อเพื่อนร่วมทีมต้องการความช่วยเหลือ ควรถามว่าอะไร?', ['That’s your problem.', 'How can I support you with this task?', 'Just work faster.'], 1, 'ถามให้ชัดว่าจะช่วยตรงไหน เพื่อทำงานร่วมกันได้ดีขึ้น'],
        ['พบปัญหาระหว่างทำงาน คุณจะเริ่มชวนทีมแก้อย่างไร?', ['Nothing can be done.', 'It is always your fault.', 'Let’s identify the cause and explore our options.'], 2, 'เริ่มจากหาสาเหตุแล้วพิจารณาทางเลือก ช่วยให้คุยเรื่องปัญหาได้สร้างสรรค์'],
        ['อยากแบ่งปันไอเดียที่ต่างจากเดิม ควรเปิดอย่างไร?', ['I have an idea we could explore together.', 'My idea is the only good one.', 'Forget everyone else’s ideas.'], 0, 'ชวนให้ทีมสำรวจไอเดียด้วยกัน โดยเปิดรับมุมมองอื่น'],
        ['ลูกค้าแจ้งปัญหา คุณจะตอบรับอย่างไร?', ['That can’t be true.', 'Thanks for letting us know. Could you tell me more?', 'Please stop complaining.'], 1, 'ขอบคุณที่แจ้งและขอรายละเอียดเพิ่ม เพื่อเข้าใจปัญหาให้ตรงก่อนแก้'],
        ['คุณเห็นต่างจากเพื่อน ควรพูดอย่างไร?', ['You are completely wrong.', 'This is a terrible idea.', 'I see your point. Could we also consider another approach?'], 2, 'รับรู้มุมมองของเพื่อนก่อน แล้วเสนอทางเลือกเพิ่มเติมอย่างสุภาพ'],
        ['อยากเล่าเหตุการณ์ให้เข้าใจง่าย ควรเริ่มจากอะไร?', ['อธิบายบริบท แล้วเรียงเหตุการณ์และผลที่เกิดขึ้น', 'เล่าทุกรายละเอียดโดยไม่จัดลำดับ', 'ข้ามเหตุการณ์ไปบอกแค่ความรู้สึก'], 0, 'บริบทและลำดับเหตุการณ์ช่วยให้ผู้ฟังตามเรื่องและเข้าใจผลลัพธ์'],
        ['อยากเปิดโอกาสให้เพื่อนในวงสนทนาได้พูด ควรถามว่าอะไร?', ['I’ll do all the talking.', 'What’s your perspective on this?', 'There’s no time for other opinions.'], 1, 'ถามมุมมองของคนอื่นโดยตรง เพื่อให้การสนทนามีส่วนร่วมมากขึ้น'],
        ['การนำเสนอโปรเจกต์ควรอธิบายเรื่องใดให้ชัด?', ['ชื่อทีมเพียงอย่างเดียว', 'ทุกฟีเจอร์โดยไม่บอกประโยชน์', 'ปัญหาที่แก้ แนวทาง และคุณค่าที่ผู้ใช้จะได้รับ'], 2, 'เชื่อมปัญหา แนวทาง และคุณค่า ให้คนฟังเข้าใจว่าโปรเจกต์นี้ช่วยใครและช่วยอย่างไร'],
        ['หลังได้รับฟีดแบ็ก คุณจะยืนยันขั้นตอนถัดไปอย่างไร?', ['Thanks. I’ll revise the draft and share it by Thursday.', 'Whatever.', 'I won’t change anything.'], 0, 'ขอบคุณและยืนยันงานที่จะทำพร้อมเวลา ช่วยให้คนร่วมงานติดตามต่อได้']
    ].map(([question, choices, answer, explanation]) => ({ question, choices, answer, explanation }));
    const jsQuestions = [
        ['ต้องการเก็บคะแนนที่เปลี่ยนแปลงได้ ควรประกาศแบบใด?', ['const score = 0;', 'let score = 0;', 'fixed score = 0;'], 1, 'let ใช้กับตัวแปรที่ต้องกำหนดค่าใหม่ได้ ส่วน const ไม่สามารถกำหนดค่าใหม่ให้ตัวแปรได้'],
        ['ค่าใดเป็นข้อความ (string) ใน JavaScript?', ['42', 'true', '"NextSkill"'], 2, 'ข้อความเขียนอยู่ในเครื่องหมายคำพูด เช่น "NextSkill" ส่วน 42 เป็นตัวเลข และ true เป็น boolean'],
        ['อยากทำงานเฉพาะเมื่อคะแนนมากกว่าหรือเท่ากับ 80 ควรใช้เงื่อนไขใด?', ['if (score >= 80)', 'if (score = 80)', 'if (score < 80)'], 0, '>= ใช้เปรียบเทียบว่าค่าด้านซ้ายมากกว่าหรือเท่ากับด้านขวา'],
        ['เครื่องมือใดเหมาะกับการทำงานเดิมซ้ำหลายรอบ?', ['comment', 'for loop', 'string'], 1, 'ลูปช่วยให้ทำชุดคำสั่งซ้ำตามเงื่อนไข โดยไม่ต้องเขียนคำสั่งเดิมหลายครั้ง'],
        ['ฟังก์ชันช่วยเรื่องใดเป็นหลัก?', ['เปลี่ยนทุกค่าเป็นข้อความ', 'ใช้แทนการเก็บข้อมูลทั้งหมด', 'รวมขั้นตอนการทำงานให้เรียกใช้ซ้ำได้'], 2, 'แยกงานเป็นฟังก์ชัน ช่วยให้เรียกใช้ซ้ำ เข้าใจ และดูแลโค้ดได้ง่ายขึ้น'],
        ['ถ้า const skills = ["UX", "JS"] แล้ว skills[0] มีค่าอะไร?', ['"UX"', '"JS"', 'undefined'], 0, 'อาร์เรย์ใน JavaScript เริ่มนับตำแหน่งที่ 0 ดังนั้นสมาชิกตัวแรกคือ "UX"'],
        ['โครงสร้างใดเหมาะกับข้อมูลผู้เรียนที่มี name และ level?', ['"name, level"', '{ name: "Nimo", level: 1 }', 'name + level'], 1, 'ออบเจ็กต์ใช้เก็บข้อมูลเป็นคู่ชื่อกับค่า เหมาะกับสิ่งที่มีหลายคุณสมบัติ'],
        ['ต้องการเลือกปุ่มที่มี id="start" บนหน้าเว็บ ใช้คำสั่งใด?', ['document.open("start")', 'window.button("start")', 'document.querySelector("#start")'], 2, 'querySelector ใช้ CSS selector เลือกองค์ประกอบ โดย #start หมายถึง id ที่ชื่อ start'],
        ['ต้องการทำงานเมื่อผู้ใช้คลิกปุ่ม ควรใช้เหตุการณ์ใด?', ['click', 'font', 'margin'], 0, 'เหตุการณ์ click ใช้รับการกดปุ่มจากผู้ใช้ รวมถึงการเปิดใช้งานด้วยคีย์บอร์ด'],
        ['ปุ่มเรียนต่อควรเปลี่ยนข้อความหลังผู้ใช้ทำภารกิจเสร็จ ควรทำอย่างไร?', ['เปลี่ยนเฉพาะสีภาพพื้นหลัง', 'รับเหตุการณ์ ตรวจสถานะ แล้วอัปเดตข้อความบน DOM', 'ปิดการกดปุ่มทั้งหมดถาวร'], 1, 'เชื่อมเหตุการณ์ สถานะ และ DOM เข้าด้วยกัน ทำให้หน้าเว็บตอบสนองต่อการใช้งานจริง']
    ].map(([question, choices, answer, explanation]) => ({ question, choices, answer, explanation }));
    const introductionQuestions = [
        { question: 'เจอเพื่อนร่วมทีมครั้งแรก ประโยคไหนเหมาะกับการแนะนำตัว?', choices: ['Hi, I’m Nimo. I work on the design team.', 'Who are you? Go away.', 'I don’t want to talk.'], answer: 0, explanation: 'เริ่มด้วยคำทักทาย ชื่อ และบทบาทสั้น ๆ ช่วยให้เพื่อนร่วมทีมรู้จักคุณและเริ่มคุยต่อได้' },
        { question: 'อยากขอให้เพื่อนร่วมทีมช่วยอธิบายงานอีกครั้ง ควรพูดว่าอะไร?', choices: ['You make no sense.', 'Could you walk me through that again, please?', 'I won’t listen.'], answer: 1, explanation: 'ขอให้อธิบายอีกครั้งอย่างสุภาพ ช่วยให้คุณเข้าใจงานและทำงานร่วมกันได้มั่นใจขึ้น' }
    ];


    let challengeKey='ux',challengeNumber=1,reviewing=false,challengeAnswered=false,challengeOpener;
    function getQuestion(){return challengeKey==='ux'?uxQuestions[challengeNumber-1]:challengeKey==='javascript'?jsQuestions[challengeNumber-1]:challengeNumber<3?introductionQuestions[challengeNumber-1]:englishQuestions[challengeNumber-4];}
    function renderQuestion(){
        challengeAnswered=false;const island=islands[challengeKey],question=getQuestion();
        setText('#arch-challenge-island',`${island.name} · ${reviewing?'ทบทวน':'แบบฝึกตัวอย่าง'} ด่าน ${challengeNumber} / ${island.lessons.length}`);
        setText('#arch-challenge-title',island.lessons[challengeNumber-1].name);setText('#arch-challenge-question',question.question);
        const choices=document.getElementById('arch-challenge-options');choices.replaceChildren();
        question.choices.forEach((label,index)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.choice=String(index);button.addEventListener('click',event=>answerQuestion(index,button,event));choices.append(button);});
        setText('#arch-challenge-feedback','');delete document.getElementById('arch-challenge-feedback').dataset.correct;document.getElementById('arch-challenge-next').hidden=true;challenge.scrollTop=0;
    }
    function openChallenge(key,number,event){
        if(!unlocked(key))return;challengeKey=key;challengeNumber=number;reviewing=state.completed[key].includes(number);challengeOpener=document.activeElement;
        renderQuestion();challenge.showModal();window.NextSkillAgent?.refresh();document.getElementById('arch-challenge-title').focus({preventScroll:true});pose('read',event);
    }
    function answerQuestion(index,button,event){
        if(challengeAnswered)return;const question=getQuestion(),right=index===question.answer;
        challenge.querySelectorAll('.is-retry').forEach(choice=>choice.classList.remove('is-retry'));button.classList.add(right?'is-correct':'is-retry');
        const feedback=document.getElementById('arch-challenge-feedback');feedback.dataset.correct=String(right);feedback.textContent=right?question.explanation:'ลองอีกครั้งนะ มองหาคำตอบที่ตรงกับสถานการณ์ หรืออ่านคำถามอีกครั้งได้เลย';pose(right?'nod':'retry',event);
        if(!right)return;challengeAnswered=true;challenge.querySelectorAll('#arch-challenge-options button').forEach(choice=>{choice.disabled=true;});
        const jsWasOpen=unlocked('javascript');if(!state.completed[challengeKey].includes(challengeNumber))state.completed[challengeKey].push(challengeNumber);save();render();
        const next=document.getElementById('arch-challenge-next');next.hidden=false;next.textContent=!jsWasOpen&&unlocked('javascript')?'เปิดหมอกไปเกาะนักพัฒนา →':reviewing?'กลับสู่เส้นทาง →':challengeNumber<islands[challengeKey].lessons.length?'ไปด่านถัดไป →':'กลับสู่หมู่เกาะ →';
        if(!jsWasOpen&&unlocked('javascript')){announce('ผ่านแบบฝึก UX ครบแล้ว หมอกที่เกาะนักพัฒนาเปิดออก พร้อมล่องเรือไปเรียน JavaScript');pose('celebrate',event);}
    }
    document.getElementById('arch-challenge-next').addEventListener('click',event=>{
        if(!challengeAnswered)return;
        if(!reviewing&&challengeNumber<islands[challengeKey].lessons.length){challengeNumber++;renderQuestion();document.getElementById('arch-challenge-title').focus({preventScroll:true});pose('read',event);}
        else{challenge.close();if(!reviewing&&challengeKey==='ux'&&unlocked('javascript'))visit('javascript',event);else if(!reviewing)visit(challengeKey,event);}
    },eventOptions);
    challenge.addEventListener('close',()=>{window.NextSkillAgent?.refresh();if(challengeOpener?.isConnected)challengeOpener.focus({preventScroll:true});else document.querySelector(`[data-start-island="${selected}"]`)?.focus({preventScroll:true});},eventOptions);

    function dockPoint(key){
        const bounds=chart.getBoundingClientRect(),box=document.querySelector(`[data-island="${key}"]`).getBoundingClientRect();
        const reverse=key==='ux';return{x:Math.max(boat.offsetWidth/2+5,Math.min(bounds.width-boat.offsetWidth/2-5,box.left-bounds.left+box.width*(reverse ? .22 : .78))),y:box.bottom-bounds.top+64};
    }
    function geometry(){
        geometryFrame=0;const bounds=chart.getBoundingClientRect(),points=Object.keys(islands).map(dockPoint);
        const svg=chart.querySelector('.island-sea-routes');svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
        ['ux','javascript'].forEach((key,i)=>{const a=points[i],b=points[i+1],mid=(a.y+b.y)/2;const d=`M${a.x} ${a.y} C${a.x} ${mid} ${b.x} ${mid} ${b.x} ${b.y}`;chart.querySelectorAll(`.route-${key}`).forEach(line=>line.setAttribute('d',d));});
        const target=dockPoint(selected);boat.style.transition=travelMotion&&motionAllowed()?'':'none';boat.style.transform=`translate3d(${target.x-boat.offsetWidth/2}px,${target.y-boat.offsetHeight/2}px,0)`;boat.dataset.sailing=String(travelMotion&&motionAllowed());
        clearTimeout(sailingTimer);sailingTimer=setTimeout(()=>{boat.dataset.sailing='false';},280);dockNiko();
    }
    function queueGeometry(){if(!geometryFrame)geometryFrame=requestAnimationFrame(geometry);}
    function dockNiko(){
        const heroSlot=document.querySelector('.sea-niko [data-buddy-anchor]'),mapSlot=document.getElementById('arch-map-buddy');
        const bounds=heroSlot.getBoundingClientRect(),atHero=bounds.bottom>30&&bounds.top<innerHeight-30;
        if(heroSlot.dataset.buddyAnchor!==(atHero?'arrival':'harbor')){heroSlot.dataset.buddyAnchor=atHero?'arrival':'harbor';mapSlot.dataset.buddyAnchor=atHero?'harbor':'arrival';window.NextSkillAgent?.refresh();}
    }
    const heroObserver=new IntersectionObserver(dockNiko,{rootMargin:'-30px 0px',threshold:0});heroObserver.observe(document.querySelector('.sea-niko [data-buddy-anchor]'));
    const islandObserver=new IntersectionObserver(entries=>{
        if(document.querySelector('dialog[open]')||performance.now()<manualUntil)return;
        const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
        if(visible&&visible.target.dataset.stop!==selected)selectIsland(visible.target.dataset.stop,null,false);
    },{rootMargin:'-25% 0px -35%',threshold:[0,.15,.35,.6]});chart.querySelectorAll('[data-stop]').forEach(stop=>islandObserver.observe(stop));
    const cloudLayers=[...chart.querySelectorAll('[data-cloud-depth]')];
    const cloudShifts=new WeakMap();
    function paintScene(){
        frame=0;if(!motionAllowed()){syncMotion();return;}
        // SVG layers have no offsetTop. Read their untransformed viewport positions.
        const updates=cloudLayers.map(layer=>{const top=layer.getBoundingClientRect().top-(cloudShifts.get(layer)||0),depth=Number(layer.dataset.cloudDepth);return{layer,shift:Math.max(-70,Math.min(70,(innerHeight*.5-top)*depth))};});
        updates.forEach(({layer,shift})=>{layer.style.transform=`translate3d(0,${shift}px,0)`;cloudShifts.set(layer,shift);});
    }
    function queueScene(){const expected=reduce.matches?'reduced':paused?'paused':'active';if(root.dataset.motion!==expected){syncMotion();return;}if(motionAllowed()&&!frame)frame=requestAnimationFrame(paintScene);}
    function syncMotion(){
        cancelAnimationFrame(frame);frame=0;root.dataset.motion=reduce.matches?'reduced':paused?'paused':'active';if(guide.dataset.motion!==root.dataset.motion)guide.dataset.motion=root.dataset.motion;
        document.getElementById('buddy-motion').disabled=reduce.matches;const button=document.getElementById('arch-motion');button.disabled=reduce.matches;button.setAttribute('aria-pressed',String(paused||reduce.matches));button.lastElementChild.textContent=reduce.matches?'ลดการเคลื่อนไหวแล้ว':paused?'เปิดการเคลื่อนไหว':'พักการเคลื่อนไหว';
        if(!motionAllowed()){cloudLayers.forEach(layer=>{layer.style.transform='';cloudShifts.delete(layer);});boat.dataset.sailing='false';}else queueScene();
    }
    function toggleMotion(){if(!reduce.matches)paused=!paused;syncMotion();}
    document.getElementById('arch-motion').addEventListener('click',toggleMotion,eventOptions);document.getElementById('buddy-motion').addEventListener('click',toggleMotion,eventOptions);
    document.addEventListener('nextskill:buddy-pose',event=>window.NextSkillBuddyMotion?.play(event.detail.pose,robot,{motion:motionAllowed()&&event.detail.motion===true}),eventOptions);
    window.addEventListener('scroll',()=>{queueScene();},{passive:true,signal:controller.signal});window.addEventListener('resize',()=>{queueGeometry();queueScene();dockNiko();},eventOptions);
    reduce.addEventListener('change',syncMotion,eventOptions);document.addEventListener('visibilitychange',syncMotion,eventOptions);
    const sizeObserver=new ResizeObserver(queueGeometry);sizeObserver.observe(chart);chart.querySelectorAll('.island-stop').forEach(stop=>sizeObserver.observe(stop));
    document.fonts?.ready.then(queueGeometry);
    window.addEventListener('storage',event=>{if(event.key===practiceKey)syncPractice();},eventOptions);
    document.getElementById('buddy-tour-start').addEventListener('click',event=>{document.getElementById('arch-tour-dialog').showModal();window.NextSkillAgent?.refresh();pose('wave',event);},eventOptions);
    document.getElementById('arch-reset').addEventListener('click',()=>document.getElementById('arch-reset-dialog').showModal(),eventOptions);
    document.getElementById('arch-reset-confirm').addEventListener('click',()=>{try{localStorage.removeItem(storageKey);localStorage.removeItem(practiceKey);}catch{announce('ล้างข้อมูลไม่ได้ เบราว์เซอร์นี้ไม่อนุญาตให้เข้าถึงที่เก็บข้อมูล');return;}history.replaceState(null,'',`${location.pathname}#learning-path`);location.reload();},eventOptions);
    window.addEventListener('pagehide',event=>{cancelAnimationFrame(frame);cancelAnimationFrame(geometryFrame);clearTimeout(sailingTimer);clearTimeout(locateTimer);heroObserver.disconnect();islandObserver.disconnect();sizeObserver.disconnect();practiceObserver.disconnect();if(!event.persisted)controller.abort();});
    window.addEventListener('pageshow',event=>{if(event.persisted){heroObserver.observe(document.querySelector('.sea-niko [data-buddy-anchor]'));chart.querySelectorAll('[data-stop]').forEach(stop=>{islandObserver.observe(stop);sizeObserver.observe(stop);});sizeObserver.observe(chart);practiceObserver.observe(document.getElementById('niko-home-progress'),{childList:true,subtree:true});syncPractice();render();dockNiko();syncMotion();}});
    syncPractice();render();dockNiko();syncMotion();if(state.uxOpen)setText('#niko-continue-lesson','ล่องเรือไปเกาะนักออกแบบ →');
})();

