PRAGMA foreign_keys = ON;


CREATE TABLE musicas (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    link TEXT UNIQUE
);
CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE
);
CREATE TABLE musicas_tags (
    musica_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,

    PRIMARY KEY (musica_id, tag_id),

    FOREIGN KEY (musica_id)
        REFERENCES musicas(id)
        ON DELETE CASCADE,

    FOREIGN KEY (tag_id)
        REFERENCES tags(id)
        ON DELETE CASCADE
            /* 
            Without it, deleting a music entry can leave you with rows in musicas_tags referencing it, or cause the deletion to fail depending on your FK configuration.
            */
);
