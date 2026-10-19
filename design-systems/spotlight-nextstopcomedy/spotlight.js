/* Spotlight design system · behaviour
   Optional sign-up helper: <form data-signup> with an <input type="email"> and an element with class "msg".
   Replace the success branch with a real request to your email tool before launch. */
(function () {
  document.querySelectorAll('form[data-signup]').forEach(function (form) {
    var email = form.querySelector('input[type="email"]');
    var msg = form.querySelector('.msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!email.value || !email.checkValidity()) { msg.textContent = 'Enter an email address like name@example.com.'; email.focus(); return; }
      msg.textContent = 'Got it: ' + email.value + '. (Not sent yet: connect this form to your email tool.)';
      form.reset();
    });
  });
})();
