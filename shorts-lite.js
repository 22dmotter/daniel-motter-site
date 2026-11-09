/* Lite YouTube Shorts: each thumbnail is a real link; on click, swap it for the same lazy iframe used
   by the featured Short. Builds nodes with createElement/setAttribute only (no innerHTML). */
(function () {
  'use strict';
  var ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  var ID = /^[A-Za-z0-9_-]{11}$/;
  document.querySelectorAll('a.short-play[data-short-id]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('data-short-id');
      if (!ID.test(id) || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      var f = document.createElement('iframe');
      f.setAttribute('src', 'https://www.youtube.com/embed/' + id + '?autoplay=1');
      f.setAttribute('title', a.getAttribute('data-short-title') || 'Daniel Motter YouTube Short');
      f.setAttribute('allow', ALLOW);
      f.setAttribute('allowfullscreen', '');
      var box = a.parentNode;
      box.classList.remove('lite');
      box.replaceChild(f, a);
      f.focus();
    });
  });
}());
