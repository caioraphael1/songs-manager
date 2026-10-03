import * as solid   from "solid-js";
import * as types   from "./types";
import * as api     from "./api";
import * as youtube from "./youtube";
import "./movies_tab.css";

interface Movies_Tab_Properties {
    movies:           types.Movie[];
    total_count:      number;
    search_query:     string;
    on_search_change: (q: string) => void;
    on_movie_new:     () => void;
    on_movie_edit:    (movie: types.Movie) => void;
    on_movies_delete: (ids: number[]) => void;
}

export function Movies_Tab(properties: Movies_Tab_Properties) {
    const [selected_ids,        selected_ids_set]        = solid.createSignal<number[]>([]);
    const [last_selected_index, last_selected_index_set] = solid.createSignal<number | null>(null);

    const selected_songs = solid.createMemo(() =>
        properties.movies.filter((s) => selected_ids().includes(s.id)),
    );

    function song_edit_click() {
        const selected = selected_songs()[0];
        if (selected !== undefined && selected_songs().length === 1) {
            properties.on_movie_edit(selected);
        }
    }

    function song_delete_click() {
        const current_ids = selected_ids();
        if (current_ids.length > 0) {
            properties.on_movies_delete([...current_ids]);
        }
    }
    
    function row_click(movie: types.Movie, index: number, e: MouseEvent) {
        const last_idx = last_selected_index();
        if (e.shiftKey && last_idx !== null) {
            const start     = Math.min(last_idx, index);
            const end       = Math.max(last_idx, index);
            const range_ids = properties.movies.slice(start, end + 1).map((s) => s.id);
            const combined  = new Set([...selected_ids(), ...range_ids]);
            selected_ids_set(Array.from(combined));
        } else if (e.ctrlKey || e.metaKey) {
            if (selected_ids().includes(movie.id)) {
                selected_ids_set(selected_ids().filter((id) => id !== movie.id));
            } else {
                selected_ids_set([...selected_ids(), movie.id]);
            }
            last_selected_index_set(index);
        } else {
            selected_ids_set([movie.id]);
            last_selected_index_set(index);
        }
    }

    function row_double_click(movie: types.Movie, e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.closest(".btn-play")) return;
        properties.on_movie_edit(movie);
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
        <div class="movies-panel panel-card">
            {/* Toolbar Header */}
            <div class="toolbar">
                <div class="toolbar-left">
                    <button
                        type    = "button"
                        class   = "btn btn-movie-new"
                        onClick = {properties.on_movie_new}
                    >
                        ＋ New movie
                    </button>
                    <button
                        type     = "button"
                        class    = "btn btn-movie-edit"
                        disabled = {selected_ids().length !== 1}
                        onClick  = {song_edit_click}
                    >
                        Edit
                    </button>
                    <button
                        type     = "button"
                        class    = "btn btn-movie-delete"
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
                            <line x1="2"  y1="2" x2="10" y2="10" />
                            <line x1="10" y1="2" x2="2"  y2="10" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Movies Table Grid */}
            <div class="table-container">
                <table class="movies-table">
                    <thead>
                        <tr>
                            <th class="col-name-title">  Name  </th>
                            <th class="col-score-title"> Score </th>
                            <th class="col-date-title">  Date  </th>
                        </tr>
                    </thead>
                    <tbody>
                        {properties.movies.length === 0 ? (
                            <tr>
                                <td
                                    colspan = "3"
                                    class   = "empty-cell"
                                >
                                    No movies found
                                </td>
                            </tr>
                            ) : (
                            <solid.For each={properties.movies}>
                                {(movie, index) => (
                                    <tr
                                        class      = "table-row"
                                        classList  = {{
                                            "row-selected": selected_ids().includes(movie.id),
                                        }}
                                        onClick    = {(e) =>
                                            row_click(movie, index(), e)
                                        }
                                        onDblClick = {(e) =>
                                            row_double_click(movie, e)
                                        }
                                    >
                                        <td class="col-name">{movie.name}</td>
                                        <td class="col-score">{movie.score}</td>
                                        <td class="col-date">{movie.date}</td>
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
                    Showing {properties.movies.length} of {properties.total_count}{" "}
                    movie(s)
                </span>
            </div>
        </div>
    );
}
