// Shared build metadata for the title badge and Help > About.
// The image's Docker tag is not available to the browser; version.json must
// contain the version baked into the image at build time.
(function (global) {
  "use strict";

  let pendingBuildInfo = null;
  const releaseVersionPattern = /^v?[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

  function normalize(raw) {
    const data = raw && typeof raw === "object" ? raw : {};
    return {
      version: typeof data.version === "string" ? data.version.trim() : "",
      sha: typeof data.sha === "string" ? data.sha.trim() : "",
      buildDate: typeof data.buildDate === "string" ? data.buildDate.trim() : ""
    };
  }

  function badgeText(raw) {
    const info = normalize(raw);
    if (releaseVersionPattern.test(info.version)) return "v" + info.version.replace(/^v/, "");
    if (info.version && info.version !== "dev" && info.version !== "unknown") return info.version;
    if (info.sha && info.sha !== "unknown") return "dev-" + info.sha.slice(0, 7);
    return "dev";
  }

  function aboutText(raw) {
    const info = normalize(raw);
    const label = badgeText(info);
    const release = releaseVersionPattern.test(info.version);
    const parts = [release ? "Version " + label : "Build " + label + " (no release version embedded)"];
    if (info.sha && info.sha !== "unknown") parts.push("commit " + info.sha.slice(0, 7));
    if (info.buildDate && info.buildDate !== "unknown") parts.push("built " + info.buildDate);
    return parts.join(" · ");
  }

  function versionUrl(raw) {
    const info = normalize(raw);
    const base = "https://github.com/dwightmulcahy/TapListBuilder";
    if (releaseVersionPattern.test(info.version)) {
      return base + "/releases/tag/v" + info.version.replace(/^v/, "").split("+")[0];
    }
    if (/^[0-9a-f]{7,40}$/i.test(info.sha)) return base + "/commit/" + info.sha;
    return base + "/releases";
  }

  function load() {
    if (!pendingBuildInfo) {
      pendingBuildInfo = global.fetch("version.json", {cache: "no-store"})
        .then(response => {
          if (!response.ok) throw new Error("Could not load version.json (" + response.status + ")");
          return response.json();
        })
        .then(normalize)
        .catch(error => {
          pendingBuildInfo = null; // allow retry from Help > About
          throw error;
        });
    }
    return pendingBuildInfo;
  }

  async function updateBadge() {
    const badge = global.document.getElementById("appVersionBadge");
    if (!badge) return;
    try {
      const info = await load();
      badge.textContent = badgeText(info);
      badge.title = aboutText(info);
      badge.href = versionUrl(info);
      badge.hidden = false;
    } catch (error) {
      badge.hidden = true;
    }
  }


  // Detect a replaced container without silently discarding an in-progress menu.
  // The user chooses when to refresh; browser autosave can then restore the draft.
  function buildIdentity(info) {
    return info.sha && info.sha !== "unknown"
      ? "sha:" + info.sha
      : "version:" + info.version + "|date:" + info.buildDate;
  }

  function showUpdateNotice() {
    const doc = global.document;
    if (!doc || !doc.body || doc.getElementById("deploymentUpdateNotice")) return;
    const notice = doc.createElement("div");
    notice.id = "deploymentUpdateNotice";
    notice.setAttribute("role", "status");
    notice.style.cssText = "position:fixed;z-index:2147483647;left:16px;right:16px;bottom:16px;padding:12px 16px;background:#173b2e;color:white;border:2px solid #e8d7a0;border-radius:8px;box-shadow:0 3px 16px #0006;font:16px system-ui,sans-serif;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap";
    const message = doc.createElement("span");
    message.textContent = "A new Tap List Builder version is available. Save/export your work before refreshing.";
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = "Refresh to update";
    button.style.cssText = "padding:8px 12px;cursor:pointer";
    button.addEventListener("click", () => global.location.reload());
    notice.append(message, button);
    doc.body.appendChild(notice);
  }

  async function checkForUpdate() {
    try {
      const initial = await load();
      const response = await global.fetch("version.json", {cache: "no-store"});
      if (!response.ok) return false;
      const current = normalize(await response.json());
      if (buildIdentity(initial) !== buildIdentity(current)) {
        showUpdateNotice();
        return true;
      }
    } catch (_) {
      // Offline or transient network errors must not interrupt editing.
    }
    return false;
  }

  function startUpdateMonitor() {
    if (!global.setInterval || !global.document) return;
    global.setInterval(() => {
      if (!global.document.hidden) void checkForUpdate();
    }, 60000);
    if (global.document.addEventListener) {
      global.document.addEventListener("visibilitychange", () => {
        if (!global.document.hidden) void checkForUpdate();
      });
    }
  }

  global.TapListBuildInfo = {normalize, badgeText, aboutText, versionUrl, load, updateBadge, checkForUpdate, startUpdateMonitor};
})(window);
