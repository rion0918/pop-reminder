{
  description = "pop-reminder – Expo / React Native 開発環境";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodeVersion = pkgs.lib.trim (builtins.readFile ./.node-version);
        # Use the official security release until nixpkgs ships the patched runtime.
        nodeArchives = {
          aarch64-darwin = { platform = "darwin-arm64"; sha256 = "89c682593d76cd44233fa53b1563264e7de9cbb189cad169135c5b4fadfbc0a7"; };
          x86_64-darwin = { platform = "darwin-x64"; sha256 = "d132557e7ee2b85af08b0c8c34338e65c6430f2238d01f727728ef42dc83b035"; };
          aarch64-linux = { platform = "linux-arm64"; sha256 = "33c37be234ba8bee041961047b19160f4d7d0f164e8e246f78bdd10feff148b3"; };
          x86_64-linux = { platform = "linux-x64"; sha256 = "eb6728e77c576a35162c122c45ccadf224d89ff00abc8dae46cc2897c6002d7c"; };
        };
        nodeArchive = nodeArchives.${system};
        nodejs = pkgs.stdenvNoCC.mkDerivation {
          pname = "nodejs";
          version = nodeVersion;
          src = pkgs.fetchurl {
            url = "https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-${nodeArchive.platform}.tar.gz";
            inherit (nodeArchive) sha256;
          };
          nativeBuildInputs = pkgs.lib.optionals pkgs.stdenv.isLinux [ pkgs.autoPatchelfHook ];
          buildInputs = pkgs.lib.optionals pkgs.stdenv.isLinux [ pkgs.stdenv.cc.cc.lib ];
          dontConfigure = true;
          dontBuild = true;
          dontStrip = true;
          installPhase = ''
            runHook preInstall
            mkdir -p "$out"
            cp -R . "$out/"
            runHook postInstall
          '';
        };
        mkDevShell = if pkgs.stdenv.isDarwin then pkgs.mkShellNoCC else pkgs.mkShell;
      in
      {
        devShells.default = mkDevShell {
          packages = with pkgs; [
            nodejs
            (pnpm.override { nodejs-slim = nodejs; })
            openjdk17
          ];

          shellHook = ''
            export JAVA_HOME=${pkgs.openjdk17}
            export ANDROID_HOME=$HOME/Library/Android/sdk
            export PATH=$PATH:$ANDROID_HOME/emulator
            export PATH=$PATH:$ANDROID_HOME/platform-tools
            echo "🫧 pop-reminder dev shell (Node $(node --version), pnpm $(pnpm --version))"
          '';
        };
      }
    );
}
