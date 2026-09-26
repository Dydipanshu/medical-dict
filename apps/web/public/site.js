// USGScribe website: demo video with live captions, Word screenshot tabs, copy buttons.
(function () {
  // ---------- demo video ----------
  var video = document.getElementById("film");
  var toggle = document.getElementById("film-toggle");
  var said = document.getElementById("said");
  if (video && toggle) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var setLabel = function () {
      var playing = !video.paused;
      toggle.textContent = playing ? "Pause" : "Play";
      toggle.setAttribute("aria-label", playing ? "Pause video" : "Play video");
    };
    toggle.addEventListener("click", function () {
      if (video.paused) video.play(); else video.pause();
    });
    video.addEventListener("play", setLabel);
    video.addEventListener("pause", setLabel);

    // Captions show what the doctor is saying, under the video.
    var track = video.textTracks && video.textTracks[0];
    if (track && said) {
      track.mode = "hidden";
      track.addEventListener("cuechange", function () {
        var cue = track.activeCues && track.activeCues[0];
        said.textContent = cue ? cue.text : "";
      });
    }

    // Autoplay (muted) only when visible and motion is welcome.
    if (!reduce && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) video.play().catch(function () {});
          else video.pause();
        });
      }, { threshold: 0.35 }).observe(video);
    }
    setLabel();
  }

  // ---------- Word before / after ----------
  var img = document.getElementById("shot-img");
  var tabs = document.querySelectorAll(".shot-tabs [role=tab]");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
      img.src = tab.getAttribute("data-src");
      img.alt = tab.getAttribute("data-alt");
    });
  });

  // ---------- copy buttons (report format pages) ----------
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
})();
