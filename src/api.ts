import * as tauri_core   from "@tauri-apps/api/core";
import * as tauri_opener from "@tauri-apps/plugin-opener";
import * as types        from "./types";


export async function db_get_automatic_path(): Promise<string | null> {
    return await tauri_core.invoke<string | null>("db_get_automatic_path");
}

export async function db_pick_path_dialog(): Promise<string | null> {
    return await tauri_core.invoke<string | null>("db_pick_path_dialog");
}

export async function db_create_path_dialog(): Promise<string | null> {
    return await tauri_core.invoke<string | null>("db_create_path_dialog");
}

export async function db_open(path: string): Promise<string> {
    return await tauri_core.invoke<string>("db_open", { path });
}

// export async function get_active_db_path(): Promise<string | null> {
//     return await tauri_core.invoke<string | null>("get_active_db_path");
// }

export async function query_songs(filter: types.Search_Filter): Promise<types.Song_Query_Result> {
    return await tauri_core.invoke<types.Song_Query_Result>("query_songs", { filter });
}

export async function song_create(
    nome: string,
    link: string | null,
    tags: string[],
    ): Promise<number> {
    return await tauri_core.invoke<number>("song_create", { nome, link, tags });
}

export async function song_update(
    id:   number,
    nome: string,
    link: string | null,
    tags: string[],
    ): Promise<void> {
    await tauri_core.invoke("song_update", { id, nome, link, tags });
}

export async function songs_delete(ids: number[]): Promise<void> {
    await tauri_core.invoke("songs_delete", { ids });
}

export async function tags_query(): Promise<types.Tag[]> {
    return await tauri_core.invoke<types.Tag[]>("tags_query");
}

export async function tags_create(names: string[]): Promise<void> {
    await tauri_core.invoke("tags_create", { names });
}

export async function tag_update(id: number, name: string): Promise<void> {
    await tauri_core.invoke("tag_update", { id, name });
}

export async function tags_delete(ids: number[]): Promise<void> {
    await tauri_core.invoke("tags_delete", { ids });
}

export async function url_open(url: string): Promise<void> {
    let target = url.trim();
    if (!target) return;
    if (!target.includes("://")) {
        target = `https://${target}`;
    }
    try {
        await tauri_opener.openUrl(target);
    } catch {
        window.open(target, "_blank");
    }
}
