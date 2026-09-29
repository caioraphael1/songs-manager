export interface Song {
    id:   number;
    nome: string;
    tags: string;
    link: string | null;
}

export interface Song_Query_Result {
    songs:       Song[];
    total_count: number;
}

export interface Tag {
    id:    number;
    nome:  string;
    count: number;
}

export interface Search_Filter {
    free_text:           string;
    included_tag_groups: string[][];
    excluded_tags:       string[];
}
