{
  description = "Alea Imperii development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in {
      packages = forEachSystem (system:
        let pkgs = import nixpkgs { inherit system; }; in {
          default = pkgs.buildNpmPackage {
            pname = "alea-imperii";
            version = "0.1.0";
            src = ./.;
            npmDepsHash = "sha256-bD6h4FBGA7RQfMPsWjb/NZAFgUw2mMTqQxtwMOJqaHQ=";
            # if it's a pure frontend with no install script:
            # installPhase = ''cp -r dist $out'';
          };
        });

devShells = forEachSystem (system:
  let pkgs = import nixpkgs { inherit system; }; in {
    default = self.packages.${system}.default.overrideAttrs (old: {
      shellHook = ''
        if [ ! -f node_modules/.package-lock.json ] || \
           [ package-lock.json -nt node_modules/.package-lock.json ]; then
          echo "Syncing node_modules..."
          npm install
        fi

        echo ""
        echo "========================================================="
        echo "👑 Alea Imperii Development Environment Ready! 👑"
        echo "========================================================="
        echo "Available commands:"
        echo "  • Run dev server:          npm run dev"
        echo "  • Run unit tests:          npm run test"
        echo "  • Build app (with Vite):   npm run build"
        echo "  • Build with Nix:          nix build"
        echo "  • Update Nix dependencies: nix flake update"
        echo "  • Update npm packages:     npm update"
        echo "========================================================="
        echo ""
      '';
    });
  });
    };
}