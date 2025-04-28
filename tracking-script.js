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
      ctaTexts: (currentScript.getAttribute('data-cta-texts') || "").split(',').map(text => text.trim()).filter(Boolean)
    };
  }

  const CONFIG = getConfig();
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

    // Facebook
    if (typeof fbq === 'function') {
      fbq('trackCustom', eventName, data);
    }

    // Google Ads
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

    // TikTok
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
    let el = event.target;
    while (el && !['BUTTON', 'A'].includes(el.tagName)) {
      el = el.parentElement;
    }
    if (!el) return; // No valid button or link found

    const clickedText = el.textContent?.trim() || '';
    console.log('[CTA Clicked]', clickedText);

    sendToAllPlatforms('any_cta', {
      url: window.location.href,
      text: clickedText.slice(0, 50)
    });
  }

  function initListeners() {
    // Scroll tracking
    window.addEventListener('scroll', debounceScroll, { passive: true });
    setTimeout(handleScroll, 1000);

    // Any click tracking
    document.addEventListener('click', handleAnyClick);

    // CTA click tracking
    if (CONFIG.ctaTexts.length > 0) {
      const elements = document.querySelectorAll('button, a');
      elements.forEach(el => {
        const text = el.textContent?.trim();
        if (CONFIG.ctaTexts.includes(text)) {
          el.addEventListener('click', handleCTA);
        }
      });
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
      } else if (attempts++ >= 40) { // 20 seconds
        clearInterval(interval);
        console.warn('[Tracking] Pixels not detected after waiting, starting anyway.');
        startTracking();
      }
    }, 500);
  }

  waitForPixels();
})();


    
  
