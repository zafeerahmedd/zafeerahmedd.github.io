/* Each project belongs to a physical tooth; its plate unfolds at the center. */
(() => {
  const body=document.body,reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const roomy=matchMedia('(min-width: 1000px) and (min-height: 720px)');
  const motionButton=document.querySelector('.motion-control');
  let userMotionOff=false,compact=false,fitFallback=false,active=0,pending=false,lastFocus=null,state=GearSequence.at(0);
  try{userMotionOff=localStorage.getItem('zaq-motion')==='off';}catch{}
  const story=document.querySelector('.tooth-story'),stage=document.querySelector('.tooth-stage'),lane=document.querySelector('.tooth-lane');
  const teeth=[...document.querySelectorAll('[data-tooth]')],selectors=[...document.querySelectorAll('[data-tooth-select]')];
  const prev=document.querySelector('#tooth-prev'),next=document.querySelector('#tooth-next'),compactButton=document.querySelector('#tooth-compact');
  const names=['Motorcycle assembly','Stair-climbing robot','CFD studies','TerraExplorer','Electric go-kart'];
  const clamp=GearSequence.clamp;
  function motionOff(){return userMotionOff||reduce.matches;}
  function orbit(){return body.classList.contains('tooth-orbit');}
  function bounds(){return {start:story.getBoundingClientRect().top+scrollY-80,range:Math.max(1,story.offsetHeight-stage.offsetHeight)};}
  function paint(s,announce=false){
    state=s;active=s.index;
    const h=lane.clientHeight,w=lane.clientWidth,fullW=w-230,fullH=Math.min(470,Math.max(370,h-80)),cy=h/2,cx=-55,r=245;
    story.style.setProperty('--tooth-angle',(-s.position*60)+'deg');
    story.style.setProperty('--lane-middle',cy+'px');
    teeth.forEach((tooth,i)=>{
      const d=i-s.position,angle=d*Math.PI/3,isCurrent=i===active,opening=isCurrent?s.open:0;
      tooth.classList.toggle('is-current',isCurrent);
      if(orbit()){
        const visible=Math.abs(d)<1.28;
        /* The plate grows from the tooth ROOT so plate and gear read as one piece. */
        const rootX=cx+r*Math.cos(Math.PI/3),capX=cx+r*Math.cos(angle);
        const inset=isCurrent?(capX-rootX)*opening:0;
        const width=130+(fullW-130)*opening+inset,height=76+(fullH-76)*opening;
        const x=capX-inset,y=cy+r*Math.sin(angle)-height/2;
        tooth.style.setProperty('--root-inset',inset+'px');
        tooth.hidden=!visible;tooth.style.width=width+'px';tooth.style.height=height+'px';
        tooth.style.transform=`translate(${x}px, ${y}px)`;
        tooth.style.setProperty('--plate-width',fullW+'px');tooth.style.setProperty('--plate-height',fullH+'px');
        tooth.style.setProperty('--content-opacity',clamp((opening-.55)/.45,0,1));
        tooth.style.setProperty('--preview-opacity',1-clamp(opening*3,0,1));
        /* Neighbour caps sit in FRONT of the plate. */
        tooth.style.zIndex=isCurrent?'2':'4';
        // Partial and neighboring plates are previews; only the fully docked project is actionable.
        tooth.inert=!(isCurrent&&opening>.97);tooth.setAttribute('aria-hidden',String(!(isCurrent&&opening>.97)));
      }else{
        tooth.hidden=!isCurrent;tooth.removeAttribute('style');tooth.inert=!isCurrent;tooth.setAttribute('aria-hidden',String(!isCurrent));
      }
    });
    selectors.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===active)));
    document.querySelector('#tooth-count').textContent=String(active+1).padStart(2,'0')+' OF 05';
    document.querySelector('.tooth-track i').style.width=((active+1)/5*100)+'%';
    document.querySelector('#tooth-hint').textContent=active===4?'Last project · keep scrolling to continue ↓':'Scroll to bring the next tooth into view ↓';
    prev.disabled=active===0;next.textContent=active===4?'Continue ↓':'→';next.setAttribute('aria-label',active===4?'Continue to all projects':'Next project');
    if(announce)document.querySelector('#tooth-status').textContent=`Project ${active+1} of 5: ${names[active]}`;
  }
  function updateScroll(){
    pending=false;if(!story||!orbit())return;
    if(stage.offsetHeight>innerHeight-80+8){fitFallback=true;configure();return;}
    // A keyboard user's active link is not removed during reading or tabbing.
    if(teeth[active].contains(document.activeElement))return;
    const b=bounds();paint(GearSequence.at((scrollY-b.start)/b.range));
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(updateScroll);}}
  function configure(){
    body.classList.toggle('motion-off',motionOff());
    if(motionOff()&&document.getAnimations)document.getAnimations().forEach(a=>a.cancel());
    motionButton.setAttribute('aria-pressed',String(motionOff()));motionButton.textContent=reduce.matches?'Motion: reduced':motionOff()?'Motion: off':'Motion: on';
    if(!story)return;
    const enabled=roomy.matches&&!compact&&!motionOff()&&!fitFallback;
    body.classList.toggle('tooth-orbit',enabled);
    compactButton.textContent=enabled?'Compact view':'Scroll view';compactButton.setAttribute('aria-pressed',String(!enabled));
    compactButton.disabled=!roomy.matches||motionOff()||fitFallback;
    paint({position:active,index:active,open:1,progress:active/5,complete:false});
    if(enabled)schedule();
  }
  function scrollInstant(top){const el=document.documentElement,old=el.style.scrollBehavior;el.style.scrollBehavior='auto';window.scrollTo({top,behavior:'auto'});el.style.scrollBehavior=old;}
  function choose(index){
    index=clamp(index,0,4);paint({position:index,index,open:1,progress:index/5,complete:false},true);
    if(orbit()){const b=bounds();scrollInstant(b.start+b.range*(index+.2)/5);}
  }
  if(story){
    body.classList.add('tooth-ready');
    selectors.forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.toothSelect))));
    prev.addEventListener('click',()=>choose(active-1));
    next.addEventListener('click',()=>{if(active===4)document.querySelector('#project-index').scrollIntoView({behavior:motionOff()?'auto':'smooth'});else choose(active+1);});
    compactButton.addEventListener('click',()=>{compact=!compact;configure();const b=bounds();scrollInstant(orbit()?b.start+b.range*(active+.2)/5:b.start);});
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',()=>{fitFallback=false;configure();schedule();},{passive:true});
    story.addEventListener('focusout',schedule);if('ResizeObserver'in window)new ResizeObserver(schedule).observe(lane);
  }
  motionButton.addEventListener('click',()=>{const inside=story&&story.getBoundingClientRect().top<100&&story.getBoundingClientRect().bottom>100;userMotionOff=!userMotionOff;try{localStorage.setItem('zaq-motion',userMotionOff?'off':'on');}catch{}configure();if(inside){const b=bounds();scrollInstant(orbit()?b.start+b.range*(active+.2)/5:b.start);}});
  reduce.addEventListener('change',configure);roomy.addEventListener('change',configure);configure();
  const menu=document.querySelector('.mobile-menu'),nav=document.querySelector('nav');
  function closeMenu(){menu.setAttribute('aria-expanded','false');nav.classList.remove('open');menu.textContent='Menu +';}
  menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);menu.textContent=open?'Close ×':'Menu +';});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
  const render=document.querySelector('#hero-render');
  const alts={'01':'Motorcycle assembly, side view','02':'Motorcycle assembly, three-quarter front view','03':'Motorcycle assembly, three-quarter rear view'};
  document.querySelectorAll('[data-view]').forEach(b=>{
    b.setAttribute('aria-label',alts[b.dataset.view]);
    b.addEventListener('click',()=>{render.src=`assets/image-${b.dataset.view}.jpg`;render.alt=alts[b.dataset.view];document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
  });
  if('IntersectionObserver' in window){
    const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){if(!motionOff()&&e.target.animate)e.target.animate([{opacity:.65,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'ease-out'});reveal.unobserve(e.target);}}),{threshold:.15});
    document.querySelectorAll('.index-card,.process-grid>a').forEach(el=>reveal.observe(el));
  }
  const inspect=document.querySelector('#inspect-cad');
  if(inspect){
    const pins=document.querySelector('.cad-hotspots'),notes=document.querySelector('#deb4a9-notes');
    const callouts=[['Frame / Weldments','Structural members form the motorcycle frame. Explore how the component geometry comes together in the complete assembly.'],['Fuel tank / Surfacing','The fuel tank was modelled with surfacing as a thin-wall body. The case study documents the modelling approach.'],['Assembly / Interfaces','The complete model brings 30 unique components and three subassemblies together. Open the project to inspect the other views.']];
    function sideView(){render.src='assets/image-01.jpg';render.alt=alts['01'];document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='01')));}
    inspect.addEventListener('click',()=>{const open=inspect.getAttribute('aria-expanded')!=='true';inspect.setAttribute('aria-expanded',String(open));inspect.textContent=open?'Close inspection −':'Inspect the design +';pins.hidden=!open;notes.hidden=!open;if(open)sideView();});
    document.querySelectorAll('[data-callout]').forEach(b=>b.addEventListener('click',()=>{const c=callouts[Number(b.dataset.callout)];document.querySelector('#deb4a9-note-title').textContent=c[0];document.querySelector('#deb4a9-note-text').textContent=c[1];document.querySelectorAll('[data-callout]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.view!=='01'){inspect.setAttribute('aria-expanded','false');inspect.textContent='Inspect the design +';pins.hidden=true;notes.hidden=true;}}));
  }
  const reviewButtons=[...document.querySelectorAll('[data-review]')];
  if(reviewButtons.length){body.classList.add('review-ready');reviewButtons.forEach(b=>b.addEventListener('click',()=>{const index=Number(b.dataset.review);reviewButtons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('[data-review-panel]').forEach(p=>{const current=Number(p.dataset.reviewPanel)===index;p.classList.toggle('current',current);p.hidden=!current;if(current&&!motionOff()&&p.animate)p.animate([{opacity:.4,transform:'translateX(12px)'},{opacity:1,transform:'translateX(0)'}],{duration:300,easing:'ease-out'});});document.querySelector('#review-status').textContent=b.textContent.trim()+' evidence shown';}));}
  const dialog=document.querySelector('.lightbox');
  if(dialog){
    document.querySelectorAll('.gal img').forEach(img=>{
      const button=document.createElement('button');button.className='image-button';button.setAttribute('aria-label','Enlarge: '+img.alt);img.before(button);button.append(img);
      button.addEventListener('click',()=>{lastFocus=button;dialog.querySelector('img').src=img.src;dialog.querySelector('img').alt=img.alt;dialog.querySelector('p').textContent=img.closest('figure').querySelector('figcaption')?.textContent||img.alt;dialog.showModal();body.style.overflow='hidden';dialog.querySelector('button').focus();});
    });
    dialog.querySelector('.close-lightbox').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{body.style.overflow='';lastFocus?.focus();});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  }
})();
