// Function to track the events on platforms like Google Ads, Facebook, TikTok, LinkedIn
function trackEvent(eventName, sendToPlatform) {
    if (!eventName || !sendToPlatform) {
        console.error('Invalid event name or send_to platform ID', eventName, sendToPlatform);
        return; // Prevent sending invalid data
    }

    // Log the event for debugging purposes
    console.log(`Tracking event: ${eventName} to ${sendToPlatform}`);

    // Track on Google Ads / GA4 (gtag)
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, { send_to: sendToPlatform });
    } else {
        console.error('gtag is not defined');
    }

    // Track on Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName);
    } else {
        console.error('fbq is not defined');
    }

    // Track on TikTok Pixel
    if (typeof ttq !== 'undefined') {
        ttq.track(eventName);
    } else {
        console.error('ttq is not defined');
    }

    // Track on LinkedIn
    if (typeof lintrk !== 'undefined') {
        lintrk('track', eventName);
    } else {
        console.error('lintrk is not defined');
    }
}

// Scroll 20% event tracking
var scrollThreshold = 0.2;
var lastScroll = 0;

window.addEventListener('scroll', function () {
    var scrollPercent = (document.documentElement.scrollTop || document.body.scrollTop) /
        (document.documentElement.scrollHeight - document.documentElement.clientHeight);

    if (scrollPercent >= scrollThreshold && lastScroll < scrollThreshold) {
        trackEvent('scroll_20', 'googleAdsConversionId'); // Example platform ID
        lastScroll = scrollThreshold;
    }
});

// Scroll 50% event tracking
var scrollThreshold50 = 0.5;

window.addEventListener('scroll', function () {
    var scrollPercent50 = (document.documentElement.scrollTop || document.body.scrollTop) /
        (document.documentElement.scrollHeight - document.documentElement.clientHeight);

    if (scrollPercent50 >= scrollThreshold50 && lastScroll < scrollThreshold50) {
        trackEvent('scroll_50', 'googleAdsConversionId'); // Example platform ID
        lastScroll = scrollThreshold50;
    }
});

// Click tracking
document.body.addEventListener('click', function () {
    trackEvent('any_click', 'googleAdsConversionId'); // Example platform ID
});

  
