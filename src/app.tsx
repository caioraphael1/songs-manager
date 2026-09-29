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
        const [active_tab, set_active_tab]                           = solid.createSignal<"songs" | "tags">("songs");
        const [db_path, set_db_path]                                 = solid.createSignal<string>("");
        const [songs, set_songs]                                     = solid.createSignal<types.Song[]>([]);
        const [total_songs_count, set_total_songs_count]             = solid.createSignal<number>(0);
        const [tags, set_tags]                                       = solid.createSignal<types.Tag[]>([]);
        const [search_query, set_search_query]                       = solid.createSignal<string>("");

        // Dialog state
        const [is_new_song_dialog_open, set_is_new_song_dialog_open] = solid.createSignal(false);
        const [editing_song, set_editing_song]                       = solid.createSignal<types.Song | null>(null);
        const [is_new_tag_dialog_open, set_is_new_tag_dialog_open]   = solid.createSignal(false);
        const [editing_tag, set_editing_tag]                         = solid.createSignal<types.Tag | null>(null);

        // Msg Dialog state
        const [msg_dialog_state, msg_set_dialog_state] = solid.createSignal<{
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
            msg_set_dialog_state({
                open:       true,
                title:      title,
                message:    message,
                confirm:    false,
                on_confirm: () => {
                    msg_set_dialog_state((prev) => ({ ...prev, open: false }));
                },
            });
        }

        function confirm_show(
            title:      string,
            message:    string,
            danger:     boolean,
            on_confirm: () => void,
            ) {
            msg_set_dialog_state({
                open:    true,
                title:   title,
                message: message,
                confirm: true,
                danger:  danger,
                on_confirm: () => {
                    msg_set_dialog_state((prev) => ({ ...prev, open: false }));
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
                set_songs(res.songs);
                set_total_songs_count(res.total_count);
            } catch (err: unknown) {
                console.error("Erro ao carregar músicas:", err);
            }
        }

        async function tags_reload() {
            if (!db_path()) return;
            try {
                const queried = await api.tags_query();
                set_tags(queried);
            } catch (err: unknown) {
                console.error("Erro ao carregar tags:", err);
            }
        }

        async function reload_all() {
            await Promise.all([songs_reload(), tags_reload()]);
        }

        async function db_connect(target_path: string) {
            try {
                const opened = await api.db_open(target_path);
                set_db_path(opened);
                await reload_all();
            } catch (err: unknown) {
                msg_show("Erro", `Não foi possível abrir o banco:\n${err}`);
            }
        }

        async function handle_open_database_dialog() {
            const picked = await api.pick_db_file();
            if (picked) {
                await db_connect(picked);
            }
        }

        function handle_search_change(query: string) {
            set_search_query(query);
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
                set_is_new_song_dialog_open(false);
                set_search_query("");
                await reload_all();
            } catch (err: unknown) {
                msg_show("Já existe", `${err}`);
            }
        }

        async function handle_song_update(
            name:      string,
            link:      string | null,
            song_tags: string[],
            ) {
            const current_song = editing_song();
            if (!current_song) return;
            try {
                await api.song_update(current_song.id, name, link, song_tags);
                set_editing_song(null);
                await reload_all();
            } catch (err: unknown) {
                msg_show("Já existe", `${err}`);
            }
        }

        function handle_songs_delete(ids: number[]) {
            if (ids.length === 0) return;
            confirm_show(
                "Excluir música(s)",
                `Excluir ${ids.length} música(s)? Essa ação não pode ser desfeita.`,
                true,
                async () => {
                    try {
                        await api.songs_delete(ids);
                        await reload_all();
                    } catch (err: unknown) {
                        msg_show("Erro", `Erro ao excluir músicas:\n${err}`);
                    }
                },
            );
        }

        // types.Tag handlers
        async function handle_tags_create(names: string[]) {
            try {
                await api.tags_create(names);
                set_is_new_tag_dialog_open(false);
                await tags_reload();
            } catch (err: unknown) {
                msg_show("Erro", `Erro ao criar tags:\n${err}`);
            }
        }

        async function handle_tag_update(newName: string) {
            const current_tag = editing_tag();
            if (!current_tag) return;
            try {
                await api.tag_update(current_tag.id, newName);
                set_editing_tag(null);
                await reload_all();
            } catch (err: unknown) {
                msg_show("Já existe", `${err}`);
            }
        }

        function handle_tags_delete(ids: number[]) {
            if (ids.length === 0) return;
            confirm_show(
                "Excluir tag(s)",
                `Excluir ${ids.length} tag(s) do banco? Elas serão removidas de todas as músicas.`,
                true,
                async () => {
                    try {
                        await api.tags_delete(ids);
                        await reload_all();
                    } catch (err: unknown) {
                        msg_show("Erro", `Erro ao excluir tags:\n${err}`);
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
                console.error("Falha na inicialização do banco:", err);
            }
        });

        const available_tag_names = solid.createMemo(() => tags().map((t) => t.nome));

        return (
            <div class="app-layout">
                {/* Top Bar */}
                <header class="top-bar">
                    <div class="db-title-container">
                        <span class="db-title">
                            🎵 {db_path() || "Gerenciador de Músicas - Sem database"}
                        </span>
                    </div>
                    <button
                        type    = "button"
                        class   = "btn btn-outline"
                        onClick = {handle_open_database_dialog}
                    >
                        Abrir database...
                    </button>
                </header>

                {/* Navigation Tabs Bar */}
                <nav class="tabs-bar">
                    <button
                        type      = "button"
                        class     = "tab-btn"
                        classList = {{ "tab-active": active_tab() === "songs" }}
                        onClick   = {() => set_active_tab("songs")}
                    >
                        Songs
                    </button>
                    <button
                        type      = "button"
                        class     = "tab-btn"
                        classList = {{ "tab-active": active_tab() === "tags" }}
                        onClick   = {() => set_active_tab("tags")}
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
                                on_tag_new     = {() => set_is_new_tag_dialog_open(true)}
                                on_tag_edit    = {(tag) => set_editing_tag(tag)}
                                on_tags_delete = {handle_tags_delete}
                            />
                        }
                    >
                        <songs_tab.Songs_Tab
                            songs            = {songs()}
                            total_count      = {total_songs_count()}
                            search_query     = {search_query()}
                            on_search_change = {handle_search_change}
                            on_song_new      = {() => set_is_new_song_dialog_open(true)}
                            on_song_edit     = {(song) => set_editing_song(song)}
                            on_songs_delete  = {handle_songs_delete}
                        />
                    </solid.Show>
                </main>

                {/* Dialogs */}
                <solid.Show when={is_new_song_dialog_open()}>
                    <song_edit_dialog.Song_Edit_Dialog
                        title          = "Nova música"
                        available_tags = {available_tag_names()}
                        on_save        = {handle_save_new_song}
                        on_cancel      = {() => set_is_new_song_dialog_open(false)}
                    />
                </solid.Show>

                <solid.Show when={editing_song()}>
                    {(song) => (
                        <song_edit_dialog.Song_Edit_Dialog
                            title          = "Editar música"
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
                            on_save        = {handle_song_update}
                            on_cancel      = {() => set_editing_song(null)}
                        />
                    )}
                </solid.Show>

                <solid.Show when={is_new_tag_dialog_open()}>
                    <tag_new_dialog.Tag_New_Dialog
                        on_save   = {handle_tags_create}
                        on_cancel = {() => set_is_new_tag_dialog_open(false)}
                    />
                </solid.Show>

                <solid.Show when={editing_tag()}>
                    {(tag) => (
                        <tag_edit_dialog.Tag_Edit_Dialog
                            current_name = {tag().nome}
                            on_save      = {handle_tag_update}
                            on_cancel    = {() => set_editing_tag(null)}
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
                            msg_set_dialog_state((prev) => ({
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

