{
  description = "Development and checks for the Viset VS Code extension";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    vscode-src = {
      url = "github:microsoft/vscode/1.130.0";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, vscode-src }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ];
    in {
      devShells = forAllSystems (system:
        let pkgs = import nixpkgs { inherit system; };
        in {
          default = pkgs.mkShell {
            packages = [ pkgs.nodejs_22 pkgs.unzip ];
            VISET_VSCODE_SOURCE = vscode-src;
          };
        });

      checks = forAllSystems (system:
        let pkgs = import nixpkgs { inherit system; };
        in {
          default = pkgs.buildNpmPackage {
            pname = "viset-vscode-check";
            version = "0.1.0";
            src = self;
            npmDepsHash = "sha256-/Dnc2VUio2wmznf6fg6F7Gf75Im7Nud0wES4MjLCY1U=";
            npmRebuildFlags = [ "--ignore-scripts" ];
            dontNpmBuild = true;
            doCheck = true;
            nativeCheckInputs = [ pkgs.unzip ];
            VISET_VSCODE_SOURCE = vscode-src;
            checkPhase = ''
              runHook preCheck
              npm run check
              unzip -t dist/getviset.viset-0.1.0.vsix
              runHook postCheck
            '';
            installPhase = "touch $out";
          };
        });
    };
}
