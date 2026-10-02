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

    let mouse_down_on_backdrop = false;

    solid.onMount(() => {
        window.addEventListener("keydown", on_key_down);
    });

    solid.onCleanup(() => {
        window.removeEventListener("keydown", on_key_down);
    });

    return (
        <div
            class   = "dialog-backdrop"
            onMouseDown = {(e) => {
                mouse_down_on_backdrop = e.target === e.currentTarget;
            }}
            onClick     = {(e) => {
                if (mouse_down_on_backdrop && e.target === e.currentTarget) {
                    properties.on_close();
                }
                mouse_down_on_backdrop = false;
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
