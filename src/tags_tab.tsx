import * as solid from "solid-js";
import * as types from "./types";

// Include
import "./tags_tab.css";

interface Tags_Tab_Properties {
    tags:           types.Tag[];
    on_tag_new:     () => void;
    on_tag_edit:    (tag: types.Tag) => void;
    on_tags_delete: (ids: number[]) => void;
}

export function Tags_Tab(properties: Tags_Tab_Properties) {
    const [selected_ids, set_selected_ids] = solid.createSignal<number[]>([]);
    const [last_selected_index, set_last_selected_index] = solid.createSignal<number | null>(null);

    const selected_tags = solid.createMemo(() =>
        properties.tags.filter((t) => selected_ids().includes(t.id)),
    );

    function handle_row_click(tag: types.Tag, index: number, event: MouseEvent) {
        const last_idx = last_selected_index();
        if (event.shiftKey && last_idx !== null) {
            const start     = Math.min(last_idx, index);
            const end       = Math.max(last_idx, index);
            const range_ids = properties.tags.slice(start, end + 1).map((t) => t.id);
            const combined  = new Set([...selected_ids(), ...range_ids]);
            set_selected_ids(Array.from(combined));
        } else if (event.ctrlKey || event.metaKey) {
            if (selected_ids().includes(tag.id)) {
                set_selected_ids(selected_ids().filter((id) => id !== tag.id));
            } else {
                set_selected_ids([...selected_ids(), tag.id]);
            }
            set_last_selected_index(index);
        } else {
            set_selected_ids([tag.id]);
            set_last_selected_index(index);
        }
    }

    function handle_row_double_click(tag: types.Tag) {
        properties.on_tag_edit(tag);
    }

    function handle_edit_click() {
        const tag = selected_tags()[0];
        if (tag !== undefined && selected_tags().length === 1) {
            properties.on_tag_edit(tag);
        }
    }

    function handle_delete_click() {
        const current_ids = selected_ids();
        if (current_ids.length > 0) {
            properties.on_tags_delete([...current_ids]);
        }
    }

    function on_key_down(event: KeyboardEvent) {
        if (event.key === "Delete" && selected_ids().length > 0) {
            const active_element = document.activeElement;
            if (
                active_element?.tagName === "INPUT" ||
                active_element?.tagName === "TEXTAREA"
            )
                return;
            event.preventDefault();
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
        <div class="tags-panel panel-card">
            {/* Toolbar Header */}
            <div class="toolbar">
                <div class="toolbar-left">
                    <button
                        type    = "button"
                        class   = "btn btn-primary"
                        onClick = {properties.on_tag_new}
                    >
                        ＋ Nova tag
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
            </div>

            {/* Tags Table List */}
            <div class="table-container">
                <table class="tags-table">
                    <tbody>
                        {properties.tags.length === 0 ? (
                            <tr>
                                <td class="empty-cell">
                                    Nenhuma tag cadastrada
                                </td>
                            </tr>
                        ) : (
                            <solid.For each={properties.tags}>
                                {(tag, index) => (
                                    <tr
                                        class      = "table-row"
                                        classList  = {{
                                            "row-selected":
                                                selected_ids().includes(tag.id),
                                        }}
                                        onClick    = {(event) =>
                                            handle_row_click(tag, index(), event)
                                        }
                                        onDblClick = {() =>
                                            handle_row_double_click(tag)
                                        }
                                    >
                                        <td class="col-tag">
                                            <span class="tag-title">
                                                {tag.nome}
                                            </span>
                                            <span class="tag-count">
                                                ({tag.count})
                                            </span>
                                        </td>
                                    </tr>
                                )}
                            </solid.For>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
