// Client script for Demo Shop. Contains seeded bugs SB-1, SB-4 and SB-7.
(function () {
  // SB-1: the result is appended at the very end of <body>, below the fold.
  // Focus does not move and the page does not scroll, so it looks like nothing happened.
  var check = document.getElementById('check-delivery');
  if (check) {
    check.addEventListener('click', function () {
      fetch('/api/delivery')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var box = document.createElement('div');
          box.className = 'delivery-result';
          box.setAttribute('role', 'dialog');
          box.setAttribute('aria-label', 'Delivery options');
          var items = data.options.map(function (o) { return '<li>' + o + '</li>'; }).join('');
          box.innerHTML = '<h2>Delivery options</h2><ul>' + items + '</ul><button type="button" class="close">Close</button>';
          box.querySelector('.close').addEventListener('click', function () { box.remove(); });
          document.body.appendChild(box);
        });
    });
  }

  // SB-4: the picker opens on mouse click only. The toggle and the day cells are
  // plain divs with no tabindex, and the input is read-only with no key handling.
  var picker = document.querySelector('.datepicker');
  if (picker) {
    var input = picker.querySelector('input');
    var grid = picker.querySelector('.dp-grid');
    var open = function () {
      grid.innerHTML = '';
      for (var i = 2; i < 16; i++) {
        var d = new Date(Date.now() + i * 864e5);
        var iso = d.toISOString().slice(0, 10);
        var cell = document.createElement('div');
        cell.className = 'dp-day';
        cell.dataset.date = iso;
        cell.textContent = String(d.getUTCDate());
        grid.appendChild(cell);
      }
      grid.hidden = false;
    };
    picker.querySelector('.dp-toggle').addEventListener('click', open);
    input.addEventListener('click', open);
    grid.addEventListener('click', function (e) {
      var day = e.target.closest('.dp-day');
      if (!day) return;
      input.value = day.dataset.date;
      grid.hidden = true;
    });
  }

  // SB-7: the dialog asks for confirmation but says nothing about a refund.
  var openCancel = document.getElementById('open-cancel');
  if (openCancel) {
    var dialog = document.getElementById('cancel-dialog');
    openCancel.addEventListener('click', function () { dialog.showModal(); });
    document.getElementById('keep-order').addEventListener('click', function () { dialog.close(); });
  }
})();
