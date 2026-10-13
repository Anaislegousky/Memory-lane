// Configuration Vite standard pour TanStack Start, déployée sur Vercel via Nitro.
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  // En local, rend aussi les variables serveur de .env (sans préfixe VITE_) visibles
  // via process.env. Sur Vercel, elles viennent des réglages du projet.
  if (command === "serve") {
    for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
      process.env[key] ??= value;
    }
  }

  return {
    server: { host: "::", port: 8080 },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Empêche d'importer du code serveur (clés secrètes…) dans le navigateur.
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
        // src/server.ts enveloppe le serveur pour afficher une page d'erreur propre.
        server: { entry: "server" },
      }),
      // Nitro produit le serveur au format Vercel, avec les fonctions à Paris (cdg1).
      command === "build" &&
        nitro({
          preset: "vercel",
          vercel: {
            functions: { regions: ["cdg1"] },
            // Tâche planifiée Vercel : nettoyage des photos expirées chaque jour à 3 h 17 (UTC).
            config: {
              version: 3,
              crons: [{ path: "/api/public/hooks/cleanup-photos", schedule: "17 3 * * *" }],
            },
          },
        }),
      viteReact(),
    ],
  };
});
