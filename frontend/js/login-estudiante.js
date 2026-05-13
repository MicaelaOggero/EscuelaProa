(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";

  function $(sel) {
    return document.querySelector(sel);
  }

  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("is-error", "is-ok");
    if (kind === "error") el.classList.add("is-error");
    if (kind === "ok") el.classList.add("is-ok");
  }

  function getApiBase() {
    var saved = localStorage.getItem(STORAGE_API_BASE);
    return saved || "http://localhost:4000/api";
  }

  function setApiBase(v) {
    localStorage.setItem(STORAGE_API_BASE, v);
  }

  function setToken(t) {
    localStorage.setItem(STORAGE_TOKEN, t || "");
  }

  function setUser(u) {
    if (!u) return localStorage.removeItem(STORAGE_USER);
    localStorage.setItem(STORAGE_USER, JSON.stringify(u));
  }

  async function api(path, opts) {
    var base = getApiBase().replace(/\/$/, "");
    var url = base + path;
    var res = await fetch(url, Object.assign({
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, opts || {}));
    var text = await res.text();
    var data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { raw: text };
    }
    if (!res.ok) {
      var msg = (data && (data.message || data.error)) || res.statusText || "Request failed";
      throw new Error(msg);
    }
    return data;
  }

  function initApiBaseUI() {
    var apiBaseEl = $("#apiBase");
    var btnSave = $("#saveApi");
    if (!apiBaseEl || !btnSave) return;
    apiBaseEl.value = getApiBase();
    btnSave.addEventListener("click", function () {
      var v = String(apiBaseEl.value || "").trim();
      if (!v) return;
      setApiBase(v);
    });
  }

  function initLogin() {
    var form = $("#loginForm");
    var msgEl = $("#msg");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Ingresando...", "");
      try {
        var email = $("#email").value;
        var password = $("#password").value;
        var data = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email, password: password })
        });
        setToken(data.token);
        setUser(data.user);
        setMsg(msgEl, "OK", "ok");
        window.location.href = "estudiante.html";
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  initApiBaseUI();
  initLogin();
})();
