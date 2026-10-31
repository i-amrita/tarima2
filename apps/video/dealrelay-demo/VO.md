# DealRelay demo video — voiceover script (v3)

Voice: cloned from `/Users/josocjoq/Downloads/intro.mp4` via pocket-tts
(`pocket-tts export-voice` seed at `assets/audio/voice-seed.safetensors`, gitignored).
Each segment is generated separately and pinned to its frame start, so picture
cuts stay authoritative. Slight spill past a frame end is acceptable; captions
are word-timed, not frame-timed.

Speaking rate of the seed voice: ~2.3 words/sec. Total ~166 words ≈ 72s speech
across the 77s cut.

| id | frame | start (s) | text | words | approx seconds |
|----|-------|-----------|------|-------|----------------|
| f01 | 01-problem | 0 | Booking a venue takes days of email. Quotes arrive scattered with different terms, and someone chases them all. | 18 | ~7.8 |
| f02 | 02-name | 8 | DealRelay. Agents negotiate. Humans decide. | 5 | ~2.2 |
| f03 | 03-demo-constraints | 11 | One intake for the Northwind Product Launch. Five hundred guests, thirty thousand dollar cap, two a.m. curfew. | 17 | ~7.4 |
| f04 | 04-demo-proposals | 19 | Two venues answer, and the room goes to work. Scout reads The Grand Loft and Warehouse 9. Finance checks budget and curfew, and flags every violation. | 26 | ~11.3 |
| f05 | 05-demo-agents | 31 | Then Negotiator drafts the counter. Twenty-seven thousand, if the curfew moves to one-thirty. Every step is traced, so you can see exactly why each agent said what it said. | 29 | ~12.6 |
| f06 | 06-demo-approval | 45 | But nothing closes without a human. That's the deal breaker. The client reviews, approves, and the vendor accepts. No follow-up emails, no Friday scramble, no lost threads. | 27 | ~11.7 |
| f07 | 07-roi | 59 | Four days of email, collapsed into forty-six seconds. Three agents. One approval. One room, one thread, zero chasing. | 18 | ~7.8 |
| f08 | 08-architecture | 67 | How is it built? Terse AI's durable actors hold the state. | 11 | ~4.8 |
| f08b | 08-architecture | 70 | Agent Relay coordinates. The UI mirrors. | 6 | ~2.6 |
| f09 | 09-cta | 73 | It's open source. Find it on GitHub. | 7 | ~3.0 |

Regenerate:

```bash
cd apps/video/dealrelay-demo
while IFS='|' read -r id text; do
  [ -z "$id" ] && continue
  pocket-tts generate --text "$text" \
    --voice assets/audio/voice-seed.safetensors \
    --output-path "assets/audio/vo/$id.wav" \
    --language english_2026-10 -q
done < <(tail -n +13 VO.md | grep '^| f' | awk -F'|' '{gsub(/^ +| +$/,"",$2); gsub(/^ +| +$/,"",$5); print $2"|"$5}')
```

Word-level caption timing: `hyperframes transcribe assets/audio/vo/fXX.wav`,
then offset each segment's words by its frame start (see index.html caption track).

Note: the awk above reads the id from column 2 and the spoken text from column 4
(field 5 after the leading pipe). The two trailing columns are metadata for
human review only.

## Arc

- Problem (f01): the pain is human and specific, "someone chases them all", which sets up the promise.
- Promise (f02): three short clauses, "Agents negotiate. Humans decide." The whole product thesis in five words.
- Reveal (f03 to f04): intake first, then "Two venues answer, and the room goes to work" hands the frame to the agents.
- Turn (f06): "But nothing closes without a human. That's the deal breaker." The tension pivot from automation to accountability.
- Payoff (f07): the same four-days-versus-forty-six-seconds claim the UI supports, restated as a tally.
- Build (f08 to f08b): a question hook, "How is it built?", then one clause per layer: actors hold state, Relay coordinates, the UI mirrors.
- Ask (f09): short, open source, GitHub.

## What changed and why

- Cut the read-out: the old script described what was on screen ("The agency sets the specs once", "Negotiator drafts the counter"). The new one keeps the facts but frames each beat as a story move.
- Replaced the flat spec listing with "One intake for the Northwind Product Launch", so the constraints carry the event instead of floating as numbers.
- Named the venues (The Grand Loft, Warehouse 9) so the reveal lands on something concrete, not "two venue proposals".
- Added the human turn explicitly with "But nothing closes without a human. That's the deal breaker." That is the hook the old cut was missing.
- Added the build story in frame 08 as two short segments: Terse AI durable actors hold the state, Agent Relay coordinates the agents, the UI mirrors the room over a socket. Factual to the repo, no buzzwords.
- Trimmed the CTA to one line and kept the same repo claim, so the ending is an ask rather than a summary.
