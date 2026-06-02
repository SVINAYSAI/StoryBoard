/**
 * SRT subtitle parsing and formatting utilities.
 * Extracted from StoryboardVisualizer.jsx for reuse.
 */

/**
 * Parses SRT subtitle text into an array of segment objects.
 */
export function parseSRT(srtText) {
  const segments = [];
  const normalized = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');
  let idCounter = 1;

  const parseTimestampToSeconds = (ts) => {
    const cleaned = ts.trim().replace('.', ',');
    const parts = cleaned.split(':');
    if (parts.length !== 3) return 0;
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;

    const secParts = parts[2].split(',');
    const seconds = parseInt(secParts[0], 10) || 0;
    const ms = parseInt(secParts[1], 10) || 0;

    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
  };

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    const lines = block.split('\n');
    if (lines.length < 2) continue;

    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join(' ').trim();

    if (!text) continue;

    const [startStr, endStr] = timeLine.split('-->');
    if (!startStr || !endStr) continue;

    const startSec = parseTimestampToSeconds(startStr);
    const endSec = parseTimestampToSeconds(endStr);
    const duration = Math.max(1, Math.round((endSec - startSec) * 10) / 10);

    segments.push({
      id: idCounter,
      section: `Scene ${idCounter}`,
      text: text,
      duration: duration,
      visual_cue: `Subtitle scene showing: ${text.substring(0, 30)}...`,
      emotion_tag: 'none',
    });
    idCounter++;
  }

  return segments;
}

/**
 * Formats an array of segment objects back into SRT subtitle text.
 */
export function formatSegmentsToSRT(segments) {
  if (!segments || segments.length === 0) return '';

  return segments.map((seg, idx) => {
    const startSec = segments.slice(0, idx).reduce(
      (acc, s) => acc + (parseFloat(s.duration) || 3.0), 0.0
    );
    const endSec = startSec + (parseFloat(seg.duration) || 3.0);

    const formatSecToTimestamp = (sec) => {
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const secs = Math.floor(sec % 60);
      const ms = Math.round((sec % 1) * 1000);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };

    return `${idx + 1}\n${formatSecToTimestamp(startSec)} --> ${formatSecToTimestamp(endSec)}\n${seg.text}\n`;
  }).join('\n');
}
