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
