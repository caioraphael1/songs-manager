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
    const [selected_ids,        selected_ids_set]        = solid.createSignal<number[]>([]);
    const [last_selected_index, last_selected_index_set] = solid.createSignal<number | null>(null);

    const selected_songs = solid.createMemo(() =>
        properties.songs.filter((s) => selected_ids().includes(s.id)),
    );

    function song_edit_click() {
        const selected = selected_songs()[0];
        if (selected !== undefined && selected_songs().length === 1) {
            properties.on_song_edit(selected);
        }
    }

    function song_delete_click() {
        const current_ids = selected_ids();
        if (current_ids.length > 0) {
            properties.on_songs_delete([...current_ids]);
        }
    }
    
    const youtube_video_ids = solid.createMemo(() =>
        selected_songs()
            .map((s) => youtube.extract_youtube_video_id(s.link))
            .filter((id): id is string => id !== null),
    );

    function youtube_create_playlist() {
        const ids = youtube_video_ids();
        if (ids.length === 0) return;
        const playlist_url = youtube.build_youtube_playlist_url(ids);
        if (playlist_url) {
            api.url_open(playlist_url);
        }
    }

    function row_click(song: types.Song, index: number, e: MouseEvent) {
        const last_idx = last_selected_index();
        if (e.shiftKey && last_idx !== null) {
            const start     = Math.min(last_idx, index);
            const end       = Math.max(last_idx, index);
            const range_ids = properties.songs.slice(start, end + 1).map((s) => s.id);
            const combined  = new Set([...selected_ids(), ...range_ids]);
            selected_ids_set(Array.from(combined));
        } else if (e.ctrlKey || e.metaKey) {
            if (selected_ids().includes(song.id)) {
                selected_ids_set(selected_ids().filter((id) => id !== song.id));
            } else {
                selected_ids_set([...selected_ids(), song.id]);
            }
            last_selected_index_set(index);
        } else {
            selected_ids_set([song.id]);
            last_selected_index_set(index);
        }
    }

    function row_double_click(song: types.Song, e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.closest(".btn-play")) return;
        properties.on_song_edit(song);
    }

    function play_btn_click(link: string | null, e: MouseEvent) {
        e.stopPropagation();
        if (link) {
            api.url_open(link);
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
            song_delete_click();
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
                        class   = "btn btn-song-new"
                        onClick = {properties.on_song_new}
                    >
                        ＋ New song
                    </button>
                    <button
                        type     = "button"
                        class    = "btn btn-song-edit"
                        disabled = {selected_ids().length !== 1}
                        onClick  = {song_edit_click}
                    >
                        Edit
                    </button>
                    <button
                        type     = "button"
                        class    = "btn btn-song-delete"
                        disabled = {selected_ids().length === 0}
                        onClick  = {song_delete_click}
                    >
                        Delete
                    </button>
                </div>

                <div class="search-container">
                    <input
                        type        = "text"
                        class       = "search-input"
                        placeholder = "Search or query via 'tag:'"
                        value       = {properties.search_query}
                        onInput     = {(e) =>
                            properties.on_search_change(e.currentTarget.value)
                        }
                    />
                    <svg class="search-icon" viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="7" cy="7" r="4.5" />
                        <line x1="10.5" y1="10.5" x2="14" y2="14" />
                    </svg>
                    <button
                        type    = "button"
                        class   = {"search-clear-btn" + (properties.search_query ? " visible" : "")}
                        onClick = {(e) => {
                            e.stopPropagation();
                            properties.on_search_change("");
                        }}
                        title    = "Clear search"
                        aria-label = "Clear search"
                        tabIndex = {properties.search_query ? 0 : -1}
                    >
                        <svg viewBox="0 0 12 12" aria-hidden="true">
                            <line x1="2" y1="2" x2="10" y2="10" />
                            <line x1="10" y1="2" x2="2" y2="10" />
                        </svg>
                    </button>
                </div>

                <div class="toolbar-right">
                    <button
                        type     = "button"
                        class    = "btn btn-yt-playlist"
                        disabled = {youtube_video_ids().length < 2}
                        onClick  = {youtube_create_playlist}
                        title    = {
                            youtube_video_ids().length < 2
                                ? "Select songs with Youtube URLs"
                                : `Create playlist with ${youtube_video_ids().length} video(s)`
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
                            <th class="col-play-title"></th>
                            <th class="col-name-title">Songs</th>
                            <th class="col-tags-title">Tags</th>
                        </tr>
                    </thead>
                    <tbody>
                        {properties.songs.length === 0 ? (
                            <tr>
                                <td
                                    colspan = "3"
                                    class   = "empty-cell"
                                >
                                    No songs found
                                </td>
                            </tr>
                        ) : (
                            <solid.For each={properties.songs}>
                                {(song, index) => (
                                    <tr
                                        class      = "table-row"
                                        classList  = {{
                                            "row-selected": selected_ids().includes(song.id),
                                        }}
                                        onClick    = {(e) =>
                                            row_click(song, index(), e)
                                        }
                                        onDblClick = {(e) =>
                                            row_double_click(song, e)
                                        }
                                    >
                                        <td class="col-play">
                                            {song.link && (
                                                <button
                                                    type    = "button"
                                                    class   = "btn-play"
                                                    title   = {`Open link: ${song.link}`}
                                                    onClick = {(e) =>
                                                        play_btn_click(
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
                    Showing {properties.songs.length} of {properties.total_count}{" "}
                    song(s)
                </span>
            </div>
        </div>
    );
}
