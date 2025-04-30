(function () {
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
      anyClickConversionId: currentScript.getAttribute('data-any-click-conversion'),
      ctaClickConversionId: currentScript.getAttribute('data-cta-click-conversion'),
      ga4MeasurementId: currentScript.getAttribute('data-ga4-id'),
      tiktokPixelId: currentScript.getAttribute('data-tiktok-pixel-id'),
      ctaText: (currentScript.getAttribute('data-cta-text') || "").trim()
    };
  }

  const CONFIG = getConfig();
  const scrollTracked = { '20': false, '50': false };

  function normalizeText(text) {
    return (text || "")
      .replace(/\u2018|\u2019|\u201A|\u201B/g, "'")  // curly single quotes → straight
      .replace(/\u201C|\u201D|\u201E|\u201F/g, '"')  // curly double quotes → straight
      .replace(/\s+/g, ' ')                         // collapse whitespace
      .trim()
      .toLowerCase();                               // case-insensitive match
  }

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

  function handleAnyClick(event) {
    const originalUrl = window.location.href;
    const expectedCTA = normalizeText(CONFIG.ctaText);

    let el = event.target;
    let matchedText = "";

    // Traverse up the DOM tree to find an element with text matching ctaText
    while (el && el !== document.body) {
      const text = normalizeText(el.textContent || '');
      if (text === expectedCTA) {
        matchedText = el.textContent.trim();
        break;
      }
      el = el.parentElement;
    }

    const clickedText = (event.target.textContent || '').trim();
    sendToAllPlatforms('any_click', {
      url: originalUrl,
      text: clickedText.slice(0, 100)
    });

    if (matchedText) {
      sendToAllPlatforms('any_cta', {
        url: originalUrl,
        text: matchedText.slice(0, 50)
      });
    }
  }

  function initListeners() {
    window.addEventListener('scroll', debounceScroll, { passive: true });
    setTimeout(handleScroll, 1000);

    document.addEventListener('click', handleAnyClick);
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
