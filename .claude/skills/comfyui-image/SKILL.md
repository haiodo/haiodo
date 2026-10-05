---
name: comfyui-image
description: Generate images for blog posts (hero covers, inline illustrations) with the local ComfyUI at http://127.0.0.1:8188 (Z-Image Turbo workflow). Use when asked to make, draw or generate a picture, cover, hero or illustration for a post ("сгенерируй картинку", "сделай обложку", "нарисуй hero").
---

# ComfyUI images for the blog

`gen.py` (stdlib only) loads `workflow.json`, sets prompt/size/seed, queues it on ComfyUI, waits, downloads the PNG.

```bash
python3 .claude/skills/comfyui-image/gen.py "<english prompt>" -o <path.png> [-W 1024 -H 1024] [--seed N] [--steps 8] [--negative "..."]
```

Prints `<path> seed=<N>`. One image takes about 1-2 minutes; run in background when making several.

## Workflow

1. Read the post (title, description, key idea). Find one concrete visual metaphor, not a literal illustration of the title.
2. Write the prompt in English: subject, action, setting, style, light, palette. Z-Image Turbo reads plain descriptive sentences well; no tag soup or weights.
3. Generate 2-3 variants with different seeds into the scratchpad, look at each (Read the PNG), show the user the best one or all.
4. After the user picks one, copy it into the repo and wire it up.

## Hero cover (new post or replacing one)

1. Read the whole post: title, description, headings. A draft is fine; build on the title and the main conflict.
2. Write 3 prompts with different metaphors for the post's main idea, 1024x1024 (no `-W/-H`). Run all three in parallel with `&` and `wait`; ComfyUI queues them.
3. Look at all three (a contact sheet via PIL saves tokens). Drop variants with garbled text or letters. Pick the one that fits the title best and show the user the alternatives.
4. Copy it to `src/assets/heros/heroNNN.png`, where NNN is the next free number (`ls src/assets/heros`). Never overwrite an existing hero: other posts may share it (`grep -rn "heros/" src/content`).
5. Set the frontmatter to the new file. If the post has no `hero` block, add it after `sidebar`:
   ```yaml
   hero:
     image:
       file: ../../../assets/heros/heroNNN.png
   ```
6. Run `pnpm build` to check.

## Inline images

Place an image after a full paragraph or right after a heading, never inside code, tables or JSX. Skip spots that a screenshot or diagram already covers. File: `src/assets/NNN/ill_NN.png`, where NNN is the post number. In the mdx, `import { Image } from 'astro:assets';` must be present after the frontmatter:
```mdx
import ill_NNN_01 from '../../../assets/NNN/ill_01.png';

<Image src={ill_NNN_01} alt="..." quality="max" />
```

## Style of existing heros

Semi-realistic cinematic illustration, muted warm or cold palette, people and small retro robots in an industrial or sci-fi setting, some irony. Keep text out of the image: the model garbles letters.

## Errors

- `Connection refused`: ComfyUI is not running; ask the user to start it.
- `ComfyUI error: ...`: usually a missing model (`z_image_turbo_bf16.safetensors`, `qwen_3_4b.safetensors`, `ae.safetensors`); report the message as is.
- Changed workflow: re-export it from ComfyUI via "Export (API)" over `workflow.json`. The script expects node ids 67 (prompt), 68 (size), 70 (KSampler), 71 (negative), 9 (SaveImage); update `gen.py` if they change.
