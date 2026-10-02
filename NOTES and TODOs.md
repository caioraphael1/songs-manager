
## TODOs

- QoL:
    - [ ] ! Message warning if the link is broken, somehow.
    - [ ] ! Mouse release on song edit annoyance.
- Utility:
    - [ ] Button to copy to clipboard, getting all links separated by spaces.
    - [ ] Button to copy 'md formatted (`[]()`)' to clipboard, getting all links separated by spaces.
    - [ ] ! Get random playlist with up to 50 songs.
    - [ ] Button to export as HTML.
    - [ ] "Jungle amigável" as a saved query?
- Tags Tab:
    - [ ] Instead of showing the tags in the 'Songs Tab' separated by comma, replace it by a 'card'/'ballon'/idk, just like inside the `Song_Edit_Dialog`.
- Expansion:
    - [ ] Tabs for Movies, Books, Mangá, Anime, Series, Videos.
- Home screen:
    - [ ] There's a "home screen" with just the option to create a new db or open an existing one.
    - [ ] Button to 'close' the db and go back to the home screen.
- Etc:
    - [ ] 'Songs Tab' load times are a bit annoying.
    - [ ] Third tab with logs from all SQL commands that ran.



## Design prototypes

- Advanced queries: 
    - `( ) AND OR NOT`
    - [Done in Notion](https://developers.notion.com/reference/post-database-query)
    ```txt
    Distópico
    AND
    Emocionais
    AND
    (
    NOT
    Dark
    )
    OR
    [+ Token][+ Tag]
    ---
    Distópico AND Emocionais AND (NOT Dark) OR 
    ```



## Decision

1. ! 'TS + Solid + Tauri + Bun'.
    - *Web*:
        - It's native for the web.
    - *Mobile*:
        - Cool.
    - *Performance*:
        - [ ] ! Songs tab load times are problematic (under investigation).
        - High RAM usage, and there's nothing I could do about it.
    - *Annoyances*:
        - Rust.
        - The project storage is gigantic. 
    - Me desafia, em vez de Python bunda mole.
2. ~~'Python + CustomTkinter'~~.
    - *Web*:
        - Cannot deploy to the web.
    - *Mobile*:
        - Poor starting point for a mobile app. Much harder to deploy than 'TS + Solid + Tauri + Bun'.
    - *Performance*:
        - It's still Python... but it was surprisingly better than 'TS + Solid + Tauri + Bun'.
3. ~~'TS + Svelte + Tauri + Bun'~~.
    - I didn't like Svelte.



## Comparisons

##### Performance Comparisons
- When comparing to 'Solid + Tauri + Bun', the python build seems FASTER, which is insane.
    - The 'Solid + Tauri + Bun' has a noticible delay when clicking the Songs tab, compared to Python which is pretty fast.
    - *Reason*:
        - 'Python + CustomTkinter'
            ```txt
            SQLite
            ↓
            Python
            ↓
            native Tk widgets
            ```
        - 'TS + Solid + Tauri + Bun'
            ```txt
            SQLite
            ↓
            Rust
            ↓
            serialize 2,500 rows
            ↓
            IPC
            ↓
            JavaScript
            ↓
            create 2,500 objects
            ↓
            React/Vue/Svelte/etc.
            ↓
            create 2,500 DOM nodes
            ↓
            layout
            ↓
            paint
            ```
            - "This could be improved via virtualization. Maybe this version is rendering all DOM elements, instead of only rendering the ones on the screen".


### TS + Solid + Tauri + Bun

- **Bun**:
    - It's used just as a 'script runner' + 'replacement for npm/pnpm' (for package management/scripts).
    - It's not used as a 'JS/TS runtime' or as 'tooling/runtime API'.

#### Project

- Better then Svelte's.
- Gigantic file structure.
- Folder uncompiled with ~706kb (what you would push to remote).
- Folder compiled with 1.6GB (node_modules + all Rust's mess).

##### Output
- `build/`
    - The HTML + JS + CSS files, to open in the browser.
    - They are generated via `bun run build`.
    - To actually open the `index.html` and not get a blank page:
        1. Run `bunx serve build`.
        2. Or make a bun server:
            ```ts
            Bun.serve({
                port: 8080,
                routes: {
                    "/*": async () => {
                        return new Response("...");
                    }
                }
            })
            ```
        3. Or make the Vite build work with `file://`
            - In `vite.config.ts`:
                ```ts
                import { defineConfig } from "vite";
                import solid from "vite-plugin-solid";

                export default defineConfig({
                    plugins: [solid()],
                    base: "./",
                });
                ```
            - (2026-09-29)
                - It didn't work for me, I was still getting a blank page when clicking on the `index.html`.
- `src-tauri/target/release/my_app.exe`
    - The actual final executable.
- `src-tauri/target/release/bundle/msi/` or `src-tauri/target/release/bundle/nsis/`
    - An "installer" to the app, which is absurd.

##### Configuration
- `src-tauri/capabilities/.json`
    - Tauri-specific files, related to Tauri's permissions/capabilities system.
    - These define what your frontend is allowed to do through Tauri.
    - For example, a capability might say that your application can use certain filesystem APIs, dialogs, windows, etc.
    - The programmer configures these. They are not automatically generated.
    - Should be commited to Git.
- `src-tauri/tauri.conf.json`
    - The configuration file that tells Tauri how to turn your web frontend + Rust backend into a desktop application.
    - `build`: how Tauri gets your frontend.
    - `app`: what the desktop application is.
    - `bundle`: how Tauri packages the application
    - Should be commited to Git.
- `vite.config.ts`
    - Source/configuration for your build system.
    - Control things like:
        ```txt
        vite.config.ts
        │
        ├── Solid plugin
        ├── path aliases ($lib, @)
        ├── development server
        │     └── port 1420
        ├── HMR
        ├── frontend output directory
        │     └── build/
        └── asset base path
        ```
    - Should be commited to Git.
- `tsconfig.json`
    - It tells TypeScript how to understand and type-check your code.
    - Should be commited to Git.

##### Configuration: Dependencies
- `package.json`
    - What JS/Bun dependencies you want.
    - Should be commited to Git.
- `src-tauri/Cargo.toml`
    - What Rust dependencies you want.
    - Does not necessarily specify the exact versions of all transitive dependencies. It just roughly means "I need Serde 1.x and Tauri 2.x.".
    - Should be commited to Git.

##### Auto-generated
- `src-tauri/gen/schemas/` 
    - These are generated schemas used by Tauri tooling.
    - They're generally not files you should manually edit.
    - They describe things such as:
        - Tauri configuration
        - permissions
        - commands/API schemas
        - capabilities
        - plugin configuration
    - The `gen` directory is essentially generated metadata for Tauri's tooling.
    - The generation occurs when running X command from the `tauri` CLI, usually during build.
    - Should not be commited to Git.

##### Auto-generated from Dependencies
- `bun.lock`
    - Exact JS/Bun dependency versions resolved by Bun.
    - Automatically generated. It is not intended for manual editing.
    - Usually commited to Git, as it makes builds reproducible.
- `src-tauri/Cargo.lock`
    - Exact Rust dependency versions resolved by Cargo.
    - Automatically generated by Cargo. It is not intended for manual editing.
    - Usually commited to Git, as it makes builds reproducible.
- `node_modules`
    - The JS libs.
    - Should NOT be commited to Git.


#### Build

- Terrible compile times.
- Final exe: 5.78mb.
- 180-210mb of RAM usage after opening the DB.
    - This is because Tauri's UI is fundamentally a web application running inside a native webview.
    - There was an instance where the RAM dropped to 13mb after some 10 minutes of the app open; I have no idea why.

##### For mobile
- Tauri:
    - Tauri 2 officially supports both Android and iOS, and the frontend can largely remain shared.
    - Tauri specifically designed its plugin system so that a plugin can have shared Rust code plus platform-specific Kotlin/Swift implementations.
- Bun:
    - Bun as build tooling → fine.
    - Bun as an embedded runtime inside the mobile app → likely a problem.
- TS/Solid:
    - Probably just some UI adjustments for the front-end.
    - The rest is ok.


### Python + CustomTkinter

- Cannot be deployed to the web directly.

#### Project

- One single file, 1300 loc.
- Folder before compiling with 45kb.
- Folder after  compiling with 26.45mb.
- 33.4mb of RAM usage after opening the DB.


#### Build
    
- I was complaining about python's compilation time, until I used 'Solid + Tauri + Bun' or 'Svelte + Tauri + Bun'; python is a breeze compared to them.
- Final exe: 26.0mb


### TS + Svelte + Tauri + Bun

- **Bun**:
    - It's used just as a 'script runner' + 'replacement for npm/pnpm' (for package management/scripts).
    - It's not used as a 'JS/TS runtime' or as 'tooling/runtime API'.

#### Project

- Nightmare.
- Gigantic file structure.
- Folder uncompiled with 706kb (what you would push to remote).


#### Build

- Terrible compile times.
