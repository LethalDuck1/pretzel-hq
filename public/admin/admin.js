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
