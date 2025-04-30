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

  function normalize(text) {
    return (text || "")
      .replace(/\u2018|\u2019|\u201A|\u201B/g, "'") // curly single quotes → '
      .replace(/\u201C|\u201D|\u201E|\u201F/g, '"') // curly double quotes → "
      .replace(/\s+/g, ' ') // collapse multiple spaces
      .trim()
      .toLowerCase();
  }

  function pixelsReady() {
    return typeof fbq === 'function' || typeof gtag === 'function' || typeof ttq === 'function';
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

    if (typeof gtag === 'function') {
      let conversionId = null;
      if (eventName === 'scroll_20') conversionId = CONFIG.scroll20ConversionId;
      if (eventName === 'scroll_50') conversionId = CONFIG.scroll50ConversionId;
      if (eventName === 'any_click') conversionId = CONFIG.anyClickConversionId;
      if (eventName === 'any_cta') conversionId = CONFIG.ctaClickConversionId;

      if (conversionId && CONFIG.googleAdsId) {
        gtag('event', 'conversion', { send_to: `${CONFIG.googleAdsId}/${conversionId}` });
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
    const url = window.location.href;

    if (!scrollTracked['20'] && percent >= 20) {
      sendToAllPlatforms('scroll_20', { percent, url });
      scrollTracked['20'] = true;
    }

    if (!scrollTracked['50'] && percent >= 50) {
      sendToAllPlatforms('scroll_50', { percent, url });
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

  function handleClick(event) {
    const clickedText = (event.target.textContent || '').trim();
    const url = window.location.href;

    // Always send any_click
    sendToAllPlatforms('any_click', {
      url,
      text: clickedText.slice(0, 100)
    });

    // Check if clicked text is close enough to ctaText
    const clickedNormalized = normalize(clickedText);
    const expected = normalize(CONFIG.ctaText);

    if (clickedNormalized === expected) {
      sendToAllPlatforms('any_cta', {
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

  function waitForPixels() {
    let tries = 0;
    const interval = setInterval(() => {
      if (pixelsReady()) {
        clearInterval(interval);
        startTracking();
      } else if (++tries >= 40) {
        clearInterval(interval);
        startTracking();
      }
    }, 500);
  }

  waitForPixels();
})();
