export interface Song {
    id:   number;
    name: string;
    tags: string[];
    link: string | null;
}

export interface Tag {
    id:    number;
    name:  string;
    count: number;
}

export interface Song_Query_Result {
    songs:       Song[];
    total_count: number;
}

export interface Search_Filter {
    free_text:           string;
    included_tag_groups: string[][];
    excluded_tags:       string[];
}


export interface Movie {
    id:     number;
    name:   string;
    score:  string;
    date:   string;
    review: string;
    // link:   string | null;
    // tags:   string[];
}
