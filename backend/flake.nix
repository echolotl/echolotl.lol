{
  description = "Development shell for backend.echolotl.lol";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self , nixpkgs ,... }: let
    system = "x86_64-linux";
  in {
    devShells."${system}".default = let
      pkgs = import nixpkgs { inherit system; };
    in pkgs.mkShell {
      packages = with pkgs; [
        nodejs
        bun
      ];

      shellHook = ''
        echo BACKEND.ECHOLOTL.LOL shell
        echo "Node: `node --version`"
        echo "Bun:  `bun -v`"
        bun i --silent
      '';
    };
  };
}