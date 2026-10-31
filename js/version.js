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
      badge.hidden = false;
    } catch (error) {
      badge.hidden = true;
    }
  }

  global.TapListBuildInfo = {normalize, badgeText, aboutText, load, updateBadge};
})(window);
