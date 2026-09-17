/* Standalone enhancement; no dependencies or changes to the gear engine.
 * Only the known small drawing is fetched. The original img remains the layout,
 * accessibility and lightbox anchor; the temporary inline SVG is removed on finish.
 * Supplied solar SVG lacks hp/data-part: fallback is source drawing order.
 */
(() => {
  'use strict';
  function init() {
    if (document.documentElement.hasAttribute('data-zaq-motion-ready')) return;
    document.documentElement.setAttribute('data-zaq-motion-ready', '');
    const NS = 'http://www.w3.org/2000/svg';
    const easing = 'cubic-bezier(.16, 1, .3, 1)';
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const finishes = new Set();
    const off = () => document.body.classList.contains('motion-off') || media.matches;
    const svgNode = (name, attrs = {}) => {
      const node = document.createElementNS(NS, name);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      return node;
    };
    function animate(node, frames, options) {
      const animation = node.animate(frames, {easing, fill: 'both', ...options});
      // Cancellation by the site's Motion control is an expected completion path.
      animation.finished.catch(() => {});
      return animation;
    }

    const MAX_BYTES = 60 * 1024, cache = new Map(), drawings = new Map();
    async function source(url) {
      if (!cache.has(url)) cache.set(url, (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(url, {signal:controller.signal, credentials:'same-origin'});
          if (!response.ok || Number(response.headers.get('content-length')) > MAX_BYTES) return null;
          // Bound decoded bytes even if Content-Length is absent or compressed.
          const reader = response.body?.getReader();
          if (!reader) return null;
          const chunks = []; let length = 0;
          while (true) {
            const {done,value} = await reader.read(); if (done) break;
            length += value.byteLength;
            if (length > MAX_BYTES) { await reader.cancel(); return null; }
            chunks.push(value);
          }
          const bytes = new Uint8Array(length); let at = 0;
          chunks.forEach(c => {bytes.set(c,at); at += c.length;});
          return new TextDecoder().decode(bytes);
        } catch { return null; } finally { clearTimeout(timeout); }
      })());
      return cache.get(url);
    }
    function draw(img, r) {
      if (r.done || !r.text || off()) return;
      r.done = true; drawingObserver?.unobserve(img);
      let svg, geometry, originalOpacity, position, parent;
      const animations = []; let ro;
      const finish = () => {
        animations.forEach(a => a.cancel()); ro?.disconnect(); svg?.remove();
        if (originalOpacity) {
          if (originalOpacity.value) img.style.setProperty('opacity',originalOpacity.value,originalOpacity.priority);
          else img.style.removeProperty('opacity');
        }
        if (position) parent.style.removeProperty('position');
        finishes.delete(finish);
      };
      try {
        const doc = new DOMParser().parseFromString(r.text,'image/svg+xml');
        if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') return;
        svg = document.importNode(doc.documentElement,true);
        // Fail closed on active/external SVG content. Supplied schematic is pure geometry.
        if (svg.querySelector('script, foreignObject, style, image, use, animate, animateTransform, set')) return;
        if ([svg,...svg.querySelectorAll('*')].some(n => Array.from(n.attributes).some(a =>
          /^on/i.test(a.name) || /href$/i.test(a.name) || /url\s*\(/i.test(a.value)))) return;
        geometry = Array.from(svg.querySelectorAll('path.hp, path.dr, rect.dr'));
        if (!geometry.length) return;
        const groups = new Map();
        geometry.forEach((p,i) => {
          const name = p.getAttribute('data-part') || `source-${i}`;
          if (!groups.has(name)) groups.set(name,[]); groups.get(name).push(p);
        });
        svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
        svg.classList.add('zaq-plotter');
        const title = svgNode('title'); title.textContent = img.alt; svg.prepend(title);
        parent = img.parentElement;
        if (getComputedStyle(parent).position === 'static') {
          // Do not overwrite an existing inline position declaration.
          if (parent.style.position) return;
          parent.style.position = 'relative'; position = true;
        }
        const sync = () => {
          const c = getComputedStyle(img);
          Object.assign(svg.style, {left:`${img.offsetLeft}px`,top:`${img.offsetTop}px`,
            width:`${img.offsetWidth}px`,height:`${img.offsetHeight}px`,boxSizing:'border-box',
            padding:c.padding,border:c.border,borderRadius:c.borderRadius,background:c.background,
            opacity:c.opacity});
        };
        sync(); parent.append(svg);
        const lengths = geometry.map(p => p.getTotalLength());
        if (lengths.some(n => !Number.isFinite(n) || n <= 0)) { finish(); return; }
        const count = groups.size;
        // Current fallback: 51 primitives, 40ms stagger + 400ms draw = 2400ms.
        const stagger = 40, duration = Math.max(400, 1800-(count-1)*stagger);
        if ((count-1)*stagger+duration > 2600) { finish(); return; }
        originalOpacity = {value:img.style.getPropertyValue('opacity'),priority:img.style.getPropertyPriority('opacity')};
        // Keep the original accessible and clickable; it is only visually covered.
        img.style.setProperty('opacity','0');
        finishes.add(finish);
        let i = 0;
        groups.forEach(paths => {
          paths.forEach(p => {
            const length = lengths[geometry.indexOf(p)];
            animations.push(animate(p, [{strokeDasharray:`${length} ${length}`,strokeDashoffset:length},
              {strokeDasharray:`${length} ${length}`,strokeDashoffset:0}], {duration,delay:i*stagger}));
          }); i++;
        });
        // Restore the exact source image, including pre-existing dashed strokes.
        Promise.all(animations.map(a => a.finished)).then(finish,finish);
        // A resize restores the source rather than stretching an in-flight trace.
        // First ResizeObserver delivery is unconditional: skip it.
        // INTEGRATION CHANGE (Claude): the original called finish() on any resize,
        // which abandons the trace. app.js sets --ar on the figure once the image
        // reports its natural size, so a real resize can land while the draw is in
        // flight. Aborting is not needed to avoid a stretched trace: the overlay is
        // absolutely positioned and the SVG scales by its viewBox, so re-running
        // sync() re-fits it to the new box exactly. Sub-3px jitter is ignored.
        if ('ResizeObserver' in window) {
          let first = true, w0 = img.offsetWidth, h0 = img.offsetHeight;
          ro = new ResizeObserver(() => {
            if (first) { first = false; return; }
            if (Math.abs(img.offsetWidth - w0) < 3 && Math.abs(img.offsetHeight - h0) < 3) return;
            w0 = img.offsetWidth; h0 = img.offsetHeight; sync();
          });
          ro.observe(img);
        }
      } catch { finish(); }
    }
    const drawingObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      entries.forEach(async e => {
        const img = e.target, r = drawings.get(img);
        r.visible = e.isIntersecting && e.intersectionRatio >= .25;
        if (!r.visible || r.done) return;
        if (off()) {r.done=true; drawingObserver.unobserve(img); return;}
        if (!r.loading) {
          r.loading = true; r.text = await source(img.src);
          if (!r.text) {r.done=true; drawingObserver.unobserve(img); return;}
        }
        if (r.visible && !off()) draw(img,r);
      });
    }, {threshold:.25}) : null;
    // Skip known 0.5–0.6MB CAD exports without even fetching them.
    if (location.protocol !== 'file:' && drawingObserver) {
      document.querySelectorAll('img[src]').forEach(img => {
        const url = new URL(img.src,location.href);
        if (url.origin !== location.origin || !url.pathname.endsWith('/assets/solar-schematic.svg')) return;
        drawings.set(img,{done:off(),loading:false,text:null,visible:false});
        if (!off()) drawingObserver.observe(img);
      });
    }
    function applyPreference() {
      if (!off()) return;
      Array.from(finishes).forEach(f => f());
      drawings.forEach((r,img) => {r.done=true; drawingObserver?.unobserve(img);});
    }
    new MutationObserver(applyPreference).observe(document.body,{attributes:true,attributeFilter:['class']});
    media.addEventListener('change',applyPreference);
    applyPreference();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
