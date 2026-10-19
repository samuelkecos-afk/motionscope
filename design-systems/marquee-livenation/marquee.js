/* Marquee design system · behaviour
   1. Hero carousel: arrows, dots, autoplay with pause, neighbours dimmed (via aria-hidden).
      Markup: .carousel > .carousel-track > .slide…, plus .prev / .next buttons and an empty .dots.
   2. Material-style click ripple on .btn.
   No dependencies. */
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
      dots && dots.appendChild(d);
    });
    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-slides[i].offsetLeft) + 'px)';
      slides.forEach(function (s, k) { s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); s.inert = k !== i; });
      dots && Array.prototype.forEach.call(dots.children, function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    }
    function restart() { if (reduce) return; clearInterval(timer); timer = setInterval(function () { go(i + 1); }, 6000); }
    var prev = car.querySelector('.prev'), next = car.querySelector('.next');
    prev && prev.addEventListener('click', function () { go(i - 1); restart(); });
    next && next.addEventListener('click', function () { go(i + 1); restart(); });
    car.addEventListener('mouseenter', function () { clearInterval(timer); });
    car.addEventListener('mouseleave', restart);
    window.addEventListener('resize', function () { go(i); });
    go(0); restart();
  });

  if (!reduce) {
    document.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest && e.target.closest('.btn');
      if (!btn) return;
      var r = btn.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
      var s = document.createElement('span');
      s.className = 'ripple';
      s.style.width = s.style.height = size + 'px';
      s.style.left = (e.clientX - r.left - size / 2) + 'px';
      s.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(s);
      setTimeout(function () { s.remove(); }, 600);
    });
  }
})();
