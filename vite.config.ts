import * as vite         from "vite";
import * as vite_checker from "vite-plugin-checker";
import * as vite_solid   from "vite-plugin-solid";
import * as node_process from "node:process";

const HOST = node_process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default vite.defineConfig((): vite.UserConfig => ({
    plugins:     [
        vite_solid.default(),
        vite_checker.checker({
            typescript: true,
            overlay: { initialIsOpen: true },
        }),
    ],
    publicDir:   "static",
    clearScreen: false,
    server: {
        port:       1420,
        strictPort: true,
        host:       HOST || "127.0.0.1",
        hmr:        HOST
            ? {
                  protocol: "ws",
                  host:     HOST,
                  port:     1421,
              }
            : undefined,
        watch: {
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
    build: {
        outDir: "builds/web",
    },

    // Makes the production build use relative asset paths.
    base: "./",
}));
