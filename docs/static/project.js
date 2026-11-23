/* Aeroline website adaptation; CC BY-SA 4.0. No analytics or autoplay. */
const scenes={
  art:{image:'media/aeroline-coast.webp',alt:'Original loading artwork: a white roadster on a sunlit coastal road',caption:'The original loading artwork. A little inspiration before the drive.'},
  drive:{image:'media/gameplay.png',alt:'Actual Aeroline gameplay on Harbor Ring',caption:'Actual gameplay on Harbor Ring. Minimal instruments, more room for the road.'},
  crew:{image:'media/multiplayer-grid.png',alt:'Actual multiplayer starting grid with room code, readiness and Start race',caption:'Actual multiplayer grid. Share a code, wait for your friends, start together.'}
};
const image=document.getElementById('showcase-image');
const caption=document.getElementById('showcase-caption');
const buttons=[...document.querySelectorAll('[data-scene]')];
for(const button of buttons){
  button.addEventListener('click',()=>{
    const scene=scenes[button.dataset.scene];
    image.src=scene.image;image.alt=scene.alt;caption.textContent=scene.caption;
    for(const item of buttons)item.setAttribute('aria-pressed',String(item===button));
  });
  button.addEventListener('keydown',event=>{
    const direction=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
    if(!direction)return;
    event.preventDefault();
    const next=buttons[(buttons.indexOf(button)+direction+buttons.length)%buttons.length];
    next.focus();next.click();
  });
}
for(const link of document.querySelectorAll('.project-menu a'))link.addEventListener('click',()=>document.querySelector('.project-menu').removeAttribute('open'));
const mapData={
 island:{file:'island_circuit.jpg',name:'Island Circuit',surface:'MUD & GRASS',description:'Rolling coastal hills, muddy corners and ocean views. A scenic place to settle into the car before chasing a cleaner lap.',prompt:'a relaxed drive and your first checkpoint run'},
 desert:{file:'desert_canyon.jpg',name:'Desert Canyon',surface:'SAND & GRAVEL',description:'Wide desert views and loose-surface roads. Give yourself room to brake, find grip and build confidence through the bends.',prompt:'loose-surface driving and a different rhythm'},
 snow:{file:'sweden_snow.jpg',name:'Sweden Snow Rally',surface:'SNOW & ICE',description:'Snowbanks, winter trees and low-grip corners. Gentle inputs and early braking make the winter route more approachable.',prompt:'a careful run with the snow tires'},
 highland:{file:'highland_castle.jpg',name:'Highland Castle Rally',surface:'MUD, GRAVEL & STONE',description:'A technical highland route with castle scenery and tighter turns. Think ahead and trade a little entry speed for a cleaner exit.',prompt:'technical corners and checkpoint consistency'},
 drift:{file:'apex_gymkhana.jpg',name:'Drift District',surface:'TARMAC & CONCRETE',description:'Industrial surroundings and open drift areas give you space to explore a slide, countersteer and find a rhythm.',prompt:'learning the handbrake and linking controlled slides'},
 harbor:{file:'harbor-ring.webp',name:'Harbor Ring',surface:'ASPHALT STREETS',description:'A coastal street loop for road driving, practicing turns and meeting friends. Settle into a car, then compare a cleaner lap.',prompt:'quick practice on a repeatable street loop'}
};
for(const button of document.querySelectorAll('[data-map]'))button.addEventListener('click',()=>{
 const map=mapData[button.dataset.map];const image=document.getElementById('map-image');image.src='media/maps/'+map.file;image.alt=map.name+' map-selection artwork';
 document.getElementById('map-title').textContent=map.name;document.getElementById('map-surface').textContent=map.surface;document.getElementById('map-description').textContent=map.description;document.getElementById('map-prompt').textContent='Try it for: '+map.prompt+'.';
 for(const item of document.querySelectorAll('[data-map]'))item.setAttribute('aria-pressed',String(item===button));
});
const flowData={invite:{title:'Send a link. Meet on the grid.',description:'Create a room, then share its invite link or six-character code. Friends open the same game without signing up.',status:'INVITE YOUR FRIENDS'},ready:{title:'Everyone loads. Everyone starts together.',description:'The shared grid shows who is ready. Once everyone has loaded, the host starts a synchronized countdown.',status:'ALL DRIVERS READY'},race:{title:'Three races. One Cup.',description:'Follow the checkpoint gates for one lap. Points carry between races, and the next round starts automatically. Most points wins.',status:'3 — 2 — 1 — GO'}};
for(const button of document.querySelectorAll('[data-flow]'))button.addEventListener('click',()=>{
 const phase=button.dataset.flow;const flow=flowData[phase];document.getElementById('flow-visual').dataset.phase=phase;
 document.getElementById('flow-title').textContent=flow.title;document.getElementById('flow-description').textContent=flow.description;document.getElementById('flow-status').textContent=flow.status;
 for(const item of document.querySelectorAll('[data-flow]'))item.setAttribute('aria-pressed',String(item===button));
});
const faqButton=document.getElementById('expand-faq');const faqItems=[...document.querySelectorAll('.faq-list details')];
function syncFaqButton(){const expanded=faqItems.every(item=>item.open);faqButton.textContent=expanded?'Collapse all':'Expand all';faqButton.setAttribute('aria-expanded',String(expanded));}
faqButton.addEventListener('click',()=>{const expand=!faqItems.every(item=>item.open);for(const item of faqItems)item.open=expand;syncFaqButton();});
for(const item of faqItems)item.addEventListener('toggle',syncFaqButton);
