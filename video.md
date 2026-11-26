# Encarta Reborn: demo video script (about 3 minutes)

Each section has an **ON SCREEN** cue and the **SAY** lines to read aloud.

---

## 1. Hook (0:00–0:15)
**ON SCREEN:** The "insert disc" boot screen. Let it sit for a moment.

**SAY:**
"Remember Encarta? The CD-ROM encyclopedia. You put in a disc, you wandered, you learned. No feed, no algorithm, no one trying to keep you scrolling. For Kiroween I brought it back. This is Encarta Reborn: the encyclopedia that doesn't scroll back."

---

## 2. The problem (0:15–0:35)
**ON SCREEN:** Boot screen finishing, then the Explore view loading.

**SAY:**
"Today most of us learn about the world through feeds built to maximize engagement. Encarta Reborn is the opposite. It's bounded, calm, and entirely yours. It follows seven rules I call the anti-feed manifesto. I'll show them as we go."

---

## 3. Explore (0:35–1:05)
**ON SCREEN:** The 3D globe. Drag to rotate, zoom, hover over a place to show its label. Then click the 3D globe / flat map toggle.

**SAY:**
"This is the Explore view. It's a 3D globe drawn from bundled Natural Earth data. Notice it never moves on its own. There's no auto-rotation and nothing is trying to grab your attention. You steer. If your device can't do WebGL, there's a flat map fallback. Both come with the full place list and button controls, so it works with a keyboard and a screen reader."

**ON SCREEN:** Press the Spin button.

**SAY:**
"If you just want to be surprised, Spin picks a random place. It's truly random. It isn't a recommendation."

---

## 4. Article (1:05–1:40)
**ON SCREEN:** An article opens, for example Machu Picchu or the Taj Mahal. Slowly point at the summary, the facts, the image, then the citations.

**SAY:**
"Here's an article. Every summary, every fact, and every image carries a visible citation with its source and license. That includes Wikipedia, UNESCO, and Wikimedia Commons. This is enforced in code. A component called SourceGate refuses to render anything that doesn't have a valid source. And look at what's missing: no likes, no view counts, no comments, no trending."

---

## 5. Trails (1:40–2:00)
**ON SCREEN:** The trails rail at the bottom of the article. Click one, then use Back.

**SAY:**
"At the bottom are three to five curiosity trails. They're derived from a knowledge graph of shared geography, categories, and topics. The function that builds them has no parameter for engagement or personalization, so there's nowhere to plug in a 'keep them hooked' signal. Follow one, or go back. It's your call."

---

## 6. Expedition log and offline (2:00–2:25)
**ON SCREEN:** Open the Expedition log. Show visited places and type a note. Then turn off Wi-Fi (or use DevTools offline) and reload.

**SAY:**
"Everywhere you've been lands in your expedition log, along with your own notes. It's all stored on your device. There are no accounts and no tracking. And because it's an installable PWA with a bundled snapshot of 100 places, it works with no internet at all, like a disc."

---

## 7. Built with Kiro (2:25–2:55)
**ON SCREEN:** Quick cuts in the editor: `.kiro/specs`, `.kiro/steering`, `.kiro/agents/source-curator.md`, `.kiro/hooks`, `scripts/mcp/server.ts`.

**SAY:**
"I built this entirely with Kiro, and I used it to enforce the product's values, not just to write code. A **spec** drove the work, with requirements, design, and 13 test-backed tasks. **Steering** files kept the anti-feed manifesto in every generation. A custom **source-curator agent** wrote all 100 places and refuses to output anything it can't cite. A blocking **pre-write hook** rejects any change that leaves a fact or image unsourced. And when parallel agents got rate-limited by Wikimedia, I built a custom **MCP server** that backs off and checks each image's real license."

---

## 8. Close (2:55–3:10)
**ON SCREEN:** Back to the globe, or the title card.

**SAY:**
"Encarta Reborn is a dead technology resurrected, with a better interaction model than the thing that replaced it. Slow, sourced, offline, and yours. Thanks for watching."

---

## Tips
- Record the screen first, then read the script over it. Pausing on the citations in section 4 helps the most.
- If you run long, cut the flat-map toggle in section 3 and the MCP sentence in section 7.
- Before recording, check that the place you use for the article has a loaded image.
