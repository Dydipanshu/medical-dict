// USGScribe website: the hero dictation demo and the "Copy the format" buttons.
(function () {
  // ---------- copy buttons ----------
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var el = document.querySelector(btn.getAttribute("data-copy"));
      if (!el) return;
      var html = el.innerHTML;
      var text = el.innerText;
      var done = function () {
        var label = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = label; }, 1800);
      };
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard
          .write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })])
          .then(done, function () { navigator.clipboard.writeText(text).then(done); });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(done);
      }
    });
  });

  // ---------- hero demo ----------
  var demo = document.querySelector(".demo");
  if (!demo) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // keep the finished report

  var said = document.getElementById("demo-said");
  // What the doctor says for each line (data-step) of the sheet.
  var SPOKEN = [
    "liver normal in size measuring fourteen point five centimetres full stop no focal lesion",
    "insert normal gallbladder",
    "measures ten point two by four point five centimetres full stop a six millimetre calculus is seen in the lower pole",
    "right renal calculus full stop",
  ];
  var targets = Array.prototype.slice.call(demo.querySelectorAll("[data-step]"));
  var finals = targets.map(function (t) { return t.innerHTML; });

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Types an HTML string (text plus <span class="m"> measurements) character by character.
  function typeInto(el, html, speed) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    var parts = [];
    tmp.childNodes.forEach(function (n) {
      parts.push(n.nodeType === 3 ? { text: n.textContent } : { text: n.textContent, cls: n.className });
    });
    el.innerHTML = "";
    el.classList.add("typing");
    var p = Promise.resolve();
    parts.forEach(function (part) {
      p = p.then(function () {
        var node = part.cls ? document.createElement("span") : document.createTextNode("");
        if (part.cls) node.className = part.cls;
        el.appendChild(node);
        var i = 0;
        return new Promise(function (done) {
          (function tick() {
            i += 2;
            node.textContent = part.text.slice(0, i);
            if (i >= part.text.length) return done();
            setTimeout(tick, speed);
          })();
        });
      });
    });
    return p.then(function () { el.classList.remove("typing"); });
  }

  function speak(text) {
    var words = text.split(" ");
    said.textContent = "";
    var p = Promise.resolve();
    words.forEach(function (w, i) {
      p = p.then(function () {
        said.textContent = words.slice(0, i + 1).join(" ");
        return wait(110 + w.length * 18);
      });
    });
    return p;
  }

  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(demo);
  }

  function run() {
    targets.forEach(function (t) { t.innerHTML = ""; });
    demo.classList.add("is-listening");
    var p = wait(700);
    SPOKEN.forEach(function (text, i) {
      p = p
        .then(function () { return speak(text); })
        .then(function () { return wait(380); }) // the pause that sends the segment
        .then(function () { return typeInto(targets[i], finals[i], 16); })
        .then(function () { return wait(500); });
    });
    return p
      .then(function () {
        demo.classList.remove("is-listening");
        said.textContent = "";
        return wait(4200);
      })
      .then(function waitUntilVisible() {
        return visible ? null : wait(1000).then(waitUntilVisible);
      })
      .then(run);
  }
  run();
})();
