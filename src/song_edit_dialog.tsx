import * as solid  from "solid-js";
import * as dialog from "./dialog";
import "./song_edit_dialog.css";

interface Song_Edit_Dialog_Properties {
    title:           string;
    initial_name?:   string;
    initial_link?:   string | null;
    initial_tags?:   string[];
    available_tags?: string[];
    on_save:         (name: string, link: string | null, tags: string[]) => void;
    on_cancel:       () => void;
}

export function Song_Edit_Dialog(properties: Song_Edit_Dialog_Properties) {
    let name_input_ref: HTMLInputElement | undefined;

    const [name, set_name] = solid.createSignal(properties.initial_name || "");
    const [link, set_link] = solid.createSignal(properties.initial_link || "");
    const [tags, set_tags] = solid.createSignal<string[]>(
        [...new Set(properties.initial_tags || [])].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" }),
        ),
    );
    const [tag_input, set_tag_input] = solid.createSignal("");
    const [name_error, set_name_error] = solid.createSignal(false);
    const [selected_tag_indices, set_selected_tag_indices] = solid.createSignal<number[]>(
        [],
    );

    solid.onMount(() => {
        name_input_ref?.focus();

        function on_key_down(e: KeyboardEvent) {
            if (
                e.key === "Enter" &&
                (e.target as HTMLElement).tagName !== "TEXTAREA"
                ) {
                if (document.activeElement?.id === "tag-input") {
                    e.preventDefault();
                    add_tags();
                } else {
                    e.preventDefault();
                    handle_submit();
                }
            } else if (e.key === "Delete" && selected_tag_indices().length > 0) {
                remove_selected_tags();
            }
        }

        window.addEventListener("keydown", on_key_down);
        solid.onCleanup(() => {
            window.removeEventListener("keydown", on_key_down);
        });
    });

    function add_tags() {
        const raw = tag_input().trim();
        if (!raw) return;

        const parts = raw
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
        const current_tags = [...tags()];
        const existing_lower = new Set(current_tags.map((t) => t.toLowerCase()));

        for (const p of parts) {
            if (!existing_lower.has(p.toLowerCase())) {
                current_tags.push(p);
                existing_lower.add(p.toLowerCase());
            }
        }

        current_tags.sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" }),
        );
        set_tags(current_tags);
        set_tag_input("");
    }

    function remove_tag(tagToRemove: string) {
        set_tags(tags().filter((t) => t !== tagToRemove));
        set_selected_tag_indices([]);
    }

    function remove_selected_tags() {
        const indices = selected_tag_indices();
        if (indices.length === 0) return;
        const indices_set = new Set(indices);
        set_tags(tags().filter((_, idx) => !indices_set.has(idx)));
        set_selected_tag_indices([]);
    }

    function toggle_tag_select(idx: number, e: MouseEvent) {
        if (e.ctrlKey || e.metaKey) {
            if (selected_tag_indices().includes(idx)) {
                set_selected_tag_indices(
                    selected_tag_indices().filter((i) => i !== idx),
                );
            } else {
                set_selected_tag_indices([...selected_tag_indices(), idx]);
            }
        } else {
            set_selected_tag_indices(
                selected_tag_indices().includes(idx) &&
                    selected_tag_indices().length === 1
                    ? []
                    : [idx],
            );
        }
    }

    function handle_submit() {
        const trimmed_name = name().trim();
        if (!trimmed_name) {
            set_name_error(true);
            return;
        }
        const clean_link = link().trim() || null;
        properties.on_save(trimmed_name, clean_link, [...tags()]);
    }

    return (
        <dialog.Dialog
            title    = {properties.title}
            on_close = {properties.on_cancel}
        >
            <div class="song-edit-form form-container">
                <div class="form-group">
                    <label for="song-name">Nome</label>
                    <input
                        id          = "song-name"
                        ref         = {name_input_ref}
                        type        = "text"
                        class       = "input"
                        classList   = {{ "input-error": name_error() }}
                        value       = {name()}
                        onInput     = {(e) => {
                            set_name(e.currentTarget.value);
                            set_name_error(false);
                        }}
                        placeholder = "Título da música"
                    />
                </div>

                <div class="form-group">
                    <label for="song-link">Link (opcional)</label>
                    <input
                        id          = "song-link"
                        type        = "text"
                        class       = "input"
                        value       = {link()}
                        onInput     = {(e) => set_link(e.currentTarget.value)}
                        placeholder = "https://..."
                    />
                </div>

                <div class="form-group">
                    <label for="tag-input">Tags</label>
                    <div class="tag-input-row">
                        <input
                            id          = "tag-input"
                            type        = "text"
                            class       = "input"
                            value       = {tag_input()}
                            onInput     = {(e) => set_tag_input(e.currentTarget.value)}
                            list        = "available-tags-list"
                            placeholder = "Digite ou selecione uma tag..."
                        />
                        <datalist id="available-tags-list">
                            <solid.For each={properties.available_tags || []}>
                                {(avTag) => <option value={avTag} />}
                            </solid.For>
                        </datalist>
                        <button
                            type    = "button"
                            class   = "btn-add"
                            onClick = {add_tags}
                            title   = "Adicionar tag"
                        >
                            +
                        </button>
                    </div>

                    <div class="tags-box">
                        {tags().length === 0 ? (
                            <div class="no-tags">Nenhuma tag associada</div>
                        ) : (
                            <div class="tags-list">
                                <solid.For each={tags()}>
                                    {(tag, idx) => (
                                        <div
                                            class     = "tag-item"
                                            classList = {{
                                                "tag-selected":
                                                    selected_tag_indices().includes(
                                                        idx(),
                                                    ),
                                            }}
                                            onClick   = {(e) =>
                                                toggle_tag_select(idx(), e)
                                            }
                                        >
                                            <span>{tag}</span>
                                            <button
                                                type    = "button"
                                                class   = "tag-remove-btn"
                                                onClick = {(e) => {
                                                    e.stopPropagation();
                                                    remove_tag(tag);
                                                }}
                                                title   = "Remover tag"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </solid.For>
                            </div>
                        )}
                    </div>

                    {tags().length > 0 && (
                        <div class="tag-actions-row">
                            <button
                                type     = "button"
                                class    = "btn btn-secondary btn-sm"
                                onClick  = {remove_selected_tags}
                                disabled = {selected_tag_indices().length === 0}
                            >
                                Remover selecionadas
                            </button>
                        </div>
                    )}
                </div>

                <div class="footer-actions">
                    <button
                        type    = "button"
                        class   = "btn btn-secondary"
                        onClick = {properties.on_cancel}
                    >
                        Cancelar
                    </button>
                    <button
                        type    = "button"
                        class   = "btn btn-primary"
                        onClick = {handle_submit}
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </dialog.Dialog>
    );
}
