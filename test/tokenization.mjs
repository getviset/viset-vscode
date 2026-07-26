import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import oniguruma from "vscode-oniguruma";
import textmate from "vscode-textmate";

const { loadWASM, OnigScanner, OnigString } = oniguruma;
const { INITIAL, Registry, parseRawGrammar } = textmate;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vscodeSource = process.env.VISET_VSCODE_SOURCE;
assert.ok(vscodeSource, "VISET_VSCODE_SOURCE must point to the pinned VS Code source");

const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const tomlDefinition = JSON.parse(
  await readFile(path.join(root, "syntaxes/toml-viset.tmLanguage.json"), "utf8"),
);
assert.equal(manifest.publisher, "getviset");
assert.equal(manifest.name, "viset");
assert.equal(manifest.version, "0.1.0");
assert.equal(manifest.engines.vscode, "^1.130.0");
assert.equal(manifest.main, undefined);
assert.equal(manifest.browser, undefined);
assert.equal(manifest.dependencies, undefined);
assert.equal(manifest.contributes.languages, undefined);
assert.equal(tomlDefinition.scopeName, "source.toml.viset");

const injectionContribution = manifest.contributes.grammars.find(
  ({ scopeName }) => scopeName === "viset.injection.lua",
);
assert.deepEqual(injectionContribution.injectTo, ["source.lua"]);
for (const scope of [
  "meta.embedded.line.toml.viset",
  "meta.embedded.block.toml.viset",
  "meta.embedded.inline.javascript.viset",
]) {
  assert.equal(injectionContribution.tokenTypes[scope], "other");
}
assert.equal(
  injectionContribution.embeddedLanguages["meta.embedded.line.toml.viset"],
  "toml",
);
assert.equal(
  injectionContribution.embeddedLanguages["meta.embedded.block.toml.viset"],
  "toml",
);
assert.equal(
  injectionContribution.embeddedLanguages["meta.embedded.inline.javascript.viset"],
  "javascript",
);
const markerForwardContribution = manifest.contributes.grammars.find(
  ({ scopeName }) => scopeName === "viset.injection.lua.block-marker",
);
assert.equal(
  markerForwardContribution.embeddedLanguages["meta.embedded.block.toml.viset"],
  "toml",
);
assert.equal(
  markerForwardContribution.tokenTypes["meta.embedded.block.toml.viset"],
  "other",
);

const wasm = await readFile(
  path.join(root, "node_modules/vscode-oniguruma/release/onig.wasm"),
);
await loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));

const grammarPaths = new Map([
  [
    "source.lua",
    path.join(vscodeSource, "extensions/lua/syntaxes/lua.tmLanguage.json"),
  ],
  [
    "source.js",
    path.join(vscodeSource, "extensions/javascript/syntaxes/JavaScript.tmLanguage.json"),
  ],
  [
    "viset.injection.lua",
    path.join(root, "syntaxes/viset-injection.tmLanguage.json"),
  ],
  [
    "viset.injection.lua.block-marker",
    path.join(root, "syntaxes/viset-block-marker-injection.tmLanguage.json"),
  ],
  [
    "source.toml.viset",
    path.join(root, "syntaxes/toml-viset.tmLanguage.json"),
  ],
]);

const registry = new Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (sources) => new OnigScanner(sources),
    createOnigString: (text) => new OnigString(text),
  }),
  getInjections: (scopeName) =>
    scopeName === "source.lua"
      ? ["viset.injection.lua", "viset.injection.lua.block-marker"]
      : [],
  loadGrammar: async (scopeName) => {
    const grammarPath = grammarPaths.get(scopeName);
    if (!grammarPath) return null;
    return parseRawGrammar(await readFile(grammarPath, "utf8"), grammarPath);
  },
});

const grammar = await registry.loadGrammar("source.lua");
assert.ok(grammar, "VS Code 1.130 Lua grammar must load");
const fixture = await readFile(path.join(root, "test/fixtures/capture.lua"), "utf8");
const lines = fixture.split(/\r?\n/);
const tokenLines = [];
let ruleStack = INITIAL;
for (const line of lines) {
  const result = grammar.tokenizeLine(line, ruleStack);
  tokenLines.push(result.tokens);
  ruleStack = result.ruleStack;
}

function scopesAt(lineFragment, needle = lineFragment) {
  const lineIndex = lines.findIndex((line) => line.includes(lineFragment));
  assert.notEqual(lineIndex, -1, `fixture line not found: ${lineFragment}`);
  const column = lines[lineIndex].indexOf(needle);
  assert.notEqual(column, -1, `fixture token not found: ${needle}`);
  const token = tokenLines[lineIndex].find(
    ({ startIndex, endIndex }) => startIndex <= column && column < endIndex,
  );
  assert.ok(token, `token not found at ${lineIndex + 1}:${column + 1}`);
  return token.scopes;
}

function includesScope(lineFragment, needle, scope) {
  const scopes = scopesAt(lineFragment, needle);
  assert.ok(
    scopes.includes(scope),
    `${JSON.stringify(needle)} expected ${scope}; got ${scopes.join(" ")}`,
  );
}

function excludesScopePrefix(lineFragment, needle, prefix) {
  const scopes = scopesAt(lineFragment, needle);
  assert.ok(
    scopes.every((scope) => !scope.startsWith(prefix)),
    `${JSON.stringify(needle)} unexpectedly had ${prefix}; got ${scopes.join(" ")}`,
  );
}

// Original private TOML grammar: every construct claimed by the package.
includesScope("# viset", "#", "comment.line.number-sign.toml");
includesScope("bare_key = 42", "bare_key", "variable.other.key.bare.toml");
includesScope('"quoted key" =', "quoted key", "string.quoted.double.key.toml");
includesScope("dotted.key = true", "dotted", "variable.other.key.bare.toml");
includesScope("dotted.key = true", ".", "punctuation.accessor.dot.toml");
includesScope('basic_string = "basic"', "basic\"", "string.quoted.double.basic.toml");
includesScope("literal_string = 'literal'", "literal'", "string.quoted.single.literal.toml");
includesScope("basic line", "basic line", "string.quoted.triple.double.basic.toml");
includesScope("literal line", "literal line", "string.quoted.triple.single.literal.toml");
includesScope("integer_value = 123", "123", "constant.numeric.integer.toml");
includesScope("float_value = 3.14", "3.14", "constant.numeric.float.toml");
includesScope("boolean_value = false", "false", "constant.language.boolean.toml");
includesScope("array_value = [1, 2, 3]", "[", "punctuation.definition.array.begin.toml");
includesScope("inline_table = {", "{", "punctuation.definition.inline-table.begin.toml");
includesScope("[standard.table]", "standard", "meta.table.standard.toml");
includesScope("[[array.table]]", "array", "meta.table.array.toml");

// Exact marker breadth: content before a marker is embedded for line and block comments.
includesScope("prefix_key = true # viset", "prefix_key", "meta.embedded.line.toml.viset");
includesScope("block_prefix = true # viset", "block_prefix", "meta.embedded.block.toml.viset");
includesScope("block_value = 2", "block_value", "meta.embedded.block.toml.viset");
excludesScopePrefix(
  "earlier_block_content =",
  "earlier_block_content",
  "meta.embedded.block.toml.viset",
);
includesScope("later_marker = true # viset", "later_marker", "meta.embedded.block.toml.viset");
includesScope(
  "marker_forward_value = 3",
  "marker_forward_value",
  "meta.embedded.block.toml.viset",
);

// Conservative direct-call JavaScript forms: long/ordinary and optional parentheses.
includesScope("document.readyState === \"complete\"", "document", "meta.embedded.inline.javascript.viset");
includesScope("const parenthesizedLong", "parenthesizedLong", "meta.embedded.inline.javascript.viset");
includesScope("const parenthesizedLong", "const", "storage.type.js");
includesScope("viset.javascript(\"document.readyState", "document", "meta.embedded.inline.javascript.viset");
includesScope("const ordinaryDirect", "ordinaryDirect", "meta.embedded.inline.javascript.viset");

// Negative marker and call cases retain ordinary Lua tokenization.
excludesScopePrefix("# viset in a Lua string", "# viset", "meta.embedded.");
excludesScopePrefix("-- marker-free comment", "marker-free", "meta.embedded.");
excludesScopePrefix("marker_free_block = true", "marker_free_block", "meta.embedded.");
for (const payload of [
  "aliasPayload",
  "computedPayload",
  "variablePayload",
  "unrelatedPayload",
]) {
  excludesScopePrefix(payload, payload, "meta.embedded.inline.javascript.viset");
}
includesScope("local value = 1", "local", "keyword.local.lua");

console.log(`tokenization contract passed (${lines.length} fixture lines)`);
