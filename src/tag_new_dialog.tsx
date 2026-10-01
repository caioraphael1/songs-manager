import * as solid  from "solid-js";
import * as dialog from "./dialog";
import "./tag_new_dialog.css";


interface Tag_New_Dialog_Properties {
    on_save:   (names: string[]) => void;
    on_cancel: () => void;
}

export function Tag_New_Dialog(properties: Tag_New_Dialog_Properties) {
    let input_ref: HTMLInputElement | undefined;
    const [tag_names_input, tag_names_input_set] = solid.createSignal("");
    const [has_error,       has_error_set]       = solid.createSignal(false);

    function handle_submit() {
        const names = tag_names_input()
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);

        if (names.length === 0) {
            has_error_set(true);
            return;
        }

        properties.on_save(names);
    }

    solid.onMount(() => {
        input_ref?.focus();

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Enter") {
                e.preventDefault();
                handle_submit();
            }
        }

        window.addEventListener("keydown", onKeyDown);
        solid.onCleanup(() => {
            window.removeEventListener("keydown", onKeyDown);
        });
    });

    return (
        <dialog.Dialog
            title    = "New tag"
            on_close = {properties.on_cancel}
        >
            <div class="tag-dialog-form form-container">
                <div class="form-group">
                    <label for="new-tag-input">
                        Name (ou many names separated by comma)
                    </label>
                    <input
                        id          = "new-tag-input"
                        ref         = {input_ref}
                        type        = "text"
                        class       = "input"
                        classList   = {{ "input-error": has_error() }}
                        value       = {tag_names_input()}
                        onInput     = {(e) => {
                            tag_names_input_set(e.currentTarget.value);
                            has_error_set(false);
                        }}
                        placeholder = "e.g. Rock, 80's, Indie"
                    />
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
                        onClick = {handle_submit}
                    >
                        Create
                    </button>
                </div>
            </div>
        </dialog.Dialog>
    );
}
