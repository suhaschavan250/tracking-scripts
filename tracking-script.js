(function () {
  function getConfigFromQuery() {
    const scripts = document.querySelectorAll('script');
    const trackingScript = Array.from(scripts).find(s => s.src && s.src.includes('tracking-scripts'));

    if (!trackingScript || !trackingScript.src.includes('?')) {
      console.warn('[Tracking] Tracking script not found or missing query params.');
      return {};
    }

    const params = new URLSearchParams(trackingScript.src.split('?')[1]);
    const config = {
      ga4MeasurementId: params.get('ga4Id'),
      ctaText: (params.get('ctaText') || "").trim()
    };

    console.log('[Tracking] Config from query:', config);
    return config;
  }

  const CONFIG = getConfigFromQuery();
  const scrollTracked = { '20': false, '50': false };

  // Inject gtag.js if GA4 ID present
  if (CONFIG.ga4MeasurementId) {
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4MeasurementId}`;
    document.head.appendChild(gtagScript);

    gtag('js', new Date());
    gtag('config', CONFIG.ga4MeasurementId);
  }

  function getScrollPercent() {
    const doc = document.documentElement;
    const scrollTop = window.pageYOffset || doc.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    return Math.round((scrollTop / scrollHeight) * 100);
  }

  function sendToGA4(eventName, data = {}) {
    if (typeof gtag === 'function') {
      console.log(`[GA4] Sending event: ${eventName}`, data);
      gtag('event', eventName, data);
    } else {
      console.warn('[GA4] gtag is not loaded');
    }
  }

  function handleScroll() {
    const percent = getScrollPercent();

    if (!scrollTracked['20'] && percent >= 20) {
      sendToGA4('scroll_20', { percent, url: window.location.href });
      scrollTracked['20'] = true;
    }

    if (!scrollTracked['50'] && percent >= 50) {
      sendToGA4('scroll_50', { percent, url: window.location.href });
      scrollTracked['50'] = true;
    }

    if (scrollTracked['20'] && scrollTracked['50']) {
      window.removeEventListener('scroll', debounceScroll);
    }
  }

  let scrollTimeout = null;
  function debounceScroll() {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      handleScroll();
      scrollTimeout = null;
    }, 200);
  }

  function normalize(str) {
    return (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function handleClick(event) {
    const clickedText = (event.target.textContent || '').trim();
    const url = window.location.href;

    sendToGA4('any_click', {
      url,
      text: clickedText.slice(0, 100)
    });

    const clickedNormalized = normalize(clickedText);
    const expected = normalize(CONFIG.ctaText);

    if (clickedNormalized === expected) {
      sendToGA4('any_cta', {
        url,
        text: clickedText.slice(0, 50)
      });
    }
  }

  function initListeners() {
    window.addEventListener('scroll', debounceScroll, { passive: true });
    setTimeout(handleScroll, 1000);
    document.addEventListener('click', handleClick);
  }

  function startTracking() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initListeners();
    } else {
      window.addEventListener('DOMContentLoaded', initListeners);
    }
  }

  function waitForGtag() {
    let attempts = 0;
    const interval = setInterval(() => {
      if (typeof gtag === 'function') {
        clearInterval(interval);
        console.log('[GA4] gtag detected, starting tracking.');
        startTracking();
      } else if (attempts++ >= 40) {
        clearInterval(interval);
        console.warn('[GA4] gtag not detected after waiting, starting anyway.');
        startTracking();
      }
    }, 500);
  }

  waitForGtag();
})();
