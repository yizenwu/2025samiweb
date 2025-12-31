
    /* ========= utils ========= */
    const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
    function smooth(current, target, dt, tau = 0.12){
      const a = 1 - Math.exp(-dt / tau);
      return current + (target - current) * a;
    }
    function centerOffset(panel){
      const r = panel.getBoundingClientRect();
      const vpC = innerHeight * 0.5;
      const pC  = r.top + r.height * 0.5;
      const denom = Math.max(1, r.height * 0.5);
      return (pC - vpC) / denom; // 0=center
    }

    const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
    const mqPhone  = matchMedia("(max-width: 600px)");
    const mqTablet = matchMedia("(max-width: 1024px)");

    /* ========= cursor (disable on touch) ========= */
    const cursor = document.getElementById('cursor');
    const isCoarse = matchMedia('(pointer: coarse)').matches;

    if (!isCoarse && cursor){
      let cx=innerWidth/2, cy=innerHeight/2, tx=cx, ty=cy;
      addEventListener('mousemove',(e)=>{ tx=e.clientX; ty=e.clientY; cursor.classList.add('cursor--on'); }, {passive:true});
      (function rafCursor(){
        cx += (tx-cx)*0.18; cy += (ty-cy)*0.18;
        cursor.style.left=cx+'px'; cursor.style.top=cy+'px';
        requestAnimationFrame(rafCursor);
      })();

      const hoverSet = new Set([...document.querySelectorAll('a, button, input, .js-hover')]);
      hoverSet.forEach(el=>{
        el.addEventListener('mouseenter', ()=>cursor.classList.add('cursor--big'));
        el.addEventListener('mouseleave', ()=>cursor.classList.remove('cursor--big'));
      });
    } else {
      cursor?.remove();
    }

    // cursor blue on follow
    const follow = document.getElementById('follow');
    if (follow && !isCoarse){
      new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          const c = document.querySelector('.cursor');
          if(!c) return;
          c.classList.toggle('cursor--blue', e.isIntersecting);
        });
      },{threshold:.25}).observe(follow);
    }

    /* ========= form demo ========= */
    const form = document.getElementById('contactForm');
    const toast = document.getElementById('toast');
    form?.addEventListener('submit',(e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const name = (fd.get('name')||'').toString().trim();
      toast.textContent = name ? `收到囉，${name} ✶（目前是前端展示版）` : '收到囉 ✶（目前是前端展示版）';
      form.reset();
      setTimeout(()=>toast.textContent='', 2200);
    });

    /* ========= grain (reuse buffer, efficient like your other pages) ========= */
    const g = document.getElementById('grain');
    const ctx = g?.getContext?.('2d', {alpha:true});
    let noise = { w:0, h:0, img:null, off:null, offctx:null };

    function resizeGrain(){
      if (!g || !ctx) return;
      const dpr = Math.max(1, Math.min(2, devicePixelRatio||1));
      g.width=Math.floor(innerWidth*dpr);
      g.height=Math.floor(innerHeight*dpr);
      g.style.width=innerWidth+'px';
      g.style.height=innerHeight+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);

      const s=2;
      const nw=Math.ceil(innerWidth/s);
      const nh=Math.ceil(innerHeight/s);
      if(nw!==noise.w || nh!==noise.h){
        noise.w=nw; noise.h=nh;
        noise.img=ctx.createImageData(nw,nh);
        noise.off=document.createElement('canvas');
        noise.off.width=nw; noise.off.height=nh;
        noise.offctx=noise.off.getContext('2d', {alpha:true});
      }
    }
    resizeGrain();
    addEventListener('resize', resizeGrain, {passive:true});

    let last=0;
    function drawGrain(t){
      if(!g || !ctx || mqReduce.matches) return;
      if(t-last>90 && noise.img && noise.offctx){
        last=t;
        const d=noise.img.data;
        for(let i=0;i<d.length;i+=4){
          const v=(Math.random()*255)|0;
          d[i]=v; d[i+1]=v; d[i+2]=v; d[i+3]=28;
        }
        noise.offctx.putImageData(noise.img,0,0);
        ctx.clearRect(0,0,innerWidth,innerHeight);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(noise.off,0,0,noise.w,noise.h,0,0,innerWidth,innerHeight);
      }
      requestAnimationFrame(drawGrain);
    }
    requestAnimationFrame(drawGrain);

    /* ========= PARALLAX ========= */
    const heroPanel  = document.querySelector('.panel.aboutHero');
    const aboutPanel = document.querySelector('.panel.aboutPanel');
    const aboutBg    = document.getElementById('aboutBg');

    const banner    = document.getElementById('banner');
    const aboutCard = document.getElementById('aboutCard');
    const stamp     = document.getElementById('stamp');
    const bannerImg = banner?.querySelector('img');

    const revealSecs = Array.from(document.querySelectorAll('[data-reveal]'));

    let heroO=1, heroY=0;
    let bnx=0, bny=0, bno=1;
    let acx=0, acy=0, aco=1, acr=0;
    let stx=0, sty=0, str=0;
    let imx=0, imy=0;
    const secX = revealSecs.map(()=>0);
    const secO = revealSecs.map(()=>1);

    let lastT = performance.now();
    function raf(t){
      const dt = Math.min(0.05, (t-lastT)/1000);
      lastT = t;

      const reduced = mqReduce.matches;
      const isPhone  = mqPhone.matches;
      const isTablet = mqTablet.matches && !isPhone;

      /* HERO bg */
      if (!reduced && heroPanel && aboutBg){
        const off = centerOffset(heroPanel);
        const a   = clamp(Math.abs(off),0,1);
        const oT  = 0.10 + (1-a)*0.90;
        const yT  = (-off)*85;

        heroO = smooth(heroO, oT, dt, 0.12);
        heroY = smooth(heroY, yT, dt, 0.12);

        aboutBg.style.opacity = heroO.toFixed(3);
        aboutBg.style.transform = `translate3d(0, ${heroY.toFixed(2)}px, 0) scale(1.08)`;
      }

      /* ABOUT panel parallax (desktop only). On tablet/phone keep clean layout. */
      if (!reduced && aboutPanel && banner && aboutCard){
        const off = centerOffset(aboutPanel);
        const a   = clamp(Math.abs(off),0,1);

        if (isTablet || isPhone){
          // reset transforms for clean stacked view
          banner.style.setProperty('--bnx','0px');
          banner.style.setProperty('--bny','0px');
          banner.style.setProperty('--bno','1');
          aboutCard.style.setProperty('--acx','0px');
          aboutCard.style.setProperty('--acy','0px');
          aboutCard.style.setProperty('--aco','1');
          aboutCard.style.setProperty('--acr','0deg');
          stamp?.style.setProperty('--stx','0px');
          stamp?.style.setProperty('--sty','0px');
          stamp?.style.setProperty('--str','0deg');
          bannerImg?.style.setProperty('--imx','0px');
          bannerImg?.style.setProperty('--imy','0px');

          revealSecs.forEach((sec)=>{ sec.style.setProperty('--sx','0px'); sec.style.setProperty('--so','1'); });
          requestAnimationFrame(raf);
          return;
        }

        const maxX = innerWidth * 0.14;
        const maxY = 22;

        const bnxT = (-off) * maxX * 0.75;
        const bnyT = ( a)  * maxY;
        const bnoT = 0.40 + (1-a)*0.60;

        const acxT = ( off) * maxX * 0.95;
        const acyT = (-a)   * maxY;
        const acoT = 0.40 + (1-a)*0.60;
        const acrT = (off) * 1.4;

        bnx = smooth(bnx, bnxT, dt, 0.12);
        bny = smooth(bny, bnyT, dt, 0.12);
        bno = smooth(bno, bnoT, dt, 0.12);

        acx = smooth(acx, acxT, dt, 0.12);
        acy = smooth(acy, acyT, dt, 0.12);
        aco = smooth(aco, acoT, dt, 0.12);
        acr = smooth(acr, acrT, dt, 0.12);

        banner.style.setProperty('--bnx', bnx.toFixed(2)+'px');
        banner.style.setProperty('--bny', bny.toFixed(2)+'px');
        banner.style.setProperty('--bno', bno.toFixed(3));

        aboutCard.style.setProperty('--acx', acx.toFixed(2)+'px');
        aboutCard.style.setProperty('--acy', acy.toFixed(2)+'px');
        aboutCard.style.setProperty('--aco', aco.toFixed(3));
        aboutCard.style.setProperty('--acr', acr.toFixed(2)+'deg');

        // stamp + image micro motion (subtle)
        const stxT = (-off) * 10;
        const styT = ( a)  * 8;
        const strT = (off) * 2.0;
        stx = smooth(stx, stxT, dt, 0.12);
        sty = smooth(sty, styT, dt, 0.12);
        str = smooth(str, strT, dt, 0.12);
        stamp?.style.setProperty('--stx', stx.toFixed(2)+'px');
        stamp?.style.setProperty('--sty', sty.toFixed(2)+'px');
        stamp?.style.setProperty('--str', str.toFixed(2)+'deg');

        const imxT = (off) * 8;
        const imyT = (-off) * 6;
        imx = smooth(imx, imxT, dt, 0.12);
        imy = smooth(imy, imyT, dt, 0.12);
        bannerImg?.style.setProperty('--imx', imx.toFixed(2)+'px');
        bannerImg?.style.setProperty('--imy', imy.toFixed(2)+'px');

        revealSecs.forEach((sec, i)=>{
          const dir = parseFloat(sec.getAttribute('data-dir') || (i%2?1:-1));
          const maxSec = 100;
          const xT = dir * a * maxSec;
          const oT = 0.40 + (1-a)*0.60;
          secX[i] = smooth(secX[i], xT, dt, 0.12);
          secO[i] = smooth(secO[i], oT, dt, 0.12);
          sec.style.setProperty('--sx', secX[i].toFixed(2)+'px');
          sec.style.setProperty('--so', secO[i].toFixed(3));
        });
      }

      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
