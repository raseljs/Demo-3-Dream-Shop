// First-visit loading screen: logo, live percentage and a delivery van driving along the bar.
// Plain HTML + a tiny inline script so it shows from the first paint, before React loads.
// It appears once per visit (sessionStorage), never on page-to-page navigation, and it can be
// switched off in Admin → Settings → Site Settings.
import { imgUrl } from '@/lib/format';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const CSS = `
#dspl{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;overflow:hidden;background:#fff;transition:opacity .45s ease,transform .45s ease}
#dspl.on{display:flex}
#dspl.out{opacity:0;transform:scale(1.04);pointer-events:none}
#dspl .b1,#dspl .b2{position:absolute;width:70vmax;height:70vmax;border-radius:50%;pointer-events:none}
#dspl .b1{left:-28vmax;top:-30vmax;background:radial-gradient(circle,rgba(252,109,4,.16),rgba(252,109,4,0) 62%);animation:dsplF 9s ease-in-out infinite}
#dspl .b2{right:-30vmax;bottom:-34vmax;background:radial-gradient(circle,rgba(0,84,207,.13),rgba(0,84,207,0) 62%);animation:dsplF 11s ease-in-out infinite reverse}
#dspl .in{position:relative;display:flex;flex-direction:column;align-items:center;width:min(340px,82vw);animation:dsplUp .5s ease-out both}
#dspl .logo{display:block;width:min(210px,56vw);height:auto}
#dspl .name{font-size:30px;font-weight:800;color:#032b5b;letter-spacing:-.02em}
#dspl .num{margin-top:34px;display:flex;align-items:baseline;gap:3px;color:#032b5b;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
#dspl .num b{font-size:56px;letter-spacing:-.03em}
#dspl .num i{font-style:normal;font-size:22px;color:#fc6d04}
#dspl .road{position:relative;width:100%;height:46px;margin-top:6px}
#dspl .track{position:absolute;left:0;right:0;bottom:6px;height:4px;border-radius:4px;background:repeating-linear-gradient(90deg,#fed7aa 0 10px,transparent 10px 16px)}
#dspl .fill{position:absolute;left:0;bottom:6px;height:4px;width:0;border-radius:4px;background:linear-gradient(90deg,#fdba74,#fc6d04);box-shadow:0 2px 10px rgba(252,109,4,.35)}
#dspl .van{position:absolute;bottom:9px;left:0;width:62px;height:35px;margin-left:-58px;animation:dsplBob .5s ease-in-out infinite alternate}
#dspl .w{transform-box:fill-box;transform-origin:center;animation:dsplSpin .45s linear infinite}
#dspl .sp{animation:dsplSpeed .6s linear infinite}
#dspl .msg{margin-top:12px;display:flex;align-items:center;gap:8px;min-height:20px;font-size:13px;font-weight:500;color:#64748b;letter-spacing:.01em}
#dspl .dots{display:inline-flex;gap:3px}
#dspl .dots span{width:5px;height:5px;border-radius:50%;background:#fc6d04;animation:dsplDot 1s ease-in-out infinite}
#dspl .dots span:nth-child(2){animation-delay:.15s}
#dspl .dots span:nth-child(3){animation-delay:.3s}
#dspl.done .dots{display:none}
#dspl.done .msg{color:#032b5b;font-weight:700}
@keyframes dsplF{0%,100%{transform:translate(0,0)}50%{transform:translate(4vmax,3vmax)}}
@keyframes dsplUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes dsplBob{from{transform:translateY(0)}to{transform:translateY(-1.5px)}}
@keyframes dsplSpin{to{transform:rotate(360deg)}}
@keyframes dsplSpeed{from{transform:translateX(4px);opacity:0}40%{opacity:1}to{transform:translateX(-6px);opacity:0}}
@keyframes dsplDot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-4px);opacity:1}}
`;

// Delivery van in the brand colours: orange cargo box with a shopping bag, blue cab
const VAN = `<svg class="van" viewBox="0 0 64 36" aria-hidden="true">
<g class="sp" stroke="#fc6d04" stroke-width="2" stroke-linecap="round"><path d="M1 12h6"/><path d="M3 18h5"/><path d="M1 24h6"/></g>
<rect x="10" y="3" width="33" height="23" rx="3" fill="#fc6d04"/>
<path d="M17 3v23M24 3v23M31 3v23M38 3v23" stroke="#fff" stroke-opacity=".14" stroke-width="1.2"/>
<path d="M21.5 12h10l-1.2 9.5h-7.6z" fill="#fff"/><path d="M24 12.5v-1.6a2.5 2.5 0 0 1 5 0v1.6" fill="none" stroke="#fff" stroke-width="1.4"/>
<path d="M43 9h9.5c1.4 0 2.6.8 3.2 2l3.6 7.2c.5.9.7 1.9.7 2.9V26H43z" fill="#0054cf"/>
<path d="M46 12h6.2c.6 0 1.1.3 1.4.9l2.5 5.1H46z" fill="#cfe3ff"/>
<rect x="9" y="25.5" width="52" height="3.5" rx="1.5" fill="#032b5b"/>
<g class="w"><circle cx="19" cy="30" r="5" fill="#0f172a"/><circle cx="19" cy="30" r="2.2" fill="#e2e8f0"/><path d="M19 26.2v7.6M15.2 30h7.6" stroke="#0f172a" stroke-width=".9"/></g>
<g class="w"><circle cx="52" cy="30" r="5" fill="#0f172a"/><circle cx="52" cy="30" r="2.2" fill="#e2e8f0"/><path d="M52 26.2v7.6M48.2 30h7.6" stroke="#0f172a" stroke-width=".9"/></g>
</svg>`;

// Runs as soon as it is parsed. Shows the screen only on the first page of a visit.
const SCRIPT = `(function(){
var el=document.getElementById('dspl');if(!el)return;
try{if(sessionStorage.getItem('ds_intro')||matchMedia('(prefers-reduced-motion: reduce)').matches){el.remove();return;}}catch(e){}
el.className='on';
var num=el.querySelector('.num b'),fill=el.querySelector('.fill'),van=el.querySelector('.van'),msg=el.querySelector('.msg .t');
var t0=performance.now(),MIN=1100,MAX=2600,loaded=document.readyState==='complete',endAt=0,from=0,last=-1,shown=0;
addEventListener('load',function(){loaded=true;});
function label(p){return p>=100?'Welcome!':p>=70?'Almost ready':p>=35?'Getting the best deals':'Loading products';}
function paint(p){var v=Math.floor(p);if(v===last)return;last=v;num.textContent=v;fill.style.width=p+'%';van.style.left=p+'%';var l=label(v);if(l!==shown){shown=l;msg.textContent=l;}}
function finish(){el.className='on done out';try{sessionStorage.setItem('ds_intro','1');}catch(e){}setTimeout(function(){el.remove();},480);}
function tick(now){var t=now-t0,p;
if(!endAt&&((loaded&&t>=MIN)||t>=MAX)){endAt=now;from=Math.max(last,0);}
if(endAt){var k=Math.min((now-endAt)/380,1);p=from+(100-from)*(1-Math.pow(1-k,3));paint(p);
if(k>=1){el.className='on done';setTimeout(finish,320);return;}}
else{p=92*(1-Math.exp(-t/650));paint(p);}
requestAnimationFrame(tick);}
requestAnimationFrame(tick);
})();`;

export default function Preloader({ settings }) {
  if (Number(settings?.preloader ?? 1) === 0) return null;
  const logo = settings?.logo_light;
  const brand = logo
    ? `<img class="logo" src="${esc(imgUrl(logo))}" alt="${esc(settings?.site_title || 'Logo')}" decoding="async">`
    : `<div class="name">${esc(settings?.site_title || 'Welcome')}</div>`;
  const html = `<style>${CSS}</style><div id="dspl" aria-hidden="true"><div class="b1"></div><div class="b2"></div><div class="in">${brand}<div class="num"><b>0</b><i>%</i></div><div class="road"><div class="track"></div><div class="fill"></div>${VAN}</div><div class="msg"><span class="t">Loading products</span><span class="dots"><span></span><span></span><span></span></span></div></div></div><script>${SCRIPT}</script>`;
  // React never touches what is inside, so the script can update and remove it freely
  return <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
