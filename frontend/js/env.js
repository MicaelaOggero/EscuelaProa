(function (global) {
  global.__EEP_ENV__ = Object.assign(
    {
      API_BASE_LOCAL: "http://localhost:4001/api",
      API_BASE_PRODUCTION: "https://escuelaproa.onrender.com"
    },
    global.__EEP_ENV__ || {}
  );

  var runtime = global.__EEP_ENV__;
  var LOCAL_API_BASE = normalize(runtime.API_BASE_LOCAL || "http://localhost:4001/api");
  var PROD_API_BASE = normalize(runtime.API_BASE_PRODUCTION || "");

  function normalize(value) {
    return String(value || "").trim().replace(/\/$/, "");
  }

  function isLocalHost(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  }

  function inferApiBase() {
    var hostname = String((global.location && global.location.hostname) || "").toLowerCase();
    var origin = normalize((global.location && global.location.origin) || "");

    if (isLocalHost(hostname)) return LOCAL_API_BASE;
    if (PROD_API_BASE) return PROD_API_BASE;
    return origin ? origin + "/api" : LOCAL_API_BASE;
  }

  global.EEPEnv = {
    API_BASE_LOCAL: LOCAL_API_BASE,
    API_BASE_PRODUCTION: PROD_API_BASE,
    getApiBase: inferApiBase
  };
})(window);
