(function () {
  // 1. Get configuration from script's data attributes
  function getConfig() {
    const currentScript = document.currentScript || (function () {
      const scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

    return {
      facebookPixelId: currentScript.getAttribute('data-facebook-pixel-id'),
      googleAdsId: currentScript.getAttribute('data-google-ads-id'),
      scroll20ConversionId: currentScript.getAttribute('data-scroll-20-conversion'),
      scroll50ConversionId: currentScript.getAttribute('data-scroll-50-conversion'),
      ga4MeasurementId: currentScript.getAttribute('data-ga4-id'),
      tiktokPixelId: currentScript.getAttribute('data-tiktok-pixel-id'),
      ctaSelectors: (currentScript.getAttribute('data-cta-selectors') || "").split(',').map(sel => sel.trim())
    };
  }

  const CONFIG = getConfig();
  const tracked = { scroll20: false, scroll50: false, anyClick: false, ctaClick: false };
  const scrollTracked = { '20': false, '50': false };

  function pixelsReady() {
    return (
      typeof fbq !== 'undefined' ||
      typeof gtag !== 'undefined' ||
      typeof ttq !== 'undefined'
    );
  }

  function getScrollPercent() {
    const doc = document.documentElement;
    const scrollTop = window.pageYOffset || doc.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    return Math.round((scrollTop / scrollHeight) * 100);
  }

  function sendToAllPlatforms(eventName, data = {}) {
    // Facebook
    if (typeof fbq !== 'undefined') {
      fbq('trackCustom', eventName, data);
    }

    // Google Ads
    if (typeof gtag !== 'undefined' && CONFIG.googleAdsId) {
      const conversionId = 
        eventName === 'scroll_20' ? CONFIG.scroll20ConversionId :
        eventName === 'scroll_50' ? CONFIG.scroll50ConversionId : null;

      if (conversionId) {
        gtag('event', 'conversion', { 'send_to': ${CONFIG.googleAdsId}/${conversionId} });
      }

      // GA4 generic event
      if (CONFIG.ga4MeasurementId) {
        gtag('event', eventName, data);
      }
    }

    // TikTok
    if (typeof ttq !== 'undefined') {
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
    if (!tracked.anyClick) {
      tracked.anyClick = true;
      sendToAllPlatforms('any_click', { url: window.location.href });
    }
  }

  function handleCTA(event) {
    sendToAllPlatforms('any_cta', {
      url: window.location.href,
      selector: event.target?.outerHTML?.slice(0, 100) || ''
    });
  }

  function initListeners() {
    // Scroll tracking
    window.addEventListener('scroll', debounceScroll, { passive: true });
    setTimeout(handleScroll, 1000); // for above-the-fold pages

    // Any click tracking
    document.addEventListener('click', handleAnyClick, { once: true });

    // CTA click tracking
    CONFIG.ctaSelectors.forEach(selector => {
      if (!selector) return;
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.addEventListener('click', handleCTA);
      });
    });
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
      if (pixelsReady() || attempts >= 20) {
        clearInterval(interval);
        startTracking();
      }
      attempts++;
    }, 500);
  }

  waitForPixels();
})();
