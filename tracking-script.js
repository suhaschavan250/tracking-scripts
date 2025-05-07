(function () {
  function getConfigFromQuery() {
    const scripts = document.querySelectorAll('script');
    const trackingScript = Array.from(scripts).find(s => s.src && s.src.includes('tracking-scripts'));

    if (!trackingScript || !trackingScript.src.includes('?')) {
      console.log('[Tracking] Tracking script not found or missing query params.');
      return {};
    }

    const src = trackingScript.src;
    const queryString = src.substring(src.indexOf('?') + 1);
    const params = new URLSearchParams(queryString);

    const config = {
      facebookPixelId: params.get('facebookPixelId'),
      googleAdsId: params.get('googleAdsId'),
      scroll20ConversionId: params.get('scroll20ConversionId'),
      scroll50ConversionId: params.get('scroll50ConversionId'),
      anyClickConversionId: params.get('anyClickConversionId'),
      ctaClickConversionId: params.get('ctaClickConversionId'),
      ga4MeasurementId: params.get('ga4Id'),
      tiktokPixelId: params.get('tiktokPixelId'),
      ctaText: (params.get('ctaText') || "").trim()
    };

    console.log('[Tracking] Config from query:', config);
    return config;
  }

  const CONFIG = getConfigFromQuery();
  const scrollTracked = { '20': false, '50': false };

  function pixelsReady() {
    return (
      typeof fbq === 'function' ||
      typeof window.gtag === 'function' ||
      typeof ttq === 'function'
    );
  }

  function isGA4Configured() {
    const isPresent = typeof window.gtag === 'function';
    const hasId = !!CONFIG.ga4MeasurementId;

    console.log(`[Tracking] GA4 gtag present: ${isPresent}`);
    console.log(`[Tracking] GA4 ID present: ${hasId} (${CONFIG.ga4MeasurementId})`);

    return isPresent && hasId;
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
    if (typeof fbq === 'function' && CONFIG.facebookPixelId) {
      fbq('trackCustom', eventName, data);
      console.log(`[Tracking] Facebook event sent: ${eventName}`);
    }

    // Google Ads (conversion)
    if (typeof window.gtag === 'function' && CONFIG.googleAdsId) {
      let conversionId = null;
      if (eventName === 'scroll_20') conversionId = CONFIG.scroll20ConversionId;
      if (eventName === 'scroll_50') conversionId = CONFIG.scroll50ConversionId;
      if (eventName === 'any_click') conversionId = CONFIG.anyClickConversionId;
      if (eventName === 'any_cta') conversionId = CONFIG.ctaClickConversionId;

      if (conversionId) {
        window.gtag('event', 'conversion', { 'send_to': `${CONFIG.googleAdsId}/${conversionId}` });
        console.log(`[Tracking] Google Ads event sent for: ${eventName}`);
      }
    }

    // GA4
    if (typeof window.gtag === 'function' && CONFIG.ga4MeasurementId) {
      window.gtag('event', eventName);
      console.log(`[Tracking] GA4 event sent: ${eventName}`);
    }

    // TikTok
    if (typeof ttq === 'function' && CONFIG.tiktokPixelId) {
      ttq.track(eventName, data);
      console.log(`[Tracking] TikTok event sent: ${eventName}`);
    }
  }

  function handleScroll() {
    const percent = getScrollPercent();

    if (!scrollTracked['20'] && percent >= 20) {
      sendToAllPlatforms('scroll_20');
      scrollTracked['20'] = true;
    }

    if (!scrollTracked['50'] && percent >= 50) {
      sendToAllPlatforms('scroll_50');
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

    const clickedNormalized = normalize(clickedText);
    const expected = normalize(CONFIG.ctaText);

    console.log('[Tracking] Clicked Text:', `"${clickedText}"`);
    console.log('[Tracking] CTA Text:', `"${CONFIG.ctaText}"`);
    console.log('[Tracking] Normalized Match:', clickedNormalized === expected);

    sendToAllPlatforms('any_click');

    if (clickedNormalized === expected) {
      sendToAllPlatforms('any_cta');
    }
  }

  function initListeners() {
    window.addEventListener('scroll', debounceScroll, { passive: true });
    setTimeout(handleScroll, 1000);
    document.addEventListener('click', handleClick);
  }

  function waitForPixels() {
    let attempts = 0;
    const interval = setInterval(() => {
      if (pixelsReady()) {
        clearInterval(interval);
        console.log('[Tracking] Pixels detected, starting tracking.');
        isGA4Configured(); // GA4 debug check
        startTracking();
      } else if (attempts++ >= 40) {
        clearInterval(interval);
        console.log('[Tracking] Pixels not detected after waiting, starting anyway.');
        isGA4Configured(); // GA4 debug check
        startTracking();
      }
    }, 500);
  }

  function startTracking() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initListeners();
    } else {
      window.addEventListener('DOMContentLoaded', initListeners);
    }
  }

  waitForPixels();
})();
