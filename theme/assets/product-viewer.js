/* ==========================================================================
   DR. HOME — product-viewer.js
   Owns the <model-viewer> element for products that have a real 3D model
   uploaded in Shopify Admin. Loading is strictly on user intent: the script
   and the model are fetched only when the shopper opens the "3D view" tab.
   There is no auto-rotate by default; reduced-motion users never see the
   auto-rotate control. All failures fall back to the photo gallery.
   ========================================================================== */
(function () {
  'use strict';

  var section = document.querySelector('[data-product-section]');
  if (!section) return;

  var mount = section.querySelector('[data-model-viewer-mount]');
  var sourceEl = section.querySelector('[data-model-source]');
  var viewerScriptUrl = section.getAttribute('data-viewer-script');
  var viewButtons = section.querySelectorAll('[data-media-view]');
  var photosPanel = section.querySelector('[data-media-panel="photos"]');
  var modelPanel = section.querySelector('[data-media-panel="3d"]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!mount || !sourceEl || !viewerScriptUrl) return;

  var source;
  try { source = JSON.parse(sourceEl.textContent); } catch (err) { return; }
  if (!source || !source.glb) return;

  var loaded = false;
  var loading = false;
  var viewer = null;
  var rotating = false;

  function showFallback() {
    var fallback = mount.querySelector('[data-viewer-fallback]');
    if (fallback) fallback.hidden = false;
    if (viewer) { viewer.parentNode && viewer.parentNode.removeChild(viewer); viewer = null; }
    setView('photos');
    var button = section.querySelector('[data-media-view="3d"]');
    if (button) button.disabled = true;
  }

  function loadViewerLib() {
    return new Promise(function (resolve, reject) {
      if (window.customElements && window.customElements.get('model-viewer')) { resolve(); return; }
      var script = document.createElement('script');
      script.type = 'module';
      script.src = viewerScriptUrl;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('model-viewer failed to load')); };
      document.head.appendChild(script);
    });
  }

  function buildViewer() {
    viewer = document.createElement('model-viewer');
    viewer.setAttribute('src', source.glb);
    viewer.setAttribute('poster', source.poster || '');
    viewer.setAttribute('alt', source.alt || 'Interactive 3D model of the product');
    viewer.setAttribute('camera-controls');
    viewer.setAttribute('touch-action', 'pan-y'); /* keep native vertical page scrolling */
    viewer.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    viewer.setAttribute('ar-status', 'not-presenting');
    viewer.setAttribute('shadow-intensity', '0.8');
    viewer.setAttribute('exposure', '1');
    viewer.setAttribute('tabindex', '0');
    viewer.setAttribute('role', 'img');
    viewer.style.width = '100%';
    viewer.style.height = '100%';
    if (source.usdz) viewer.setAttribute('ios-src', source.usdz);

    viewer.addEventListener('error', function () { showFallback(); });
    viewer.addEventListener('loading', function () {
      /* model-viewer shows its own progress bar via --progress-bar-color */
    });

    mount.insertBefore(viewer, mount.firstChild);
  }

  function ensureLoaded() {
    if (loaded || loading) return;
    loading = true;
    var fallback = mount.querySelector('[data-viewer-fallback]');
    if (fallback) fallback.hidden = true;
    loadViewerLib()
      .then(function () {
        buildViewer();
        loaded = true;
        buildControls();
      })
      .catch(function () { showFallback(); })
      .finally(function () { loading = false; });
  }

  function setRotation(next) {
    rotating = reduceMotion.matches ? false : next;
    if (!viewer) return;
    if (rotating) {
      viewer.setAttribute('auto-rotate', '');
    } else {
      viewer.removeAttribute('auto-rotate');
    }
  }

  function buildControls() {
    if (!viewer || mount.querySelector('[data-viewer-controls]')) return;

    var bar = document.createElement('div');
    bar.className = 'viewer-controls';
    bar.setAttribute('data-viewer-controls', '');

    if (!reduceMotion.matches) {
      var rotateBtn = document.createElement('button');
      rotateBtn.type = 'button';
      rotateBtn.className = 'btn btn--secondary btn--small';
      rotateBtn.setAttribute('aria-pressed', 'false');
      rotateBtn.textContent = window.ShopifyStrings.autoRotate;
      rotateBtn.addEventListener('click', function () {
        setRotation(!rotating);
        rotateBtn.setAttribute('aria-pressed', String(rotating));
        rotateBtn.textContent = rotating ? window.ShopifyStrings.pauseRotation : window.ShopifyStrings.autoRotate;
      });
      bar.appendChild(rotateBtn);
    }

    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn--secondary btn--small';
    resetBtn.textContent = window.ShopifyStrings.resetView;
    resetBtn.addEventListener('click', function () {
      setRotation(false);
      if (viewer) {
        viewer.removeAttribute('auto-rotate');
        viewer.resetTurntableRotation && viewer.resetTurntableRotation();
        viewer.cameraOrbit = '0deg 75deg auto';
        if (viewer.querySelector) { /* no-op, keeps API symmetric */ }
      }
      var rotateBtn = bar.querySelector('[aria-pressed]');
      if (rotateBtn) { rotateBtn.setAttribute('aria-pressed', 'false'); rotateBtn.textContent = window.ShopifyStrings.autoRotate; }
    });
    bar.appendChild(resetBtn);

    mount.appendChild(bar);
  }

  /* Pause rotation when the tab is hidden */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && rotating) {
      var btn = mount.querySelector('[data-viewer-controls] [aria-pressed]');
      if (btn) btn.click();
    }
  });

  function setView(view) {
    var is3d = view === '3d';
    if (photosPanel) photosPanel.hidden = is3d;
    if (modelPanel) modelPanel.hidden = !is3d;
    viewButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-media-view') === view));
    });
    if (is3d) {
      ensureLoaded();
      if (viewer) setRotation(false);
    } else if (viewer && rotating) {
      setRotation(false);
      var btn = mount.querySelector('[data-viewer-controls] [aria-pressed]');
      if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.textContent = window.ShopifyStrings.autoRotate; }
    }
  }

  viewButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setView(button.getAttribute('data-media-view'));
    });
  });
})();
