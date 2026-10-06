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

    const [name, name_set] = solid.createSignal(properties.initial_name || "");
    const [link, link_set] = solid.createSignal(properties.initial_link || "");

    // Tags
    const initial_tags = [...new Set(properties.initial_tags ?? [])].sort(sort_tags);
    const initial_tags_set = new Set(initial_tags);
    const [tags, tags_set] = solid.createSignal<string[]>(initial_tags);
    const [tags_not_used, tags_not_used_set] = solid.createSignal<string[]>(
        [...new Set(properties.available_tags ?? [])]
            .filter((tag) => !initial_tags_set.has(tag))
            .sort(sort_tags),
    );

    const [name_error, name_error_set] = solid.createSignal(false);
    const [selected_tag_indices, selected_tag_indices_set] = solid.createSignal<number[]>([]);

    solid.onMount(() => {
        name_input_ref?.focus();

        async function on_key_down(e: KeyboardEvent) {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                if (document.activeElement?.id === "tag-input") {
                    e.preventDefault();
                    // tags_add();
                } else {
                    e.preventDefault();
                    save();
                }
            }
        }

        window.addEventListener("keydown", on_key_down);
        solid.onCleanup(() => {
            window.removeEventListener("keydown", on_key_down);
        });
    });

    function sort_tags(a: string, b: string) {
        return a.localeCompare(b, undefined, { sensitivity: "base" });
    }

    /* function tags_add() {
        const input = tags_to_be_added().trim();
        if (!input) return;

        const input_splitted = input
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
        const current_tags = [...tags()];
        const current_tags_lowered = new Set(current_tags.map((t) => t.toLowerCase()));

        for (const p of input_splitted) {
            if (!current_tags_lowered.has(p.toLowerCase())) {
                current_tags.push(p);
                current_tags_lowered.add(p.toLowerCase());
            }
        }

        current_tags.sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" }),
        );

        tags_set(current_tags);
        // tags_to_be_added_set("");
    } */

    function tags_not_used_clicked(idx: number, e: MouseEvent) {
        let not_used = [...(tags_not_used() ?? [])]; // this is a copy.
        const tag_clicked = not_used[idx];
        if (!tag_clicked) return;

        // Add to song tags
        let song_current_tags = [...(tags() ?? [])]; // this is a copy.
        if (!song_current_tags.includes(tag_clicked)) {
            song_current_tags.push(tag_clicked);
            // song_current_tags.sort((a, b) =>
            //     a.localeCompare(b, undefined, { sensitivity: "base" }),
            // );
            tags_set(song_current_tags);
        }
        
        // Remove from tags not used
        not_used = not_used.filter((_, i) => i !== idx);
        tags_not_used_set(not_used);
    }

    function song_tag_clicked(idx: number, e: MouseEvent) {
        let song_current_tags = [...(tags() ?? [])]; // this is a copy.
        const tag_clicked = song_current_tags[idx];
        if (tag_clicked === undefined) return;

        // Remove from song tags
        song_current_tags = song_current_tags.filter((_, i) => i !== idx);
        tags_set(song_current_tags);

        // Add to tags not used
        let not_used = [...(tags_not_used() ?? [])]; // this is a copy.
        if (!not_used.includes(tag_clicked)) {
            not_used.push(tag_clicked);
            not_used.sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: "base" }),
            );
            tags_not_used_set(not_used);
        }
    }
    
    function save() {
        const trimmed_name = name().trim();
        if (!trimmed_name) {
            name_error_set(true);
            return;
        }
        const clean_link = link().trim() || null;
        properties.on_save(trimmed_name, clean_link, [...tags()]);
    }

    /* const is_datalist_selection = (e: InputEvent | Event) => {
        const input_type = (e as InputEvent).inputType;
        return input_type === "insertReplacementText" || !(e instanceof InputEvent);
    }; */

    return (
        <dialog.Dialog
            title    = {properties.title}
            on_close = {properties.on_cancel}
        >
            <div class="song-edit-form form-container">
                {/* Name */}
                <div class="form-group">
                    <label for="song-name">Name</label>
                    <input
                        id          = "song-name"
                        ref         = {name_input_ref}
                        type        = "text"
                        class       = "input"
                        classList   = {{ "input-error": name_error() }}
                        value       = {name()}
                        onInput     = {(e) => {
                            name_set(e.currentTarget.value);
                            name_error_set(false);
                        }}
                        placeholder = "Song title"
                    />
                </div>
                
                {/* Link */}
                <div class="form-group">
                    <label for="song-link">Link</label>
                    <input
                        id          = "song-link"
                        type        = "text"
                        class       = "input"
                        value       = {link()}
                        onInput     = {(e) => link_set(e.currentTarget.value)}
                        placeholder = "https://..."
                    />
                </div>

                {/* Tags not being used */}
                <div class="form-group tags-group">
                    <label for="tag-input">Tags not being used</label>
                    {/* Text input
                    <div class="tag-input-row">
                        <input
                            id          = "tag-input"
                            type        = "text"
                            class       = "input"
                            value       = {tags_to_be_added()}
                            onInput     = {(e) => {
                                tags_to_be_added_set(e.currentTarget.value);

                                if (is_datalist_selection(e)) {
                                    tags_add();
                                }
                            }}
                            list        = "available-tags-list"
                            placeholder = "Type or select a tag..."
                        />
                    </div> */}
                    <div class="tags-box">
                        {tags_not_used()?.length === 0 ? (
                            <div class="text-no-tags">All tags are being used</div>
                        ) : (
                            <div class="tags-list">
                                <solid.For each={tags_not_used()}>
                                    {(tag, idx) => (
                                        <div
                                            class     = "tag-item"
                                            classList = {{
                                                "tag-selected":
                                                    selected_tag_indices().includes(
                                                        idx(),
                                                    ),
                                            }}
                                            onClick   = {(e) => tags_not_used_clicked(idx(), e)}
                                        >
                                            <span>{tag}</span>
                                        </div>
                                    )}
                                </solid.For>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tags being used */}
                <div class="form-group tags-group tags-being-used">
                    <label for="tag-input">Tags being used</label>
                    <div class="tags-box tags-box-being-used">
                        {tags().length === 0 ? (
                            <div class="text-no-tags">No tags are being used</div>
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
                                            onClick   = {(e) => song_tag_clicked(idx(), e)}
                                        >
                                            <span>{tag}</span>
                                        </div>
                                    )}
                                </solid.For>
                            </div>
                        )}
                    </div>
                </div>

                <div class="footer-actions">
                    <button
                        type    = "button"
                        class   = "btn btn-secondary"
                        onClick = {properties.on_cancel}
                    >
                        Cancel
                    </button>
                    <button
                        type    = "button"
                        class   = "btn btn-primary"
                        onClick = {save}
                    >
                        Save
                    </button>
                </div>
            </div>
        </dialog.Dialog>
    );
}
