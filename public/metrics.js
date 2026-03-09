(() => {
  try{
    const KEY = 'pretzel_vid_v1';
    const DAYKEY = 'pretzel_vid_lastday';
    let vid = localStorage.getItem(KEY);
    if (!vid){
      vid = 'v_' + Math.random().toString(16).slice(2) + Date.now().toString(16);
      localStorage.setItem(KEY, vid);
    }
    const today = new Date().toISOString().slice(0,10);
    if (localStorage.getItem(DAYKEY) === today) return;
    localStorage.setItem(DAYKEY, today);

    fetch('/.netlify/functions/trackVisit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vid })
    }).catch(()=>{});
  }catch(e){}
})();
