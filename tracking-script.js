(function() {
  var scroll_20_fired = false;
  var scroll_50_fired = false;

  window.addEventListener('scroll', function() {
    let scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;

    if (scrollPercent >= 0.2 && !scroll_20_fired) {
      scroll_20_fired = true;
      window.dataLayer.push({ event: 'scroll_20' });
    }

    if (scrollPercent >= 0.5 && !scroll_50_fired) {
      scroll_50_fired = true;
      window.dataLayer.push({ event: 'scroll_50' });
    }
  });

  document.body.addEventListener('click', function() {
    window.dataLayer.push({ event: 'any_click' });
  });
})();
