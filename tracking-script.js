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

  // Inject gtag.js if GA4 or Google Ads ID is present
  if (CONFIG.ga4MeasurementId || CONFIG.googleAdsId) {
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4MeasurementId || CONFIG.googleAdsId}`;
    document.head.appendChild(gtagScript);

    gtagScript.onload = function () {
      console.log('[Tracking] gtag.js loaded');

      gtag('js', new Date());

      if (CONFIG.ga4MeasurementId) {
        console.log('[Tracking] Initializing GA4 config:', CONFIG.ga4MeasurementId);
        gtag('config', CONFIG.ga4MeasurementId);
      }

      if (CONFIG.googleAdsId) {
        console.log('[Tracking] Initializing Google Ads config:', CONFIG.googleAdsId);
        gtag('config', CONFIG.googleAdsId);
      }

      // Send test GA4 event to confirm
      if (CONFIG.ga4MeasurementId) {
        console.log('[Tracking] Sending test_event to GA4');
        gtag('event', 'test_event', {
          test_param: 'test_value',
          page_path: window.location.pathname
        });
      }

      waitForPixels(); // Start tracking after gtag is loaded
    };
  } else {
    console.warn('[Tracking] No GA4 or Google Ads ID provided. Skipping gtag injection.');
    waitForPixels(); // Still track scroll/clicks if other platforms used
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

    // Facebook
    if (typeof fbq === 'function' && CONFIG.facebookPixelId) {
      fbq('trackCustom', eventName, data);
    }

    // Google Ads
    if (typeof gtag === 'function') {
      if (CONFIG.googleAdsId) {
        let conversionId = null;
        if (eventName === 'scroll_20') conversionId = CONFIG.scroll20ConversionId;
        if (eventName === 'scroll_50') conversionId = CONFIG.scroll50ConversionId;
        if (eventName === 'any_click') conversionId = CONFIG.anyClickConversionId;
        if (eventName === 'any_cta') conversionId = CONFIG.ctaClickConversionId;

        if (conversionId) {
          console.log(`[Tracking] Sending conversion to Google Ads: ${conversionId}`);
          gtag('event', 'conversion', {
            send_to: `${CONFIG.googleAdsId}/${conversionId}`
          });
        }
      }

      // GA4
      if (CONFIG.ga4MeasurementId) {
        console.log(`[Tracking] Sending event to GA4: ${eventName}`);
        gtag('event', eventName, data);
      }
    }

    // TikTok
    if (typeof ttq === 'function' && CONFIG.tiktokPixelId) {
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
})();

