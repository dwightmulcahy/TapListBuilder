const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/version.js"), "utf8");

function createVersionClient(fetchImpl) {
  const badge = {textContent: "", title: "", hidden: true};
  const window = {
    fetch: fetchImpl || (async () => ({
      ok: true,
      json: async () => ({version: "1.2.3", sha: "abcdef0123456789", buildDate: "2026-10-30T12:00:00Z"})
    })),
    document: {getElementById: id => id === "appVersionBadge" ? badge : null}
  };
  vm.runInNewContext(source, {window}, {filename: "js/version.js"});
  return {client: window.TapListBuildInfo, badge};
}

test("release metadata uses the same version in the title and About", () => {
  const {client} = createVersionClient();
  const build = {version: "1.2.3", sha: "abcdef0123456789", buildDate: "2026-10-30T12:00:00Z"};
  assert.equal(client.badgeText(build), "v1.2.3");
  assert.equal(client.aboutText(build), "Version v1.2.3 · commit abcdef0 · built 2026-10-30T12:00:00Z");
  assert.equal(client.badgeText({version: "v2.0.1"}), "v2.0.1");
});

test("missing release metadata does not falsely claim it was not built by Docker", () => {
  const {client} = createVersionClient();
  const about = client.aboutText({version: "dev", sha: "unknown", buildDate: "unknown"});
  assert.equal(client.badgeText({version: "dev", sha: "unknown"}), "dev");
  assert.match(about, /no release version embedded/);
  assert.doesNotMatch(about, /not built via the Docker release workflow/);
});

test("the header badge and About share one uncached metadata request", async () => {
  const requests = [];
  const {client, badge} = createVersionClient(async (url, options) => {
    requests.push({url, options});
    return {ok: true, json: async () => ({version: "3.4.5", sha: "0123456789abcdef"})};
  });
  await Promise.all([client.load(), client.updateBadge(), client.load()]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "version.json");
  assert.equal(requests[0].options.cache, "no-store");
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, "v3.4.5");
  assert.match(badge.title, /Version v3\.4\.5/);
});

test("a failed metadata request can be retried", async () => {
  let attempts = 0;
  const {client} = createVersionClient(async () => {
    attempts++;
    if (attempts === 1) throw new Error("network");
    return {ok: true, json: async () => ({version: "4.0.0"})};
  });
  await assert.rejects(client.load(), /network/);
  assert.equal((await client.load()).version, "4.0.0");
  assert.equal(attempts, 2);
});
