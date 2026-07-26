# Viset for Visual Studio Code

Syntax highlighting for [Viset](https://github.com/getviset/Viset) capture files in Microsoft
Visual Studio Code 1.130 or newer. The extension keeps files in the normal Lua language mode and
adds colourization for:

- an entire marker-bearing line comment, or marker-forward block-comment content, as TOML; and
- ordinary or long-string arguments supplied directly to `viset.javascript`, as JavaScript.

This is a declarative, no-code extension. It does not execute Viset or captures, validate TOML or
JavaScript, provide completion or diagnostics, or create projected documents. The bundled private
`source.toml.viset` grammar is an original colourizer authored to the claimed constructs from the
[TOML 1.0 specification](https://toml.io/en/v1.0.0); it is not a TOML parser or conformance claim.

For a block marker on its opener line, TOML covers the whole content. Otherwise it starts at the
beginning of the marker-bearing line. A later-marker range ends at the first delimiter-shaped
`]=*]` lexical closer; like the direct-call patterns, this deliberately makes no AST-equivalence
claim for adversarial differently levelled delimiter-like content.

## Install

Install `getviset.viset` from the Visual Studio Marketplace, or install the release VSIX with
**Extensions: Install from VSIX...**.

## Development

The locked Nix environment pins Node tooling and the VS Code 1.130 host grammars used by the single
tokenizer contract:

```sh
nix develop --command npm ci --ignore-scripts
nix develop --command npm run check
```
