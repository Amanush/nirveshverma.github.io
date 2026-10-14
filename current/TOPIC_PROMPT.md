# How to ask Claude for a new topic

Paste this into a chat with Claude, attach `topics/_template.json`, and replace the topic name.

---

**Prompt**

> Using the attached `_template.json`, create a complete GK Turbo topic file for: **Narmada River**.
>
> Rules:
> 1. Output **only valid JSON** (one code block). Keep `"schema": "gkturbo.topic/1"` and every key name exactly as in the template. `id` must be lowercase letters, digits and hyphens.
> 2. Language: **English / Hindi / Hinglish** (set `"language"` to `en`, `hi` or `hinglish` and write all text in it).
> 3. Slide order: title → overview → facts → (map or timeline or compare, only if useful) → memory trick → 4 to 8 quiz slides → summary. Delete slide types that do not fit the topic.
> 4. Keep each text short (about 25 words or fewer) so it fits on a recorded slide.
> 5. **Quiz statements must be one sentence with a `____` blank**, so that the correct option completes it as a single true statement. Example: "The Narmada rises at ____." Give 4 options, `answer` is the 0-based index of the correct one.
> 6. For each quiz give 2 to 3 short `explain` bullets and a `trick` (mnemonic) when one is genuinely useful.
> 7. Only add a `pyq` entry when you are certain of the exam and year. Otherwise use `"pyq": []`. Never invent exam references.
> 8. Only state facts you are confident about. If unsure, leave the fact out and tell me after the JSON.
> 9. Do not add image or audio paths. I will add them in the app.

---

## What you do with the result

1. Save the JSON as `topics/<id>.json`.
2. Either open the app and press **Import JSON**, or add `{"id":"<id>","file":"<id>.json"}` to `topics/index.json` so it appears in the sidebar for everyone (needed on GitHub Pages).
3. Press **Edit** to fix wording, add images, record narration, then **Save changes**.

If the app says the file is not valid, paste the message back to Claude and ask it to fix the JSON.
