# DealRelay demo video — voiceover script (v2)

Voice: cloned from `/Users/josocjoq/Downloads/intro.mp4` via pocket-tts
(`pocket-tts export-voice` seed at `assets/audio/voice-seed.safetensors`, gitignored).
Each segment is generated separately and pinned to its frame start, so picture
cuts stay authoritative. Slight spill past a frame end is acceptable; captions
are word-timed, not frame-timed.

Speaking rate of the seed voice: ~2.3 words/sec. Total ~168 words ≈ 70s speech
across the 77s cut.

| id | frame | start (s) | text |
|----|-------|-----------|------|
| f01 | 01-problem | 0 | Booking a venue shouldn't take a week. But quotes arrive as scattered emails, each with different terms. |
| f02 | 02-name | 8 | DealRelay. Agents and humans. One deal room. |
| f03 | 03-demo-constraints | 11 | The agency sets the specs once. Five hundred guests, a thirty thousand dollar budget, a two a.m. curfew. |
| f04 | 04-demo-proposals | 19 | Two venue proposals arrive, and the agents take it from there. Scout reads each proposal. Finance checks it against budget and curfew, and flags every violation. |
| f05 | 05-demo-agents | 31 | Negotiator drafts the counter: twenty-seven thousand, if the curfew moves to one-thirty. Every step is traced, so nothing is a black box. |
| f06 | 06-demo-approval | 45 | Nothing closes without a human. The client reviews, approves, and the vendor accepts. No follow-up emails. No lost threads. |
| f07 | 07-roi | 59 | Four days of email, collapsed into forty-six seconds. Three agents. One approval. Zero lost threads. |
| f08 | 08-architecture | 67 | Durable actors hold the state. Agent Relay coordinates. The UI just mirrors the room. |
| f09 | 09-cta | 73 | Open source. Find it on GitHub. |

Regenerate:

```bash
cd apps/video/dealrelay-demo
while IFS='|' read -r id text; do
  [ -z "$id" ] && continue
  pocket-tts generate --text "$text" \
    --voice assets/audio/voice-seed.safetensors \
    --output-path "assets/audio/vo/$id.wav" \
    --language english_2026-10 -q
done < <(tail -n +12 VO.md | grep '^| f' | awk -F'|' '{gsub(/^ +| +$/,"",$2); gsub(/^ +| +$/,"",$3); print $2"|"$3}')
```

Word-level caption timing: `hyperframes transcribe assets/audio/vo/fXX.wav`,
then offset each segment's words by its frame start (see index.html caption track).
