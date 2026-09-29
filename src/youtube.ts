/**
 * Extracts a YouTube video ID from a URL string (supports youtube.com and youtu.be).
 */
export function extract_youtube_video_id(
    url: string | null | undefined,
    ): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    try {
        const formatted_url = trimmed.includes("://")
            ? trimmed
            : `https://${trimmed}`;
        const parsed = new URL(formatted_url);
        const host = parsed.hostname.toLowerCase();

        if (
            host === "youtube.com" ||
            host === "www.youtube.com" ||
            host === "m.youtube.com"
            ) {
            const v = parsed.searchParams.get("v");
            return v && v.length > 0 ? v : null;
        }

        if (host === "youtu.be") {
            const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
            return id && id.length > 0 ? id : null;
        }
    } catch {
        return null;
    }

    return null;
}

/**
 * Builds a multi-video YouTube watch playlist URL from an array of video IDs.
 */
export function build_youtube_playlist_url(video_ids: string[]): string | null {
    const valid_ids = video_ids.map((id) => id.trim()).filter(Boolean);
    if (valid_ids.length === 0) return null;
    return `https://www.youtube.com/watch_videos?video_ids=${valid_ids.join(",")}`;
}
