import * as solid            from "solid-js";
import * as solid_web        from "solid-js/web";
import * as types            from "./types";
import * as search           from "./search_parser";
import * as api              from "./api";

import * as songs_tab        from "./songs_tab";
import * as tags_tab         from "./tags_tab";
import * as song_edit_dialog from "./song_edit_dialog";
import * as tag_new_dialog   from "./tag_new_dialog";
import * as tag_edit_dialog  from "./tag_edit_dialog";
import * as msg_dialog       from "./msg_dialog";

// Includes
import "./app.css";


const root = document.getElementById("root");

if (root) {
    solid_web.render(() => {
        // State
        const [active_tab, active_tab_set]                           = solid.createSignal<"songs" | "tags">("songs");
        const [db_path, db_path_set]                                 = solid.createSignal<string>("");
        const [songs, songs_set]                                     = solid.createSignal<types.Song[]>([]);
        const [total_songs_count, total_songs_count_set]             = solid.createSignal<number>(0);
        const [tags, set_tags]                                       = solid.createSignal<types.Tag[]>([]);
        const [search_query, search_query_set]                       = solid.createSignal<string>("");

        // Dialog state
        const [is_new_song_dialog_open, is_new_song_dialog_open_set] = solid.createSignal(false);
        const [editing_song, editing_song_set]                       = solid.createSignal<types.Song | null>(null);
        const [is_new_tag_dialog_open, is_new_tag_dialog_open_set]   = solid.createSignal(false);
        const [editing_tag, editing_tag_set]                         = solid.createSignal<types.Tag | null>(null);

        // Msg Dialog state
        const [msg_dialog_state, msg_dialog_state_set] = solid.createSignal<{
            open:        boolean;
            title:       string;
            message:     string;
            confirm?:    boolean;
            danger?:     boolean;
            on_confirm?: () => void;
            }>({
            open:        false,
            title:       "",
            message:     "",
        });

        function msg_show(title: string, message: string) {
            msg_dialog_state_set({
                open:       true,
                title:      title,
                message:    message,
                confirm:    false,
                on_confirm: () => {
                    msg_dialog_state_set((prev) => ({ ...prev, open: false }));
                },
            });
        }

        function confirm_show(
            title:      string,
            message:    string,
            danger:     boolean,
            on_confirm: () => void,
            ) {
            msg_dialog_state_set({
                open:    true,
                title:   title,
                message: message,
                confirm: true,
                danger:  danger,
                on_confirm: () => {
                    msg_dialog_state_set((prev) => ({ ...prev, open: false }));
                    on_confirm();
                },
            });
        }

        // Loaders
        async function songs_reload(custom_query?: string) {
            if (!db_path()) return;
            try {
                const q = custom_query !== undefined ? custom_query : search_query();
                const filter = search.parse_search(q);
                const res = await api.query_songs(filter);
                songs_set(res.songs);
                total_songs_count_set(res.total_count);
            } catch (err: unknown) {
                console.error("Failed loading songs:", err);
            }
        }

        async function tags_reload() {
            if (!db_path()) return;
            try {
                const queried = await api.tags_query();
                set_tags(queried);
            } catch (err: unknown) {
                console.error("Failed loading the tags:", err);
            }
        }

        async function reload_all() {
            await Promise.all([songs_reload(), tags_reload()]);
        }

        async function db_connect(target_path: string) {
            try {
                const opened = await api.db_open(target_path);
                db_path_set(opened);
                await reload_all();
            } catch (err: unknown) {
                msg_show("Error", `Failed opening the database:\n${err}`);
            }
        }

        async function handle_open_database_dialog() {
            const picked = await api.pick_db_file();
            if (picked) {
                await db_connect(picked);
            }
        }

        function handle_search_change(query: string) {
            search_query_set(query);
            songs_reload(query);
        }

        // types.Song handlers
        async function handle_save_new_song(
            name:      string,
            link:      string | null,
            song_tags: string[],
            ) {
            try {
                await api.song_create(name, link, song_tags);
                is_new_song_dialog_open_set(false);
                search_query_set("");
                await reload_all();
            } catch (err: unknown) {
                msg_show("Already exists", `${err}`);
            }
        }

        async function song_update(
            name:      string,
            link:      string | null,
            song_tags: string[],
            ) {
            const current_song = editing_song();
            if (!current_song) 
                return;
            try {
                await api.song_update(current_song.id, name, link, song_tags);
                editing_song_set(null);
                await reload_all();
            } catch (err: unknown) {
                msg_show("Already exists", `${err}`);
            }
        }

        function handle_songs_delete(ids: number[]) {
            if (ids.length === 0) return;
            confirm_show(
                "Delete song(s)",
                `Delete ${ids.length} song(s)? This action cannot be undone.`,
                true,
                async () => {
                    try {
                        await api.songs_delete(ids);
                        await reload_all();
                    } catch (err: unknown) {
                        msg_show("Error", `Error when deleting a song:\n${err}`);
                    }
                },
            );
        }

        // types.Tag handlers
        async function handle_tags_create(names: string[]) {
            try {
                await api.tags_create(names);
                is_new_tag_dialog_open_set(false);
                await tags_reload();
            } catch (err: unknown) {
                msg_show("Error", `Error when creating tags:\n${err}`);
            }
        }

        async function handle_tag_update(newName: string) {
            const current_tag = editing_tag();
            if (!current_tag) return;
            try {
                await api.tag_update(current_tag.id, newName);
                editing_tag_set(null);
                await reload_all();
            } catch (err: unknown) {
                msg_show("Already exists", `${err}`);
            }
        }

        function handle_tags_delete(ids: number[]) {
            if (ids.length === 0) return;
            confirm_show(
                "Delete tag(s)",
                `Delete ${ids.length} tag(s) from the database? They will be removed from all songs.`,
                true,
                async () => {
                    try {
                        await api.tags_delete(ids);
                        await reload_all();
                    } catch (err: unknown) {
                        msg_show("Error", `Error when deleting the tags:\n${err}`);
                    }
                },
            );
        }

        solid.onMount(async () => {
            try {
                const default_path = await api.default_db_path_get();
                if (default_path) {
                    await db_connect(default_path);
                } else {
                    await handle_open_database_dialog();
                }
            } catch (err: unknown) {
                console.error("Failed initializing the database:", err);
            }
        });

        const available_tag_names = solid.createMemo(() => tags().map((t) => t.nome));

        return (
            <div class="app-layout">
                {/* Top Bar */}
                <header class="top-bar">
                    <div class="db-title-container">
                        <span class="db-title">
                            🎵 {db_path() || "Songs Manager - No database"}
                        </span>
                    </div>
                    <button
                        type    = "button"
                        class   = "btn btn-outline"
                        onClick = {handle_open_database_dialog}
                    >
                        Open database...
                    </button>
                </header>

                {/* Navigation Tabs Bar */}
                <nav class="tabs-bar">
                    <button
                        type      = "button"
                        class     = "tab-btn"
                        classList = {{ "tab-active": active_tab() === "songs" }}
                        onClick   = {() => active_tab_set("songs")}
                    >
                        Songs
                    </button>
                    <button
                        type      = "button"
                        class     = "tab-btn"
                        classList = {{ "tab-active": active_tab() === "tags" }}
                        onClick   = {() => active_tab_set("tags")}
                    >
                        Tags
                    </button>
                </nav>

                {/* Main View Area */}
                <main class="main-content">
                    <solid.Show
                        when={active_tab() === "songs"}
                        fallback={
                            <tags_tab.Tags_Tab
                                tags           = {tags()}
                                on_tag_new     = {() => is_new_tag_dialog_open_set(true)}
                                on_tag_edit    = {(tag) => editing_tag_set(tag)}
                                on_tags_delete = {handle_tags_delete}
                            />
                        }
                    >
                        <songs_tab.Songs_Tab
                            songs            = {songs()}
                            total_count      = {total_songs_count()}
                            search_query     = {search_query()}
                            on_search_change = {handle_search_change}
                            on_song_new      = {() => is_new_song_dialog_open_set(true)}
                            on_song_edit     = {(song) => editing_song_set(song)}
                            on_songs_delete  = {handle_songs_delete}
                        />
                    </solid.Show>
                </main>

                {/* Dialogs */}
                <solid.Show when={is_new_song_dialog_open()}>
                    <song_edit_dialog.Song_Edit_Dialog
                        title          = "New song"
                        available_tags = {available_tag_names()}
                        on_save        = {handle_save_new_song}
                        on_cancel      = {() => is_new_song_dialog_open_set(false)}
                    />
                </solid.Show>

                <solid.Show when={editing_song()}>
                    {(song) => (
                        <song_edit_dialog.Song_Edit_Dialog
                            title          = "Edit song"
                            initial_name   = {song().nome}
                            initial_link   = {song().link}
                            initial_tags   = {
                                song().tags
                                    ? song()
                                        .tags.split(",")
                                        .map((t) => t.trim())
                                    : []
                            }
                            available_tags = {available_tag_names()}
                            on_save        = {song_update}
                            on_cancel      = {() => editing_song_set(null)}
                        />
                    )}
                </solid.Show>

                <solid.Show when={is_new_tag_dialog_open()}>
                    <tag_new_dialog.Tag_New_Dialog
                        on_save   = {handle_tags_create}
                        on_cancel = {() => is_new_tag_dialog_open_set(false)}
                    />
                </solid.Show>

                <solid.Show when={editing_tag()}>
                    {(tag) => (
                        <tag_edit_dialog.Tag_Edit_Dialog
                            current_name = {tag().nome}
                            on_save      = {handle_tag_update}
                            on_cancel    = {() => editing_tag_set(null)}
                        />
                    )}
                </solid.Show>

                <solid.Show when={msg_dialog_state().open}>
                    <msg_dialog.Msg_Dialog
                        title      = {msg_dialog_state().title}
                        message    = {msg_dialog_state().message}
                        confirm    = {msg_dialog_state().confirm}
                        danger     = {msg_dialog_state().danger}
                        on_confirm = {() => msg_dialog_state().on_confirm?.()}
                        on_cancel  = {() =>
                            msg_dialog_state_set((prev) => ({
                                ...prev,
                                open: false,
                            }))
                        }
                    />
                </solid.Show>
            </div>
        );
    }, root);
}

