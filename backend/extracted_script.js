
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('dragstart',e=>e.preventDefault());
const grid=document.getElementById('grid');let CAMS=[],READY=new Set();
function pad(n){return String(n).padStart(2,'0')}
function stamp(){const d=new Date(Date.now()+19800000);return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth()+1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} IST`}
// wall-clock sync: seek so the playhead matches "now" (live feel, not a recording from frame 0)
function livePos(v){if(v.duration&&isFinite(v.duration)&&v.duration>1){try{v.currentTime=(Date.now()/1000)%v.duration;}catch(e){}}}
function playInto(video,cam,onReady){
  const src=`${cam.id}/index.m3u8`;
  if(video.canPlayType('application/vnd.apple.mpegurl')){video.loop=true;video.addEventListener('loadedmetadata',()=>livePos(video),{once:true});video.addEventListener('loadeddata',()=>onReady&&onReady(),{once:true});video.src=src;video.play().catch(()=>{});
    var iv=setInterval(()=>{if(Math.abs((Date.now()/1000)%(video.duration||1)-video.currentTime)>2)livePos(video);},10000);
    return {destroy(){clearInterval(iv);video.removeAttribute('src');video.load();}};}
  if(window.Hls&&Hls.isSupported()){const hls=new Hls({maxBufferLength:6,maxMaxBufferLength:14,backBufferLength:12,manifestLoadingTimeOut:60000,manifestLoadingMaxRetry:6,manifestLoadingRetryDelay:1500,levelLoadingTimeOut:60000,levelLoadingMaxRetry:6,fragLoadingTimeOut:90000,fragLoadingMaxRetry:12,fragLoadingRetryDelay:1500,fragLoadingMaxRetryTimeout:16000,capLevelToPlayerSize:true,startPosition:-1});let _r=0;hls.attachMedia(video);hls.on(Hls.Events.MEDIA_ATTACHED,()=>hls.loadSource(src));hls.on(Hls.Events.MANIFEST_PARSED,()=>{video.loop=true;livePos(video);video.play().catch(()=>{});});hls.on(Hls.Events.FRAG_BUFFERED,()=>{_r=0;onReady&&onReady();});hls.on(Hls.Events.ERROR,(e,d)=>{if(!d.fatal)return;if(d.type===Hls.ErrorTypes.MEDIA_ERROR){try{hls.recoverMediaError()}catch(_){}}else{_r++;setTimeout(()=>{try{hls.startLoad()}catch(_){}},Math.min(1500*_r,8000));}});
    var iv2=setInterval(()=>{if(video.duration&&Math.abs((Date.now()/1000)%video.duration-video.currentTime)>2.5)livePos(video);},12000);
    return {destroy(){clearInterval(iv2);try{hls.destroy()}catch(_){}}};}
  return {destroy(){}};
}
function makeTile(cam){
  const t=document.createElement('div');t.className='tile';t.dataset.k=(cam.id+' '+cam.name).toLowerCase();
  const nm=cam.name.replace(/^\d+\s*/,'');const off=!READY.has(cam.id);
  t.innerHTML=`<div class="poster"><div class="pl ${off?'badge-off':''}"><i></i>${off?'STANDBY':'LIVE'}</div><div class="cid">${cam.id.toUpperCase()}</div><div class="pnm">${nm}</div><div class="hint">${off?'acquiring feed…':'hover · click to open'}</div></div>`;
  grid.appendChild(t);let ctl=null,hoverV=null;
  function startPreview(){if(off||ctl)return;hoverV=document.createElement('video');hoverV.muted=true;hoverV.playsInline=true;t.appendChild(hoverV);ctl=playInto(hoverV,cam,()=>{hoverV.insertAdjacentHTML('afterend',`<div class="ov"></div><div class="osd">${stamp()}</div><div class="ctop"><span class="cam">${cam.id.toUpperCase()}</span><span class="rec"><i></i>REC</span></div><div class="expand">⤢ OPEN</div>`);});}
  function stopPreview(){if(ctl){ctl.destroy();ctl=null;}t.querySelectorAll('video,.ov,.osd,.ctop,.expand').forEach(e=>e.remove());}
  t.addEventListener('mouseenter',startPreview);t.addEventListener('mouseleave',stopPreview);
  t.addEventListener('click',()=>{stopPreview();openModal(cam,off);});
}
const modal=document.getElementById('modal');let modalCtl=null;
function openModal(cam,off){
  const nm=cam.name.replace(/^\d+\s*/,'');
  document.getElementById('m-cid').textContent=cam.id.toUpperCase();document.getElementById('m-loc').textContent=nm;
  const v=document.getElementById('m-video'),spin=document.getElementById('m-spin');spin.style.display='flex';spin.textContent=off?'Feed on standby — not yet available':'Connecting to live feed…';
  const osd=document.getElementById('m-osd');osd.textContent=stamp();osd.style.display=off?'none':'block';
  modal.classList.add('open');
  try{if(modal.requestFullscreen)modal.requestFullscreen().catch(()=>{});}catch(_){}
  if(!off)modalCtl=playInto(v,cam,()=>{spin.style.display='none'});
}
function closeModal(){modal.classList.remove('open');if(modalCtl){modalCtl.destroy();modalCtl=null;}const v=document.getElementById('m-video');v.removeAttribute('src');v.load();try{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch(_){}}
document.getElementById('m-close').onclick=closeModal;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeModal();});
async function boot(){try{CAMS=await (await fetch('cameras.json',{cache:'no-store'})).json();CAMS.forEach(c=>READY.add(c.id));document.getElementById('count').textContent=CAMS.length;document.getElementById('meta').textContent=`${CAMS.length} cameras · live`;CAMS.forEach(makeTile);}catch(e){document.getElementById('meta').textContent='Camera manifest unavailable';}}
boot();
document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.tile').forEach(t=>{t.style.display=t.dataset.k.includes(q)?'':'none'});});
setInterval(()=>{const s=stamp();document.getElementById('clk').textContent=s;document.querySelectorAll('.osd').forEach(o=>o.textContent=s);},250);
