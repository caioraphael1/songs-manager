#![allow(non_camel_case_types)]

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS musicas (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    link TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS musicas_tags (
    musica_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (musica_id, tag_id),
    FOREIGN KEY (musica_id) REFERENCES musicas(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
"#;

pub struct AppState {
    pub db: Mutex<Option<Connection>>,
    pub db_path: Mutex<Option<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SongRecord {
    pub id: i64,
    pub nome: String,
    pub tags: String,
    pub link: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Song_Query_Result {
    pub songs: Vec<SongRecord>,
    pub total_count: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TagRecord {
    pub id: i64,
    pub nome: String,
    pub count: i64,
}

#[derive(Deserialize, Debug)]
pub struct Search_Filter {
    pub free_text: String,
    pub included_tag_groups: Vec<Vec<String>>,
    pub excluded_tags: Vec<String>,
}

fn init_connection(path: &str) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| format!("Erro ao abrir banco: {}", e))?;
    conn.execute_batch("PRAGMA foreign_keys = ON;").map_err(|e| format!("Erro no PRAGMA: {}", e))?;
    conn.execute_batch(SCHEMA).map_err(|e| format!("Erro ao criar tabelas: {}", e))?;
    Ok(conn)
}

fn get_or_create_tag(conn: &Connection, name: &str) -> Result<i64, rusqlite::Error> {
    let name_trimmed = name.trim();
    let mut stmt = conn.prepare("SELECT id FROM tags WHERE nome = ? COLLATE NOCASE")?;
    let mut rows = stmt.query(params![name_trimmed])?;
    if let Some(row) = rows.next()? {
        return row.get(0);
    }
    conn.execute("INSERT INTO tags (nome) VALUES (?)", params![name_trimmed])?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn default_db_path_get() -> Option<String> {
    // 1. Check CLI args
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 && args[1].ends_with(".db") && Path::new(&args[1]).exists() {
        return Some(args[1].clone());
    }

    // 2. Check current working directory
    if let Ok(entries) = std::fs::read_dir(".") {
        let mut dbs: Vec<PathBuf> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.extension().map_or(false, |ext| ext == "db"))
            .collect();
        dbs.sort();
        if let Some(first) = dbs.first() {
            return Some(first.to_string_lossy().to_string());
        }
    }

    // 3. Check executable directory
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if let Ok(entries) = std::fs::read_dir(parent) {
                let mut dbs: Vec<PathBuf> = entries
                    .filter_map(|e| e.ok())
                    .map(|e| e.path())
                    .filter(|p| p.extension().map_or(false, |ext| ext == "db"))
                    .collect();
                dbs.sort();
                if let Some(first) = dbs.first() {
                    return Some(first.to_string_lossy().to_string());
                }
            }
        }
    }

    None
}

#[tauri::command]
fn pick_db_file() -> Option<String> {
    let file = rfd::FileDialog::new()
        .add_filter("SQLite", &["db", "sqlite", "sqlite3"])
        .set_title("Abrir ou criar banco SQLite")
        .pick_file();

    file.map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn db_open(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let conn = init_connection(&path)?;
    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let mut path_guard = state.db_path.lock().map_err(|e| e.to_string())?;
    *db_guard = Some(conn);
    *path_guard = Some(path.clone());
    Ok(path)
}

#[tauri::command]
fn get_active_db_path(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let path_guard = state.db_path.lock().map_err(|e| e.to_string())?;
    Ok(path_guard.clone())
}

#[tauri::command]
fn query_songs(filter: Search_Filter, state: State<'_, AppState>) -> Result<Song_Query_Result, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_ref().ok_or("Nenhum banco de dados aberto.")?;

    let total_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM musicas", [], |r| r.get(0))
        .unwrap_or(0);

    let search_pattern = format!("%{}%", filter.free_text.trim());
    let mut sql = String::from(
        "SELECT m.id, m.nome, COALESCE(GROUP_CONCAT(t.nome, ', '), ''), m.link \
         FROM musicas m \
         LEFT JOIN musicas_tags mt ON mt.musica_id = m.id \
         LEFT JOIN tags t ON t.id = mt.tag_id \
         WHERE (m.nome LIKE ?1 OR EXISTS ( \
             SELECT 1 FROM musicas_tags x JOIN tags y ON y.id = x.tag_id \
             WHERE x.musica_id = m.id AND y.nome LIKE ?2 \
         ))"
    );

    let mut sql_params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![
        Box::new(search_pattern.clone()),
        Box::new(search_pattern.clone()),
    ];

    // Included tag groups (AND across groups, OR within group)
    for group in filter.included_tag_groups {
        if group.is_empty() {
            continue;
        }
        let placeholders = group.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        sql.push_str(&format!(
            " AND EXISTS ( \
                SELECT 1 FROM musicas_tags mt2 JOIN tags t2 ON t2.id = mt2.tag_id \
                WHERE mt2.musica_id = m.id AND t2.nome COLLATE NOCASE IN ({}) \
            )",
            placeholders
        ));
        for tag in group {
            sql_params.push(Box::new(tag));
        }
    }

    // Excluded tags (song must NOT have any of these)
    if !filter.excluded_tags.is_empty() {
        let placeholders = filter.excluded_tags.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        sql.push_str(&format!(
            " AND NOT EXISTS ( \
                SELECT 1 FROM musicas_tags mt3 JOIN tags t3 ON t3.id = mt3.tag_id \
                WHERE mt3.musica_id = m.id AND t3.nome COLLATE NOCASE IN ({}) \
            )",
            placeholders
        ));
        for tag in filter.excluded_tags {
            sql_params.push(Box::new(tag));
        }
    }

    sql.push_str(" GROUP BY m.id ORDER BY m.nome COLLATE NOCASE");

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Erro SQL: {}", e))?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = sql_params.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(SongRecord {
                id: row.get(0)?,
                nome: row.get(1)?,
                tags: row.get(2)?,
                link: row.get(3)?,
            })
        })
        .map_err(|e| format!("Erro na consulta: {}", e))?;

    let mut songs = Vec::new();
    for item in rows {
        songs.push(item.map_err(|e| format!("Erro lendo registro: {}", e))?);
    }

    Ok(Song_Query_Result { songs, total_count })
}

#[tauri::command]
fn song_create(
    nome: String,
    link: Option<String>,
    tags: Vec<String>,
    state: State<'_, AppState>,
    ) -> Result<i64, String> {
    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_mut().ok_or("Nenhum banco de dados aberto.")?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let clean_link = link.and_then(|l| {
        let t = l.trim().to_string();
        if t.is_empty() {
            None
        } else {
            Some(t)
        }
    });

    let res = tx.execute(
        "INSERT INTO musicas (nome, link) VALUES (?, ?)",
        params![nome.trim(), clean_link],
    );

    match res {
        Ok(_) => (),
        Err(rusqlite::Error::SqliteFailure(_, _)) => {
            return Err("Já existe uma música com esse nome ou link.".to_string());
        }
        Err(e) => return Err(e.to_string()),
    }

    let song_id = tx.last_insert_rowid();

    for tag in tags {
        let tag_id = get_or_create_tag(&tx, &tag).map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT OR IGNORE INTO musicas_tags (musica_id, tag_id) VALUES (?, ?)",
            params![song_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(song_id)
}

#[tauri::command]
fn song_update(
    id: i64,
    nome: String,
    link: Option<String>,
    tags: Vec<String>,
    state: State<'_, AppState>,
    ) -> Result<(), String> {
    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_mut().ok_or("Nenhum banco de dados aberto.")?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let clean_link = link.and_then(|l| {
        let t = l.trim().to_string();
        if t.is_empty() {
            None
        } else {
            Some(t)
        }
    });

    let res = tx.execute(
        "UPDATE musicas SET nome = ?, link = ? WHERE id = ?",
        params![nome.trim(), clean_link, id],
    );

    match res {
        Ok(_) => (),
        Err(rusqlite::Error::SqliteFailure(_, _)) => {
            return Err("Já existe uma música com esse nome ou link.".to_string());
        }
        Err(e) => return Err(e.to_string()),
    }

    // Get current tags
    let mut current_tags = Vec::new();
    {
        let mut stmt = tx
            .prepare(
                "SELECT t.nome FROM musicas_tags mt JOIN tags t ON t.id = mt.tag_id WHERE mt.musica_id = ?",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![id], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        for r in rows {
            current_tags.push(r.map_err(|e| e.to_string())?);
        }
    }

    let final_tags_trimmed: Vec<String> = tags.into_iter().map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect();

    // Determine tags to remove
    for cur in &current_tags {
        if !final_tags_trimmed.iter().any(|f| f.eq_ignore_ascii_case(cur)) {
            tx.execute(
                "DELETE FROM musicas_tags WHERE musica_id = ? AND tag_id = (SELECT id FROM tags WHERE nome = ? COLLATE NOCASE)",
                params![id, cur],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Determine tags to add
    for f in &final_tags_trimmed {
        if !current_tags.iter().any(|c| c.eq_ignore_ascii_case(f)) {
            let tag_id = get_or_create_tag(&tx, f).map_err(|e| e.to_string())?;
            tx.execute(
                "INSERT OR IGNORE INTO musicas_tags (musica_id, tag_id) VALUES (?, ?)",
                params![id, tag_id],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn songs_delete(ids: Vec<i64>, state: State<'_, AppState>) -> Result<(), String> {
    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_mut().ok_or("Nenhum banco de dados aberto.")?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for id in ids {
        tx.execute("DELETE FROM musicas WHERE id = ?", params![id])
            .map_err(|e| format!("Failed to delete song {id}: {e}"))?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn tags_query(state: State<'_, AppState>) -> Result<Vec<TagRecord>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_ref().ok_or("Nenhum banco de dados aberto.")?;

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.nome, COUNT(mt.musica_id) \
             FROM tags t \
             LEFT JOIN musicas_tags mt ON mt.tag_id = t.id \
             GROUP BY t.id \
             ORDER BY t.nome COLLATE NOCASE",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(TagRecord {
                id: row.get(0)?,
                nome: row.get(1)?,
                count: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for item in rows {
        tags.push(item.map_err(|e| e.to_string())?);
    }
    Ok(tags)
}

#[tauri::command]
fn tags_create(names: Vec<String>, state: State<'_, AppState>) -> Result<(), String> {
    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_mut().ok_or("Nenhum banco de dados aberto.")?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for n in names {
        let trimmed = n.trim();
        if !trimmed.is_empty() {
            get_or_create_tag(&tx, trimmed).map_err(|e| e.to_string())?;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn tag_update(id: i64, name: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_mut().ok_or("Nenhum banco de dados aberto.")?;

    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.contains(',') {
        return Err("Nome da tag inválido.".to_string());
    }

    let res = conn.execute(
        "UPDATE tags SET nome = ? WHERE id = ?",
        params![trimmed, id],
    );

    match res {
        Ok(_) => Ok(()),
        Err(rusqlite::Error::SqliteFailure(_, _)) => {
            Err("Já existe uma tag com esse nome.".to_string())
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn tags_delete(ids: Vec<i64>, state: State<'_, AppState>) -> Result<(), String> {
    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let conn = db_guard.as_mut().ok_or("Nenhum banco de dados aberto.")?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for id in ids {
        tx.execute("DELETE FROM tags WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(None),
            db_path: Mutex::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            default_db_path_get,
            pick_db_file,
            db_open,
            get_active_db_path,
            query_songs,
            song_create,
            song_update,
            songs_delete,
            tags_query,
            tags_create,
            tag_update,
            tags_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
