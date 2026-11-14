const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/version.js"), "utf8");

function createVersionClient(fetchImpl) {
  const badge = {textContent: "", title: "", href: "", hidden: true};
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

test("clickable version links to its exact release tag", async () => {
  const {client, badge} = createVersionClient();
  await client.updateBadge();
  assert.equal(badge.href, "https://github.com/dwightmulcahy/TapListBuilder/releases/tag/v1.2.3");
  assert.equal(client.versionUrl({version: "v2.0.1"}), "https://github.com/dwightmulcahy/TapListBuilder/releases/tag/v2.0.1");
  assert.equal(client.versionUrl({version: "1.2.3+build.4"}), "https://github.com/dwightmulcahy/TapListBuilder/releases/tag/v1.2.3");
});

test("development builds link to their commit, with a safe fallback", async () => {
  const {client, badge} = createVersionClient(async () => ({
    ok: true,
    json: async () => ({version: "dev", sha: "abcdef0123456789"})
  }));
  await client.updateBadge();
  assert.equal(badge.href, "https://github.com/dwightmulcahy/TapListBuilder/commit/abcdef0123456789");
  assert.equal(badge.textContent, "dev-abcdef0");
  assert.equal(client.versionUrl({version: "dev", sha: "unknown"}), "https://github.com/dwightmulcahy/TapListBuilder/releases");
});


test("deployment monitor checks fresh metadata and never forces an automatic reload", async () => {
  const initial = {version: "1.0.0", sha: "aaa111", buildDate: "today"};
  const updated = {version: "1.0.1", sha: "bbb222", buildDate: "tomorrow"};
  let deployed = initial;
  let reloads = 0;
  const nodes = [];
  const body = {appendChild: node => nodes.push(node)};
  const document = {
    body,
    hidden: false,
    getElementById: id => id === "deploymentUpdateNotice" ? nodes.find(node => node.id === id) : null,
    createElement: () => ({
      style: {},
      children: [],
      setAttribute() {},
      addEventListener(type, callback) { this.callback = callback; },
      append(...children) { this.children.push(...children); }
    }),
    addEventListener() {}
  };
  const window = {
    document,
    location: {reload: () => { reloads++; }},
    fetch: async (_url, options) => {
      assert.equal(options.cache, "no-store");
      return {ok: true, json: async () => deployed};
    }
  };
  vm.runInNewContext(source, {window}, {filename: "js/version.js"});
  const client = window.TapListBuildInfo;
  await client.load();
  assert.equal(await client.checkForUpdate(), false);
  deployed = updated;
  assert.equal(await client.checkForUpdate(), true);
  assert.equal(await client.checkForUpdate(), true);
  assert.equal(nodes.length, 1, "only one notice is shown");
  assert.equal(reloads, 0, "an update must never discard unsaved edits automatically");
  nodes[0].children[1].callback();
  assert.equal(reloads, 1, "reload only after the user clicks Refresh");
});

test("deployment monitor ignores offline failures", async () => {
  let calls = 0;
  const {client} = createVersionClient(async () => {
    calls++;
    if (calls > 1) throw new Error("offline");
    return {ok: true, json: async () => ({version: "1.0.0", sha: "aaa"})};
  });
  await client.load();
  assert.equal(await client.checkForUpdate(), false);
});
