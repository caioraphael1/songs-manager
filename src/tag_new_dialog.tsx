import * as solid  from "solid-js";
import * as dialog from "./dialog";
import "./tag_new_dialog.css";


interface Tag_New_Dialog_Properties {
    on_save:   (names: string[]) => void;
    on_cancel: () => void;
}

export function Tag_New_Dialog(properties: Tag_New_Dialog_Properties) {
    let input_ref: HTMLInputElement | undefined;
    const [tag_names_input, set_tag_names_input] = solid.createSignal("");
    const [has_error, set_has_error]             = solid.createSignal(false);

    function handle_submit() {
        const names = tag_names_input()
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);

        if (names.length === 0) {
            set_has_error(true);
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
            title    = "Nova tag"
            on_close = {properties.on_cancel}
        >
            <div class="tag-dialog-form form-container">
                <div class="form-group">
                    <label for="new-tag-input">
                        Nome (ou múltiplos nomes separados por vírgula)
                    </label>
                    <input
                        id          = "new-tag-input"
                        ref         = {input_ref}
                        type        = "text"
                        class       = "input"
                        classList   = {{ "input-error": has_error() }}
                        value       = {tag_names_input()}
                        onInput     = {(e) => {
                            set_tag_names_input(e.currentTarget.value);
                            set_has_error(false);
                        }}
                        placeholder = "ex: Rock, Anos 80, Indie"
                    />
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
                        Criar
                    </button>
                </div>
            </div>
        </dialog.Dialog>
    );
}
