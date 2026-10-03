import * as solid            from "solid-js";
import * as solid_web        from "solid-js/web";
import * as types            from "./types";
import * as search           from "./search_parser";
import * as api              from "./api";

import * as songs_tab        from "./songs_tab";
import * as tags_tab         from "./tags_tab";
import * as movies_tab       from "./movies_tab";
import * as song_edit_dialog from "./song_edit_dialog";
import * as tag_new_dialog   from "./tag_new_dialog";
import * as tag_edit_dialog  from "./tag_edit_dialog";
import * as msg_dialog       from "./msg_dialog";

// Includes
import "./app.css";


const root = document.getElementById("root");

if (root) {
    solid_web.render(() => {
        // GENERAL
        async function reload_all() {
            await Promise.all([songs_reload(), tags_reload()]);
        }

        // DATABASE
        const [db_path, db_path_set] = solid.createSignal<string>("");
        async function db_connect(target_path: string) {
            try {
                const opened = await api.db_open(target_path);
                db_path_set(opened);
                await reload_all();
            } catch (err: unknown) {
                msg_dialog_show("Error", `Failed opening the database:\n${err}`);
            }
        }
        async function db_open_dialog() {
            const picked = await api.db_pick_path_dialog();
            if (picked) {
                await db_connect(picked);
            }
        }
        async function db_create_dialog() {
            const created = await api.db_create_path_dialog();
            if (created) {
                await db_connect(created);
            }
        }

        // TABS
        enum Tab_Id {
            Songs,
            Songs_Tags,
            Movies,
            Movies_Tags,
        }
        const tabs_info: { id: Tab_Id; label: string }[] = [
            { id: Tab_Id.Songs,       label: "Songs"       },
            { id: Tab_Id.Songs_Tags,  label: "Songs Tags"  },
            { id: Tab_Id.Movies,      label: "Movies"      },
            { id: Tab_Id.Movies_Tags, label: "Movies Tags" },
        ];
        const [active_tab, active_tab_set] = solid.createSignal<Tab_Id>(Tab_Id.Songs);

        // SONGS TAB SEARCH
        const [search_query, search_query_set] = solid.createSignal<string>("");
        function search_updated(query: string) {
            search_query_set(query);
            songs_reload(query);
        }

        // SONGS
        const [songs, songs_set]                         = solid.createSignal<types.Song[]>([]);
        const [songs_total_count, songs_total_count_set] = solid.createSignal<number>(0);
        async function songs_reload(custom_query?: string) {
            if (!db_path()) return;
            try {
                const q = custom_query !== undefined ? custom_query : search_query();
                const filter = search.parse_search(q);
                const res = await api.songs_query(filter);
                songs_set(res.songs);
                songs_total_count_set(res.total_count);
            } catch (err: unknown) {
                console.error("Failed loading songs:", err);
            }
        }
        async function song_new_save(
            name:      string,
            link:      string | null,
            song_tags: string[],
            ) {
            try {
                await api.song_create(name, link, song_tags);
                is_on_song_new_dialog_set(false);
                search_query_set("");
                await reload_all();
            } catch (err: unknown) {
                msg_dialog_show("Already exists", `${err}`);
            }
        }
        async function song_edit_save(
            name:      string,
            link:      string | null,
            song_tags: string[],
            ) {
            const current_song = is_on_song_edit_dialog();
            if (!current_song) 
                return;
            try {
                await api.song_update(current_song.id, name, link, song_tags);
                is_on_song_edit_dialog_set(null);
                await reload_all();
            } catch (err: unknown) {
                msg_dialog_show("Already exists", `${err}`);
            }
        }
        function songs_delete(ids: number[]) {
            if (ids.length === 0) return;
            msg_confirmation_dialog_show(
                "Delete song(s)",
                `Delete ${ids.length} song(s)? This action cannot be undone.`,
                true,
                async () => {
                    try {
                        await api.songs_delete(ids);
                        await reload_all();
                    } catch (err: unknown) {
                        msg_dialog_show("Error", `Error when deleting a song:\n${err}`);
                    }
                },
            );
        }
    
        // TAGS
        const [all_tags, all_tags_set] = solid.createSignal<types.Tag[]>([]);
        const all_tags_names           = solid.createMemo(() => all_tags().map((t) => t.name));
        async function tags_reload() {
            if (!db_path()) return;
            try {
                const queried = await api.all_tags_query();
                all_tags_set(queried);
            } catch (err: unknown) {
                console.error("Failed loading the tags:", err);
            }
        }
        async function tag_new_save(names: string[]) {
            try {
                await api.tag_new(names);
                is_on_tag_new_dialog_set(false);
                await tags_reload();
            } catch (err: unknown) {
                msg_dialog_show("Error", `Error when creating tags:\n${err}`);
            }
        }
        async function tag_edit_save(newName: string) {
            const current_tag = is_on_tag_edit_dialog();
            if (!current_tag) return;
            try {
                await api.tag_edit(current_tag.id, newName);
                is_on_tag_edit_dialog_set(null);
                await reload_all();
            } catch (err: unknown) {
                msg_dialog_show("Already exists", `${err}`);
            }
        }
        function tags_delete(ids: number[]) {
            if (ids.length === 0) return;
            msg_confirmation_dialog_show(
                "Delete tag(s)",
                `Delete ${ids.length} tag(s) from the database? They will be removed from all songs.`,
                true,
                async () => {
                    try {
                        await api.tags_delete(ids);
                        await reload_all();
                    } catch (err: unknown) {
                        msg_dialog_show("Error", `Error when deleting the tags:\n${err}`);
                    }
                },
            );
        }

        // MOVIES
        const [movies, movies_set]                         = solid.createSignal<types.Movie[]>([]);
        const [movies_total_count, movies_total_count_set] = solid.createSignal<number>(0);

        // SONG DIALOG
        const [is_on_song_new_dialog,  is_on_song_new_dialog_set]  = solid.createSignal(false);
        const [is_on_song_edit_dialog, is_on_song_edit_dialog_set] = solid.createSignal<types.Song | null>(null);

        // TAG DIALOG
        const [is_on_tag_new_dialog,  is_on_tag_new_dialog_set]  = solid.createSignal(false);
        const [is_on_tag_edit_dialog, is_on_tag_edit_dialog_set] = solid.createSignal<types.Tag | null>(null);

        // MOVIES DIALOG
        const [is_on_movie_new_dialog,  is_on_movie_new_dialog_set]  = solid.createSignal(false);
        const [is_on_movie_edit_dialog, is_on_movie_edit_dialog_set] = solid.createSignal<types.Movie | null>(null);

        // MSG DIALOG
        const [msg_dialog_state, msg_dialog_state_set] = solid.createSignal<{
            open:        boolean;
            title:       string;
            message:     string;
            confirm?:    boolean;
            danger?:     boolean;
            on_confirm?: () => void;
            }>({
            open:    false,
            title:   "",
            message: "",
        });
        function msg_dialog_show(title: string, message: string) {
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
        function msg_confirmation_dialog_show(
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

        solid.onMount(async () => {
            try {
                const default_path = await api.db_get_automatic_path();
                if (default_path) {
                    await db_connect(default_path);
                }
            } catch (err: unknown) {
                console.error("Failed initializing the database:", err);
            }
        });

        return (
            <div class="app-layout">
                {/* Top Bar */}
                <header class="top-bar">
                    <div class="db-title-container">
                        <span class="db-title">
                            🎵 {db_path() || "Songs Manager - No database"}
                        </span>
                    </div>
                    <div class="top-bar-actions">
                        <button
                            class   = "btn btn-header"
                            onClick = {db_create_dialog}
                        >
                            Create new database
                        </button>
                        <button
                            class   = "btn btn-header"
                            onClick = {db_open_dialog}
                        >
                            Open existing database
                        </button>
                    </div>
                </header>              

                {/* Tabs Buttons */}
                <nav class="tabs-bar">
                    <solid.For each={tabs_info}>
                        {(tab) => (
                            <button
                                class     = "btn-tab"
                                classList = {{ "tab-active": active_tab() === tab.id }}
                                onClick   = {() => active_tab_set(tab.id)}
                            >
                                {tab.label}
                            </button>
                        )}
                    </solid.For>
                </nav>

                {/* Main View */}
                <main class="main-content">
                    <solid.Switch>
                        <solid.Match when={active_tab() === Tab_Id.Songs}>
                            <songs_tab.Songs_Tab
                                songs            = {songs()}
                                total_count      = {songs_total_count()}
                                search_query     = {search_query()}
                                on_search_change = {search_updated}
                                on_song_new      = {() => is_on_song_new_dialog_set(true)}
                                on_song_edit     = {(song) => is_on_song_edit_dialog_set(song)}
                                on_songs_delete  = {songs_delete}
                            />
                        </solid.Match>
                        <solid.Match when={active_tab() === Tab_Id.Songs_Tags}>
                            <tags_tab.Tags_Tab
                                tags           = {all_tags()}
                                on_tag_new     = {() => is_on_tag_new_dialog_set(true)}
                                on_tag_edit    = {(tag) => is_on_tag_edit_dialog_set(tag)}
                                on_tags_delete = {tags_delete}
                            />
                        </solid.Match>
                        <solid.Match when={active_tab() === Tab_Id.Movies}>
                            <movies_tab.Movies_Tab
                                movies           = {movies()}
                                total_count      = {songs_total_count()}
                                search_query     = {search_query()}
                                on_search_change = {search_updated}
                                on_movie_new      = {() => is_on_song_new_dialog_set(true)}
                                on_movie_edit     = {(movie) => is_on_movie_edit_dialog_set(movie)}
                                on_movies_delete  = {songs_delete}
                            />
                        </solid.Match>
                        <solid.Match when={active_tab() === Tab_Id.Movies_Tags}>
                            <tags_tab.Tags_Tab
                                tags           = {all_tags()}
                                on_tag_new     = {() => is_on_tag_new_dialog_set(true)}
                                on_tag_edit    = {(tag) => is_on_tag_edit_dialog_set(tag)}
                                on_tags_delete = {tags_delete}
                            />
                        </solid.Match>
                    </solid.Switch>
                </main>

                {/* Dialogs */}
                <solid.Show when={is_on_song_new_dialog()}>
                    <song_edit_dialog.Song_Edit_Dialog
                        title          = "New song"
                        available_tags = {all_tags_names()}
                        on_save        = {song_new_save}
                        on_cancel      = {() => is_on_song_new_dialog_set(false)}
                    />
                </solid.Show>
                <solid.Show when={is_on_song_edit_dialog()}>
                    {(song) => (
                        <song_edit_dialog.Song_Edit_Dialog
                            title          = "Edit song"
                            initial_name   = {song().name}
                            initial_link   = {song().link}
                            initial_tags   = {song().tags}
                            available_tags = {all_tags_names()}
                            on_save        = {song_edit_save}
                            on_cancel      = {() => is_on_song_edit_dialog_set(null)}
                        />
                    )}
                </solid.Show>
                <solid.Show when={is_on_tag_new_dialog()}>
                    <tag_new_dialog.Tag_New_Dialog
                        on_save   = {tag_new_save}
                        on_cancel = {() => is_on_tag_new_dialog_set(false)}
                    />
                </solid.Show>
                <solid.Show when={is_on_tag_edit_dialog()}>
                    {(tag) => (
                        <tag_edit_dialog.Tag_Edit_Dialog
                            current_name = {tag().name}
                            on_save      = {tag_edit_save}
                            on_cancel    = {() => is_on_tag_edit_dialog_set(null)}
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

