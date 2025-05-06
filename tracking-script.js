(function () {
  console.log('[Tracking] Script started');

  function getConfigFromQuery() {
    const scripts = document.querySelectorAll('script');
    const trackingScript = Array.from(scripts).find(s => s.src && s.src.includes('tracking-scripts'));

    if (!trackingScript || !trackingScript.src.includes('?')) {
      console.warn('[Tracking] Tracking script not found or missing query params.');
      return {};
    }

    const queryString = trackingScript.src.split('?')[1];
    const params = new URLSearchParams(queryString);

    return {
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
  }

  const CONFIG = getConfigFromQuery();
  const scrollTracked = { '20': false, '50': false };

  // Inject gtag.js if GA4 or Google Ads ID is present
  if (CONFIG.ga4MeasurementId || CONFIG.googleAdsId) {
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4MeasurementId || CONFIG.googleAdsId}`;
    
    gtagScript.onload = function () {
      console.log('[Tracking] gtag.js loaded successfully');
      if (CONFIG.ga4MeasurementId) gtag('config', CONFIG.ga4MeasurementId);
      if (CONFIG.googleAdsId) gtag('config', CONFIG.googleAdsId);
    };

    gtagScript.onerror = function () {
      console.warn('[Tracking] gtag.js failed to load');
    };

    document.head.appendChild(gtagScript);
  }

  function pixelsReady() {
    return (
      typeof fbq === 'function' ||
      typeof gtag === 'function' ||
      typeof ttq === 'function'
    );
  }

  function sendToAllPlatforms(eventName, data = {}) {
    console.log(`[Tracking] Event: ${eventName}`, data);

    // Facebook
    if (typeof fbq === 'function' && CONFIG.facebookPixelId) {
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
        console.log(`[Tracking] Sending Google Ads conversion: ${conversionId}`);
        gtag('event', 'conversion', {
          send_to: `${CONFIG.googleAdsId}/${conversionId}`
        });
      }
    }

    // GA4
    if (typeof gtag === 'function' && CONFIG.ga4MeasurementId) {
      console.log(`[Tracking] Sending GA4 event: ${eventName}`);
      gtag('event', eventName, data);
    } else {
      console.warn('[Tracking] gtag is not available. Skipping GA4 event.');
    }

    // TikTok
    if (typeof ttq === 'function' && CONFIG.tiktokPixelId) {
      ttq.track(eventName, data);
    }
  }

  function getScrollPercent() {
    const doc = document.documentElement;
    const scrollTop = window.pageYOffset || doc.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    return Math.round((scrollTop / scrollHeight) * 100);
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

  function normalize(str) {
    return (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function handleClick(event) {
    const clickedText = (event.target.textContent || '').trim();
    const url = window.location.href;

    const clickedNormalized = normalize(clickedText);
    const expected = normalize(CONFIG.ctaText);

    sendToAllPlatforms('any_click', {
      url,
      text: clickedText.slice(0, 100)
    });

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
