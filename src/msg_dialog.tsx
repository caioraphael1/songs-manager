import * as solid  from "solid-js";
import * as dialog from "./dialog";
import "./msg_dialog.css";

interface Msg_Dialog_Properties {
    title:      string;
    message:    string;
    confirm?:   boolean;
    danger?:    boolean;
    on_confirm: () => void;
    on_cancel:  () => void;
}

export function Msg_Dialog(properties: Msg_Dialog_Properties) {
    function on_key_down(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            properties.on_confirm();
        }
    }

    solid.onMount(() => {
        window.addEventListener("keydown", on_key_down);
    });

    solid.onCleanup(() => {
        window.removeEventListener("keydown", on_key_down);
    });

    return (
        <dialog.Dialog
            title    = {properties.title}
            on_close = {properties.on_cancel}
        >
            <div class="message-content">
                <p class="message-text">{properties.message}</p>
                <div class="footer-actions">
                    {properties.confirm ? (
                        <>
                            <button
                                type    = "button"
                                class   = "btn btn-secondary"
                                onClick = {properties.on_cancel}
                            >
                                Cancelar
                            </button>
                            <button
                                type    = "button"
                                class   = {`btn ${properties.danger ? "btn-danger" : "btn-primary"}`}
                                onClick = {properties.on_confirm}
                            >
                                Confirmar
                            </button>
                        </>
                    ) : (
                        <button
                            type    = "button"
                            class   = "btn btn-primary"
                            onClick = {properties.on_confirm}
                        >
                            OK
                        </button>
                    )}
                </div>
            </div>
        </dialog.Dialog>
    );
}
