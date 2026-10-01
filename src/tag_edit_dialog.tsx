import * as solid  from "solid-js";
import * as dialog from "./dialog";
import "./tag_new_dialog.css";

interface Tag_Edit_Dialog_Properties {
    current_name: string;
    on_save:      (newName: string) => void;
    on_cancel:    () => void;
}

export function Tag_Edit_Dialog(properties: Tag_Edit_Dialog_Properties) {
    let input_ref: HTMLInputElement | undefined;
    const [tag_name,  tag_name_set]  = solid.createSignal(properties.current_name);
    const [has_error, has_error_set] = solid.createSignal(false);

    function handle_submit() {
        const trimmed = tag_name().trim();
        if (!trimmed || trimmed.includes(",")) {
            has_error_set(true);
            return;
        }
        properties.on_save(trimmed);
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
            title    = "Edit tag"
            on_close = {properties.on_cancel}
        >
            <div class="tag-dialog-form form-container">
                <div class="form-group">
                    <label for="edit-tag-name">Name</label>
                    <input
                        id          = "edit-tag-name"
                        ref         = {input_ref}
                        type        = "text"
                        class       = "input"
                        classList   = {{ "input-error": has_error() }}
                        value       = {tag_name()}
                        onInput     = {(e) => {
                            tag_name_set(e.currentTarget.value);
                            has_error_set(false);
                        }}
                        placeholder = "Name"
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
                        Update
                    </button>
                </div>
            </div>
        </dialog.Dialog>
    );
}
