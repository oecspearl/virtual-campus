/**
 * Returns the JavaScript source that gets embedded in generated SCORM packages.
 * This runtime bridges between the SCO content and the parent LMS API adapter
 * (window.API_1484_11 injected by SCORMPlayer.tsx).
 *
 * It is intentionally a plain string — it runs inside an iframe, separate from
 * the React app.
 */
export function getScormRuntimeJs(): string {
  return `
// ─── SCORM 2004 Runtime Bridge ──────────────────────────────────────────────
// This script runs inside the generated SCORM package iframe.
// It finds the LMS-provided API_1484_11 object on parent/opener and wraps it.

(function () {
  "use strict";

  var api = null;

  // Walk up the frame chain to find the API
  function findAPI(win) {
    var attempts = 0;
    while (win && attempts < 10) {
      if (win.API_1484_11) return win.API_1484_11;
      if (win.API) return win.API;
      if (win === win.parent) break;
      win = win.parent;
      attempts++;
    }
    return null;
  }

  api = findAPI(window);
  if (!api && window.opener) api = findAPI(window.opener);

  if (!api) {
    console.warn("[SCORM Runtime] No LMS API found — running in standalone mode");
  }

  // ─── Public SCORM wrapper ──────────────────────────────────────────────────

  window.SCORM = {
    _initialized: false,

    initialize: function () {
      if (!api) return true; // standalone
      var result = api.Initialize ? api.Initialize("") : (api.LMSInitialize ? api.LMSInitialize("") : "true");
      this._initialized = result === "true" || result === true;
      return this._initialized;
    },

    terminate: function () {
      if (!api) return true;
      var result = api.Terminate ? api.Terminate("") : (api.LMSFinish ? api.LMSFinish("") : "true");
      this._initialized = false;
      return result === "true" || result === true;
    },

    getValue: function (key) {
      if (!api) return "";
      return api.GetValue ? api.GetValue(key) : (api.LMSGetValue ? api.LMSGetValue(key) : "");
    },

    setValue: function (key, value) {
      if (!api) return true;
      var result = api.SetValue ? api.SetValue(key, String(value)) : (api.LMSSetValue ? api.LMSSetValue(key, String(value)) : "true");
      return result === "true" || result === true;
    },

    commit: function () {
      if (!api) return true;
      var result = api.Commit ? api.Commit("") : (api.LMSCommit ? api.LMSCommit("") : "true");
      return result === "true" || result === true;
    },

    // ─── Convenience helpers ─────────────────────────────────────────────────

    setScore: function (raw, max, min) {
      this.setValue("cmi.score.raw", raw);
      this.setValue("cmi.score.max", max || 100);
      this.setValue("cmi.score.min", min || 0);
      var scaled = max ? (raw / max) : 0;
      this.setValue("cmi.score.scaled", scaled.toFixed(2));
    },

    setProgress: function (fraction) {
      // fraction 0..1
      this.setValue("cmi.progress_measure", fraction.toFixed(4));
    },

    setCompleted: function (passed) {
      this.setValue("cmi.completion_status", "completed");
      this.setValue("cmi.success_status", passed ? "passed" : "failed");
      this.commit();
    },

    setLocation: function (loc) {
      this.setValue("cmi.location", String(loc));
    },

    getLocation: function () {
      return this.getValue("cmi.location");
    },

    setSuspendData: function (data) {
      this.setValue("cmi.suspend_data", typeof data === "string" ? data : JSON.stringify(data));
    },

    getSuspendData: function () {
      var raw = this.getValue("cmi.suspend_data");
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return raw; }
    }
  };
})();
`;
}
