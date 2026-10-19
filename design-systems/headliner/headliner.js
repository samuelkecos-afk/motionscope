/* Headliner design system · behaviour
   1. Smooth scrolling with Lenis (load lenis.min.js before this file; skipped if missing or reduced motion).
   2. Film grain texture for any element with class "grain".
   3. Optional helper for sign-up forms with data-signup: validates and shows a message.
   No other dependencies. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce && window.Lenis) {
    var lenis = new window.Lenis({ lerp: 0.1, anchors: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    window.headlinerLenis = lenis;
  }

  document.querySelectorAll('.grain').forEach(function (grain) {
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 160;
      var ctx = c.getContext('2d');
      var img = ctx.createImageData(160, 160);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      grain.style.backgroundImage = 'url(' + c.toDataURL() + ')';
    } catch (e) { grain.remove(); }
  });

  // <form data-signup> with an <input type="email"> and an element with class "msg".
  // Replace the success branch with a real request to your email tool before launch.
  document.querySelectorAll('form[data-signup]').forEach(function (form) {
    var email = form.querySelector('input[type="email"]');
    var msg = form.querySelector('.msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!email.value || !email.checkValidity()) {
        msg.textContent = 'Enter an email address like name@example.com.';
        email.focus();
        return;
      }
      msg.textContent = 'Got it: ' + email.value + '. (Not sent yet: connect this form to your email tool.)';
      form.reset();
    });
  });
})();
