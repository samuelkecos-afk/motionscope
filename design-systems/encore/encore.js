/* Encore design system · behaviour
   1. Hero carousel (Live Nation): arrows, dots, 6s autoplay that pauses on hover, neighbours dimmed.
      Markup: .carousel > .carousel-track > .slide…, plus .prev / .next buttons and an empty .dots.
   2. Smooth scrolling with Lenis (warmnfuzzy; load lenis.min.js first; skipped for reduced motion).
   3. Film grain for any element with class "grain".
   4. Sign-up helper for <form data-signup> with an email input and a .msg element.
   No other dependencies. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.carousel').forEach(function (car) {
    var track = car.querySelector('.carousel-track');
    var slides = Array.prototype.slice.call(car.querySelectorAll('.slide'));
    var dots = car.querySelector('.dots');
    var i = 0, timer = null;
    slides.forEach(function (_, k) {
      var d = document.createElement('button');
      d.className = 'dot'; d.type = 'button'; d.setAttribute('aria-label', 'Slide ' + (k + 1));
      d.addEventListener('click', function () { go(k); restart(); });
      if (dots) dots.appendChild(d);
    });
    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-slides[i].offsetLeft) + 'px)';
      slides.forEach(function (s, k) { s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); s.inert = k !== i; });
      if (dots) Array.prototype.forEach.call(dots.children, function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    }
    function restart() { if (reduce) return; clearInterval(timer); timer = setInterval(function () { go(i + 1); }, 6000); }
    var prev = car.querySelector('.prev'), next = car.querySelector('.next');
    if (prev) prev.addEventListener('click', function () { go(i - 1); restart(); });
    if (next) next.addEventListener('click', function () { go(i + 1); restart(); });
    car.addEventListener('mouseenter', function () { clearInterval(timer); });
    car.addEventListener('mouseleave', restart);
    window.addEventListener('resize', function () { go(i); });
    go(0); restart();
  });

  if (!reduce && window.Lenis) {
    var lenis = new window.Lenis({ lerp: 0.1, anchors: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    window.encoreLenis = lenis;
  }

  document.querySelectorAll('.grain').forEach(function (grain) {
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 160;
      var ctx = c.getContext('2d');
      var img = ctx.createImageData(160, 160);
      for (var p = 0; p < img.data.length; p += 4) {
        var v = Math.random() * 255;
        img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
        img.data[p + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      grain.style.backgroundImage = 'url(' + c.toDataURL() + ')';
    } catch (e) { grain.remove(); }
  });

  // Replace the success branch with a real request to your email tool before launch.
  document.querySelectorAll('form[data-signup]').forEach(function (form) {
    var email = form.querySelector('input[type="email"]');
    var msg = form.parentNode.querySelector('.msg') || form.querySelector('.msg');
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
