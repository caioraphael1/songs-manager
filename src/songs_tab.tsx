import * as solid   from "solid-js";
import * as types   from "./types";
import * as api     from "./api";
import * as youtube from "./youtube";
import "./songs_tab.css";

interface Songs_Tab_Properties {
    songs:            types.Song[];
    total_count:      number;
    search_query:     string;
    on_search_change: (q: string) => void;
    on_song_new:      () => void;
    on_song_edit:     (song: types.Song) => void;
    on_songs_delete:  (ids: number[]) => void;
}

export function Songs_Tab(properties: Songs_Tab_Properties) {
    const [selected_ids, set_selected_ids] = solid.createSignal<number[]>([]);
    const [last_selected_index, set_last_selected_index] = solid.createSignal<
        number | null
    >(null);

    const selected_songs = solid.createMemo(() =>
        properties.songs.filter((s) => selected_ids().includes(s.id)),
    );

    const youtube_video_ids = solid.createMemo(() =>
        selected_songs()
            .map((s) => youtube.extract_youtube_video_id(s.link))
            .filter((id): id is string => id !== null),
    );

    function handle_row_click(song: types.Song, index: number, e: MouseEvent) {
        const last_idx = last_selected_index();
        if (e.shiftKey && last_idx !== null) {
            const start     = Math.min(last_idx, index);
            const end       = Math.max(last_idx, index);
            const range_ids = properties.songs.slice(start, end + 1).map((s) => s.id);
            const combined  = new Set([...selected_ids(), ...range_ids]);
            set_selected_ids(Array.from(combined));
        } else if (e.ctrlKey || e.metaKey) {
            if (selected_ids().includes(song.id)) {
                set_selected_ids(selected_ids().filter((id) => id !== song.id));
            } else {
                set_selected_ids([...selected_ids(), song.id]);
            }
            set_last_selected_index(index);
        } else {
            set_selected_ids([song.id]);
            set_last_selected_index(index);
        }
    }

    function handle_row_double_click(song: types.Song, e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.closest(".play-btn")) return;
        properties.on_song_edit(song);
    }

    function handle_play_click(link: string | null, e: MouseEvent) {
        e.stopPropagation();
        if (link) {
            api.url_open(link);
        }
    }

    function handle_create_you_tube_playlist() {
        const ids = youtube_video_ids();
        if (ids.length === 0) return;
        const playlist_url = youtube.build_youtube_playlist_url(ids);
        if (playlist_url) {
            api.url_open(playlist_url);
        }
    }

    function handle_edit_click() {
        const selected = selected_songs()[0];
        if (selected !== undefined && selected_songs().length === 1) {
            properties.on_song_edit(selected);
        }
    }

    function handle_delete_click() {
        const current_ids = selected_ids();
        if (current_ids.length > 0) {
            properties.on_songs_delete([...current_ids]);
        }
    }

    function on_key_down(e: KeyboardEvent) {
        if (e.key === "Delete" && selected_ids().length > 0) {
            const active_element = document.activeElement;
            if (
                active_element?.tagName === "INPUT" ||
                active_element?.tagName === "TEXTAREA"
            )
                return;
            e.preventDefault();
            handle_delete_click();
        }
    }

    solid.onMount(() => {
        window.addEventListener("keydown", on_key_down);
    });

    solid.onCleanup(() => {
        window.removeEventListener("keydown", on_key_down);
    });

    return (
        <div class="songs-panel panel-card">
            {/* Toolbar Header */}
            <div class="toolbar">
                <div class="toolbar-left">
                    <button
                        type    = "button"
                        class   = "btn btn-primary"
                        onClick = {properties.on_song_new}
                    >
                        ＋ Nova música
                    </button>
                    <button
                        type     = "button"
                        class    = "btn btn-outline"
                        disabled = {selected_ids().length !== 1}
                        onClick  = {handle_edit_click}
                    >
                        Editar
                    </button>
                    <button
                        type     = "button"
                        class    = "btn btn-outline-danger"
                        disabled = {selected_ids().length === 0}
                        onClick  = {handle_delete_click}
                    >
                        Excluir
                    </button>
                </div>

                <div class="toolbar-search">
                    <input
                        type        = "text"
                        class       = "search-input"
                        placeholder = "🔍  Buscas ou query via 'tag:'"
                        value       = {properties.search_query}
                        onInput     = {(e) =>
                            properties.on_search_change(e.currentTarget.value)
                        }
                    />
                </div>

                <div class="toolbar-right">
                    <button
                        type     = "button"
                        class    = "btn btn-primary"
                        disabled = {youtube_video_ids().length === 0}
                        onClick  = {handle_create_you_tube_playlist}
                        title    = {
                            youtube_video_ids().length === 0
                                ? "Selecione músicas com links do YouTube"
                                : `Criar playlist com ${youtube_video_ids().length} vídeo(s)`
                        }
                    >
                        Create YouTube Playlist
                    </button>
                </div>
            </div>

            {/* Songs Table Grid */}
            <div class="table-container">
                <table class="songs-table">
                    <thead>
                        <tr>
                            <th class="col-play"></th>
                            <th class="col-name">Música</th>
                            <th class="col-tags">Tags</th>
                        </tr>
                    </thead>
                    <tbody>
                        {properties.songs.length === 0 ? (
                            <tr>
                                <td
                                    colspan = "3"
                                    class   = "empty-cell"
                                >
                                    Nenhuma música encontrada
                                </td>
                            </tr>
                        ) : (
                            <solid.For each={properties.songs}>
                                {(song, index) => (
                                    <tr
                                        class      = "table-row"
                                        classList  = {{
                                            "row-selected":
                                                selected_ids().includes(song.id),
                                        }}
                                        onClick    = {(e) =>
                                            handle_row_click(song, index(), e)
                                        }
                                        onDblClick = {(e) =>
                                            handle_row_double_click(song, e)
                                        }
                                    >
                                        <td class="col-play">
                                            {song.link && (
                                                <button
                                                    type    = "button"
                                                    class   = "play-btn"
                                                    title   = {`Abrir link: ${song.link}`}
                                                    onClick = {(e) =>
                                                        handle_play_click(
                                                            song.link,
                                                            e,
                                                        )
                                                    }
                                                >
                                                    ▶
                                                </button>
                                            )}
                                        </td>
                                        <td class="col-name">{song.nome}</td>
                                        <td class="col-tags">{song.tags}</td>
                                    </tr>
                                )}
                            </solid.For>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div class="footer">
                <span class="stats-text">
                    Exibindo {properties.songs.length} de {properties.total_count}{" "}
                    música(s)
                </span>
            </div>
        </div>
    );
}
