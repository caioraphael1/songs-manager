import * as solid from "solid-js";
import "./dialog.css";

interface Dialog_Properties {
    title:    string;
    on_close: () => void;
}

export function Dialog(properties: solid.ParentProps<Dialog_Properties>) {
    function on_key_down(e: KeyboardEvent) {
        if (e.key === "Escape") {
            properties.on_close();
        }
    }

    solid.onMount(() => {
        window.addEventListener("keydown", on_key_down);
    });

    solid.onCleanup(() => {
        window.removeEventListener("keydown", on_key_down);
    });

    return (
        <div
            class   = "dialog-backdrop"
            onClick = {(e) => {
                if (e.target === e.currentTarget) {
                    properties.on_close();
                }
            }}
        >
            <div class="dialog-card">
                <div class="dialog-header">
                    <h2>{properties.title}</h2>
                </div>
                <div class="dialog-body">{properties.children}</div>
            </div>
        </div>
    );
}
