use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Resolve tags passadas como nomes ou IDs, criando novas quando necessário
pub fn resolve_tags(
    conn: &rusqlite::Connection,
    tag_names: Option<&[String]>,
    tag_ids: Option<&[i64]>,
) -> Vec<crate::models::TagRef> {
    let mut result = Vec::new();

    // 1. Resolver por IDs diretos
    if let Some(ids) = tag_ids {
        for &id in ids {
            let mut stmt = match conn.prepare("SELECT id, name, color FROM tags WHERE id = ?1 LIMIT 1") {
                Ok(s) => s,
                Err(_) => continue,
            };
            if let Ok(mut rows) = stmt.query(params![id]) {
                if let Ok(Some(row)) = rows.next() {
                    if let (Ok(tid), Ok(name), Ok(color)) = (
                        row.get::<_, i64>(0),
                        row.get::<_, String>(1),
                        row.get::<_, String>(2),
                    ) {
                        result.push(crate::models::TagRef { id: tid, name, color });
                    }
                }
            }
        }
    }

    // 2. Resolver por nomes (buscando ou inserindo com cor padrão)
    if let Some(names) = tag_names {
        let now = now_secs();
        for raw_name in names {
            let name = raw_name.trim();
            if name.is_empty() {
                continue;
            }
            if result.iter().any(|t| t.name.eq_ignore_ascii_case(name)) {
                continue;
            }

            let mut stmt = match conn.prepare("SELECT id, name, color FROM tags WHERE LOWER(name) = LOWER(?1) LIMIT 1") {
                Ok(s) => s,
                Err(_) => continue,
            };
            let existing = stmt.query_row(params![name], |row| {
                Ok(crate::models::TagRef {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                })
            });

            match existing {
                Ok(t) => result.push(t),
                Err(_) => {
                    let default_color = crate::models::tag::default_tag_color();
                    let inserted = conn.execute(
                        "INSERT INTO tags (name, color, created_at) VALUES (?1, ?2, ?3)",
                        params![name, default_color, now],
                    );
                    if inserted.is_ok() {
                        let new_id = conn.last_insert_rowid();
                        result.push(crate::models::TagRef {
                            id: new_id,
                            name: name.to_string(),
                            color: default_color,
                        });
                    }
                }
            }
        }
    }

    result
}
