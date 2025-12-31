
    const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
    const lerp  = (a,b,t)=>a+(b-a)*t;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarse = matchMedia('(pointer: coarse)').matches;

    function centerOffset(panel){
      const r = panel.getBoundingClientRect();
      const vpC = innerHeight * 0.5;
      const pC  = r.top + r.height * 0.5;
      const denom = Math.max(1, r.height * 0.5);
      return (pC - vpC) / denom;
    }

   
    /*  聯絡表單送出*/
    const form = document.getElementById('contactForm');
    const toast = document.getElementById('toast');
    if (form && toast){
      form.addEventListener('submit',(e)=>{
        e.preventDefault();
        const fd = new FormData(form);
        const name = (fd.get('name')||'').toString().trim();
        toast.textContent = name ? `收到囉，${name} ✶（目前是前端展示版）` : '收到囉 ✶（目前是前端展示版）';
        form.reset();
        setTimeout(()=>toast.textContent='', 2200);
      });
    }

    /* 作品圖模糊效果 */
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
      if(!g || !ctx || reduced) return;
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

    /* 滾動視差 */
    const workHero = document.querySelector('.panel.workHero');
    const workBg = document.getElementById('workBg');
    let wby=0, wbo=1;

    /* 放置作品區域 */
    const gallery = document.getElementById('gallery');
    const stage = document.getElementById('galleryStage');
    const btns = Array.from(document.querySelectorAll('.catBtn'));

    const CATS = ["paint","animation","cosplay","comic"];
    /* 作品圖的js */
    let MANIFEST = null;
    async function loadManifest(){
      try{
        const res = await fetch("2_WorkIMG/manifest.json", {cache:"no-store"});
        if(!res.ok) throw new Error("manifest load failed");
        MANIFEST = await res.json();
      }catch(err){
        console.warn("manifest.json 讀取失敗（若你用 file:/// 開檔也會失敗，建議用 Live Server）：", err);
        MANIFEST = null;
      }
    }

    function getInitialCat(){
      const h = (location.hash || "").replace("#","").toLowerCase();
      return CATS.includes(h) ? h : "paint";
    }

    function isMobileLayout(){
      return matchMedia("(max-width: 1024px)").matches;
    }

    let io=null;
    function setupObserver(){
      if (reduced){
        stage.querySelectorAll('.piece').forEach(p=>p.classList.add('inview'));
        return;
      }
      if(io) io.disconnect();
    /* 圖片進場動畫 */
      io = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          e.target.classList.toggle('inview', e.isIntersecting);
        });
      }, {threshold:0.18});
      stage.querySelectorAll('.piece').forEach(p=>io.observe(p));
    }

    function waitForImgs(imgEls){
      const ps = imgEls.map(img=>{
        if (img.decode){
          return img.decode().catch(()=>null);
        }
        return new Promise(res=>{
          if (img.complete) return res();
          img.addEventListener('load', res, {once:true});
          img.addEventListener('error', res, {once:true});
        });
      });
      return Promise.all(ps);
    }

    function scatterNoOverlap(items){
      const W = stage.clientWidth;
      const PADDING = 10;
      const GAP = 16;

      const minW = 260, maxW = 460;
      const minH = 220, maxH = 540;

      const boxes = [];
      let stageH = 980;

      for (let i=0;i<items.length;i++){
        const el = items[i];
        const ratio = parseFloat(el.dataset.ratio || "1.333") || 1.333;

        let w = lerp(minW, maxW, Math.random());
        let h = w / ratio;

        if (h < minH){
          h = minH;
          w = h * ratio;
        } else if (h > maxH){
          h = maxH;
          w = h * ratio;
        }

        const maxFitW = Math.max(120, W - PADDING*2);
        if (w > maxFitW){
          w = maxFitW;
          h = w / ratio;
        }

        w = Math.max(140, Math.min(maxFitW, w));
        h = Math.max(160, h);

        /* 不重疊排版 */
        let placed=false, tries=0;
        while(!placed && tries<900){
          tries++;
          if(tries%220===0) stageH += 180;

          const x = PADDING + Math.random()*(W - PADDING*2 - w);
          const y = PADDING + Math.random()*(stageH - PADDING*2 - h);
          const rect = {x,y,w,h};

          const ok = boxes.every(b =>
            rect.x + rect.w + GAP < b.x ||
            rect.x > b.x + b.w + GAP ||
            rect.y + rect.h + GAP < b.y ||
            rect.y > b.y + b.h + GAP
          );

          if(ok){
            boxes.push(rect);
            el.style.left = rect.x+"px";
            el.style.top  = rect.y+"px";
            el.style.width  = rect.w+"px";
            el.style.height = rect.h+"px";
            placed=true;
          }
        }

        if(!placed){
          const y = PADDING + i*(h+18);
          boxes.push({x:PADDING,y,w,h});
          el.style.left = PADDING+"px";
          el.style.top  = y+"px";
          el.style.width  = w+"px";
          el.style.height = h+"px";
          stageH = Math.max(stageH, y+h+PADDING);
        }
      }

      const maxBottom = boxes.reduce((m,b)=>Math.max(m, b.y+b.h), 0);
      stage.style.minHeight = (maxBottom + 40) + "px";
    }

    function setActiveCat(cat){
      btns.forEach(b=>b.classList.toggle("is-active", b.dataset.cat===cat));
      history.replaceState(null, "", `#${cat}`);
    }

    function getSourcesForCat(cat){
      if (cat !== "animation"){
        const list = Array.isArray(MANIFEST?.[cat]) ? MANIFEST[cat] : [];
        if (list.length) return list;
        const fallbackCount = 7;
        return Array.from({length: fallbackCount}, (_,i)=>`2_WorkIMG/${cat}/${i+1}.jpg`);
      }
      return [];
    }

    async function buildPieces(cat, {forceReveal=false} = {}){
      stage.innerHTML = "";
      stage.classList.remove("is-video");
      stage.style.minHeight = "0px";

      if(cat === "animation"){
        stage.classList.add("is-video");

        const info = MANIFEST?.animation;
        const videoSrc = typeof info === "string" ? info : info?.video;
        const poster  = (typeof info === "object" && info?.poster) ? info.poster : "";
        const finalVideoSrc = videoSrc || "2_WorkIMG/animation/main.mp4";

        const wrap = document.createElement("div");
        wrap.className = "piece piece--video";

        const video = document.createElement("video");
        video.src = finalVideoSrc;
        if (poster) video.poster = poster;
        video.controls = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.muted = true;

        const tag = document.createElement("div");
        tag.className = "pieceTag";
        tag.textContent = "animation";

        const hint = document.createElement("div");
        hint.className = "hintUnmute";
        hint.textContent = "tap to unmute";

        wrap.appendChild(video);
        wrap.appendChild(tag);
        wrap.appendChild(hint);
        stage.appendChild(wrap);

        wrap.addEventListener("click", ()=>{
          video.muted = !video.muted;
          hint.style.opacity = video.muted ? ".9" : "0";
        });

        return;
      }

      const sources = getSourcesForCat(cat);

      for (let i=0;i<sources.length;i++){
        const src = sources[i];

        const piece = document.createElement("a");
        piece.className = "piece";
        piece.href = "#";
        piece.setAttribute("aria-label", `${cat} work ${i+1}`);

        const side = ((i+1) % 2 === 0) ? 1 : -1;
        piece.style.setProperty("--enterX", (side * 200) + "px");
        piece.style.setProperty("--rot", ((Math.random()*6)-3).toFixed(2) + "deg");

        const img = document.createElement("img");
        img.loading = "lazy";
        img.src = src;
        img.alt = `${cat} ${i+1}`;

        const tag = document.createElement("div");
        tag.className = "pieceTag";
        tag.textContent = cat;

        piece.appendChild(img);
        piece.appendChild(tag);
        stage.appendChild(piece);
      }

      if (isMobileLayout()){
        stage.querySelectorAll(".piece").forEach(p=>{
          p.style.position="relative";
          p.style.left="auto";
          p.style.top="auto";
          p.style.width="100%";
          p.style.height="auto";
        });
        setupObserver();

        if (forceReveal && !reduced){
          const pcs = Array.from(stage.querySelectorAll(".piece"));
          pcs.forEach((p, idx)=>setTimeout(()=>p.classList.add("inview"), 30 + idx*32));
        }
        return;
      }

      const imgs = Array.from(stage.querySelectorAll("img"));
      await waitForImgs(imgs);

      const pieces = Array.from(stage.querySelectorAll(".piece"));
      pieces.forEach((p, idx)=>{
        const img = imgs[idx];
        const nw = img?.naturalWidth || 4;
        const nh = img?.naturalHeight || 3;
        const ratio = clamp(nw/nh, 0.55, 2.2);
        p.dataset.ratio = ratio.toFixed(4);
        p.style.position = "absolute";
      });

      scatterNoOverlap(pieces);
      setupObserver();

      if (forceReveal && !reduced){
        pieces.forEach((p, idx)=>{
          setTimeout(()=>p.classList.add("inview"), 40 + idx*34);
        });
      }
    }

    function scrollToGallery(){
      gallery.scrollIntoView({behavior:"smooth", block:"start"});
    }

    async function tryAutoplayAnimation(){
      const v = stage.querySelector("video");
      if(!v) return;
      try{ v.currentTime = 0; }catch(e){}
      try{
        const p = v.play();
        if (p && p.then) await p;
      }catch(err){
        console.warn("Autoplay blocked (ok):", err);
      }
    }

    let switching = false;
    async function switchCat(cat){
      if (switching) return;
      switching = true;

      setActiveCat(cat);

      const old = Array.from(stage.querySelectorAll(".piece"));
      if (old.length && !reduced){
        old.forEach((p, idx)=>{
          const dir = (idx % 2 === 0) ? -1 : 1;
          p.classList.remove("inview");
          p.style.setProperty("--exitX", (dir * 260) + "px");
          p.classList.add("leaving");
        });
        await new Promise(r=>setTimeout(r, 280));
      }

      await buildPieces(cat, {forceReveal:true});
      scrollToGallery();

      if (cat === "animation"){
        setTimeout(()=>{ tryAutoplayAnimation(); }, 520);
      }

      switching = false;
    }

    btns.forEach(btn=>{
      btn.addEventListener("click", ()=>switchCat(btn.dataset.cat));
    });

    (async ()=>{
      await loadManifest();
      const initCat = getInitialCat();
      setActiveCat(initCat);
      await buildPieces(initCat, {forceReveal:true});

      if (initCat === "animation"){
        setTimeout(()=>{ scrollToGallery(); setTimeout(tryAutoplayAnimation, 520); }, 120);
      }
    })();

    let rto=null;
    addEventListener("resize", ()=>{
      clearTimeout(rto);
      rto=setTimeout(async ()=>{
        const cat = getInitialCat();
        await buildPieces(cat, {forceReveal:false});
      }, 180);
    }, {passive:true});

    let gCur = 0;
    function galleryOutsideAmount(section){
      const r = section.getBoundingClientRect();
      const vpC = innerHeight * 0.5;
      let d=0;
      if(vpC < r.top) d = r.top - vpC;
      else if(vpC > r.bottom) d = vpC - r.bottom;
      const fadeRange = innerHeight * 0.70;
      return clamp(d / fadeRange, 0, 1);
    }

    function tick(){
      const off = centerOffset(workHero);
      const a = clamp(Math.abs(off), 0, 1);
      wbo = lerp(wbo, 1 - a*0.55, 0.10);
      wby = lerp(wby, (-off)*70, 0.10);
      workBg.style.setProperty("--wbo", wbo.toFixed(3));
      workBg.style.setProperty("--wby", wby.toFixed(2) + "px");

      const outA = galleryOutsideAmount(gallery);
      const targetG = Math.round(lerp(0, 255, outA));
      gCur = lerp(gCur, targetG, 0.12);
      gallery.style.setProperty("--g", gCur.toFixed(1));

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
