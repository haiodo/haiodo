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

## Where images go

- Hero cover: `src/assets/heros/heroNNN.png` (next free number), 1024x1024 or 1024x768. Frontmatter:
  ```yaml
  hero:
    image:
      file: ../../../assets/heros/heroNNN.png
  ```
- Inline image: `src/assets/NNN/<name>.png` where NNN is the post number, then in the mdx:
  ```mdx
  import img001 from '../../../assets/NNN/<name>.png';
  <Image src={img001} alt="..." inferSize quality="max" />
  ```

## Style of existing heros

Semi-realistic cinematic illustration, muted warm or cold palette, people and small retro robots in an industrial or sci-fi setting, some irony. Keep text out of the image: the model garbles letters.

## Errors

- `Connection refused`: ComfyUI is not running; ask the user to start it.
- `ComfyUI error: ...`: usually a missing model (`z_image_turbo_bf16.safetensors`, `qwen_3_4b.safetensors`, `ae.safetensors`); report the message as is.
- Changed workflow: re-export it from ComfyUI via "Export (API)" over `workflow.json`. The script expects node ids 67 (prompt), 68 (size), 70 (KSampler), 71 (negative), 9 (SaveImage); update `gen.py` if they change.
