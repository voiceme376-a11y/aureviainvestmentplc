(function(){
  const MIN=2000;
  const start=Date.now();
  const label=document.body?.dataset.sectionLoaderLabel||document.title.replace(/Aurevia Investment PLC\s*[—-]?\s*/i,'')||'Section';
  const overlay=document.createElement('div');
  overlay.className='section-loader show';
  overlay.innerHTML='<div class="section-loader-scene" aria-hidden="true"><div class="btc-coin btc-back"><span>₿</span></div><div class="btc-coin btc-front"><span>₿</span></div><i class="btc-glow"></i><i class="btc-orbit"></i></div><div class="section-loader-title">AUREVIA</div><div class="section-loader-label">'+String(label).replace(/[&<>"']/g,'')+'</div><div class="section-loader-line"><i></i></div>';
  document.body.appendChild(overlay); document.body.classList.add('section-loading');
  requestAnimationFrame(()=>{const line=overlay.querySelector('.section-loader-line i');if(line)line.style.animation='sectionLine 2s linear forwards'});
  const finish=()=>{overlay.classList.add('done');document.body.classList.remove('section-loading');setTimeout(()=>overlay.remove(),420)};
  setTimeout(finish,Math.max(0,MIN-(Date.now()-start)));
})();
