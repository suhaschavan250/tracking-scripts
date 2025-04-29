(function () {
  function getConfigFromQuery() {
    try {
      const scriptEl = document.currentScript || (function () {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
      })();

      const url = new URL(scriptEl.src);
      const params = new URLSearchParams(url.search);

      return {
        facebookPixelId: params.get('facebookPixelId'),
        googleAdsId: params.get('googleAdsId'),
        scroll20ConversionId: params.get('scroll20ConversionId'),
        scroll50ConversionId: params.get('scroll50ConversionId'),
        anyClickConversionId: params.get('anyClickConversionId'),
        ctaClickConversionId: params.get('ctaClickConversionId'),
        ga4MeasurementId: params.get('ga4Id'),
        tiktokPixelId: params.get('tiktokPixelId'),
        ctaSelector: (params.get('ctaSelector') || "").trim()
      };
    } catch (e) {
      console.warn('[Tracking] Failed to read config from query params:', e);
      return {};
    }
  }

  const CONFIG = getConfigFromQuery();
  const scrollTracked = { '20': false, '50': false };

  function pixelsReady() {
    return (
      typeof fbq === 'function' ||
      typeof gtag === 'function' ||
      typeof ttq === 'function'
    );
  }

  function getScrollPercent() {
    const doc = document.documentElement;
    const scrollTop = window.pageYOffset || doc.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    return Math.round((scrollTop / scrollHeight) * 100);
  }

  function sendToAllPlatforms(eventName, data = {}) {
    console.log(`[Tracking] Event: ${eventName}`, data);

    if (typeof fbq === 'function') {
      fbq('trackCustom', eventName, data);
    }

    if (typeof gtag === 'function' && CONFIG.googleAdsId) {
      let conversionId = null;
      if (eventName === 'scroll_20') conversionId = CONFIG.scroll20ConversionId;
      if (eventName === 'scroll_50') conversionId = CONFIG.scroll50ConversionId;
      if (eventName === 'any_click') conversionId = CONFIG.anyClickConversionId;
      if (eventName === 'any_cta') conversionId = CONFIG.ctaClickConversionId;

      if (conversionId) {
        gtag('event', 'conversion', { 'send_to': `${CONFIG.googleAdsId}/${conversionId}` });
      }

      if (CONFIG.ga4MeasurementId) {
        gtag('event', eventName, data);
      }
    }

    if (typeof ttq === 'function') {
      ttq.track(eventName, data);
    }
  }

  function handleScroll() {
    const percent = getScrollPercent();

    if (!scrollTracked['20'] && percent >= 20) {
      sendToAllPlatforms('scroll_20', { percent, url: window.location.href });
      scrollTracked['20'] = true;
    }

    if (!scrollTracked['50'] && percent >= 50) {
      sendToAllPlatforms('scroll_50', { percent, url: window.location.href });
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

  function handleAnyClick() {
    sendToAllPlatforms('any_click', { url: window.location.href });
  }

  function handleCTA(event) {
    if (!CONFIG.ctaSelector) return;

    let el = event.target;

    while (el && el !== document.body) {
      if (el.matches(CONFIG.ctaSelector)) {
        const text = el.textContent?.trim().slice(0, 50) || '';
        console.log('[CTA Clicked]', CONFIG.ctaSelector, text);
        sendToAllPlatforms('any_cta', {
          url: window.location.href,
          text
        });
        break;
      }
      el = el.parentElement;
    }
  }

  function initListeners() {
    window.addEventListener('scroll', debounceScroll, { passive: true });
    setTimeout(handleScroll, 1000);

    document.addEventListener('click', handleAnyClick);

    if (CONFIG.ctaSelector) {
      document.addEventListener('click', handleCTA);
    }
  }

  function startTracking() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initListeners();
    } else {
      window.addEventListener('DOMContentLoaded', initListeners);
    }
  }

  function waitForPixels() {
    let attempts = 0;
    const interval = setInterval(() => {
      if (pixelsReady()) {
        clearInterval(interval);
        console.log('[Tracking] Pixels detected, starting tracking.');
        startTracking();
      } else if (attempts++ >= 40) {
        clearInterval(interval);
        console.warn('[Tracking] Pixels not detected after waiting, starting anyway.');
        startTracking();
      }
    }, 500);
  }

  waitForPixels();
})();

