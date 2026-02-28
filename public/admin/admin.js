(function(){
  function isPWA(){
    try{
      const mm=window.matchMedia&&window.matchMedia("(display-mode: standalone)");
      const standalone=!!(mm&&mm.matches);
      const iosStandalone=!!window.navigator.standalone; // iOS Safari
      return standalone||iosStandalone;
    }catch(e){return false;}
  }
  function hideSplash(immediate){
    const el=document.getElementById("splash");
    if(!el) return;
    if(immediate){ try{el.remove();}catch(e){}; return; }
    el.classList.add("hide");
    setTimeout(()=>{try{el.remove();}catch(e){}},400);
  }
  // If not launched from Home Screen (not PWA), don't show splash at all.
  if(!isPWA()){
    // remove ASAP
    document.addEventListener("DOMContentLoaded",()=>hideSplash(true),{once:true});
    return;
  }
  // PWA mode: show for exactly 4s after window load
  window.addEventListener("load",()=>{ setTimeout(()=>hideSplash(false),4000); },{once:true});
})();

(function(){
  function hideSplash(){
    const el=document.getElementById("splash");
    if(!el) return;
    el.classList.add("hide");
    setTimeout(()=>{try{el.remove();}catch(e){}},400);
  }
  window.addEventListener("load",()=>{
    setTimeout(hideSplash,4000);
  });
})();


window.__splashTick=window.__splashTick||0;
