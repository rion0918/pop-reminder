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
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            pnpm
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
