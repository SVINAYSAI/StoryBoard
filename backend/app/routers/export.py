"""SRT subtitle export endpoint."""

from fastapi import APIRouter

from app.schemas.export import SRTExportRequest
from app.utils.srt import format_srt_time

router = APIRouter(prefix="/api", tags=["export"])


@router.post("/export/srt")
def export_srt(req: SRTExportRequest):
    """Generates SRT subtitle content from script segments."""
    srt_lines = []
    current_time = 0.0

    for idx, segment in enumerate(req.segments):
        text = segment.get("text", "").strip()
        if not text:
            continue

        # Estimate duration: ~2.33 words per second (140 wpm)
        word_count = len(text.split())
        duration = max(2.0, word_count / 2.33)

        start_time = current_time
        end_time = current_time + duration

        srt_lines.append(str(idx + 1))
        srt_lines.append(f"{format_srt_time(start_time)} --> {format_srt_time(end_time)}")
        srt_lines.append(text)
        srt_lines.append("")

        current_time = end_time

    return {"srt": "\n".join(srt_lines), "total_duration": current_time}
