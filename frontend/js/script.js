function initYear() {
  var yearEl = document.getElementById("year");
  if (!yearEl) return;
  yearEl.textContent = String(new Date().getFullYear());
}

function initNavToggle() {
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    menu.classList.toggle("is-open", open);
  }

  toggle.addEventListener("click", function () {
    var isOpen = toggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    if (menu.contains(target) || toggle.contains(target)) return;
    setOpen(false);
  });

  menu.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    if (target.matches("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
}

function initReveal() {
  var els = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (!els.length) return;

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var obs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  els.forEach(function (el) {
    obs.observe(el);
  });
}

function initAuthHeader() {
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var token = localStorage.getItem(STORAGE_TOKEN) || "";
  var userRaw = localStorage.getItem(STORAGE_USER);
  var user = null;
  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch (e) {
    user = null;
  }

  var loginLink = document.getElementById("loginLink");
  var panelLink = document.getElementById("panelLink");
  var logoutBtn = document.getElementById("logoutBtn");

  var isLoggedIn = Boolean(token && user);
  var roles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
  if (!Array.isArray(roles)) roles = [];
  var isStaff = roles.indexOf("superadmin") !== -1 || roles.indexOf("directivo") !== -1 || roles.indexOf("docente") !== -1;

  if (loginLink) loginLink.hidden = isLoggedIn;
  if (logoutBtn) logoutBtn.hidden = !isLoggedIn;
  if (panelLink) panelLink.hidden = !isStaff;

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      if (loginLink) loginLink.hidden = false;
      if (panelLink) panelLink.hidden = true;
      logoutBtn.hidden = true;
    });
  }
}

initYear();
initNavToggle();
initReveal();
initAuthHeader();
