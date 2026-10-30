---
name: comfyui-image
description: Generate images for blog posts (hero covers, inline illustrations) with the local ComfyUI at http://127.0.0.1:8188 (Z-Image Turbo workflow). Use when asked to make, draw or generate a picture, cover, hero or illustration for a post ("сгенерируй картинку", "сделай обложку", "нарисуй hero").
---

# ComfyUI images for the blog

Use this skill from any agent with shell access, file access, and an image viewer. It does not require a particular agent SDK, tool name, or session variable.

The shared source is `skills/comfyui-image`. The `.claude/skills/comfyui-image` and `.agents/skills/comfyui-image` entries point to it; agents without skill discovery can open the shared `SKILL.md` directly.

Requires Python 3 and a reachable ComfyUI with the models used by the adjacent `workflow.json`: `z_image_turbo_bf16.safetensors`, `qwen_3_4b.safetensors`, and `ae.safetensors`. No Python packages are required.

Set `SKILL_DIR` to the absolute directory containing the `SKILL.md` actually discovered by the agent. Resolve a skill-directory symlink to its target. Keep `gen.py` and `workflow.json` together; the script loads the workflow beside itself, independently of the current working directory.

```bash
python3 "$SKILL_DIR/gen.py" "<english prompt>" -o /absolute/path/image.png
```

Optional arguments: `-W 1024 -H 1024`, `--seed N`, `--steps 8`, `--negative "..."`, `--host http://127.0.0.1:8188`, and `--timeout 600`. Width and height default to 1024; timeout is the generation wait limit in seconds. Use absolute output paths when running outside the repository.

`gen.py` queues the workflow, waits, downloads the PNG, and prints `<path> seed=<N>`. One image takes about 1-2 minutes. ComfyUI processes its queue sequentially; parallel submissions do not make generation faster.

## Workflow

1. Read the post (title, description, key idea). Find one concrete visual metaphor, not a literal illustration of the title.
2. Write the prompt in English: subject, action, setting, style, light, palette. Z-Image Turbo reads plain descriptive sentences well; no tag soup or weights.
3. Generate 1-3 images into a temporary directory, according to the task. Start with one unless alternatives are requested or needed; avoid unnecessary queued jobs.
4. Inspect each image with an available image viewer. Reject garbled text, visual defects, or a poor fit to the post.
5. If the user requested finished images for a post, choose the best image and integrate it. If the user requested alternatives, show them for selection.

## Hero cover (new post or replacing one)

1. Read the whole post: title, description, headings. A draft is fine; build on the title and the main conflict.
2. Generate 1-3 candidates at 1024x1024 (the default), using different metaphors or seeds only when useful.
3. Inspect the candidates and select or present them according to the workflow above.
4. Copy the chosen image to `src/assets/heros/heroNNN.png`, where NNN is the next free number. Never overwrite an existing hero: other posts may share it. Inspect `src/assets/heros` and search `src/content` for `heros/` references before choosing the destination.
5. Set the frontmatter to the new file. If the post has no `hero` block, add it after `sidebar`:
   ```yaml
   hero:
     image:
       file: ../../../assets/heros/heroNNN.png
   ```
6. Run `pnpm build` from the repository root to check.

## Inline images

Place an image after a full paragraph or right after a heading, never inside code, tables or JSX. Skip spots that a screenshot or diagram already covers. File: `src/assets/NNN/ill_NN.png`, where NNN is the post number. In the mdx, `import { Image } from 'astro:assets';` must be present after the frontmatter:
```mdx
import ill_NNN_01 from '../../../assets/NNN/ill_01.png';

<Image src={ill_NNN_01} alt="..." quality="max" />
```

Use a free filename and descriptive alt text. Run `pnpm build` from the repository root after integration.

## Style of existing heros

Semi-realistic cinematic illustration, muted warm or cold palette, people and small retro robots in an industrial or sci-fi setting, some irony. Keep text out of the image: the model garbles letters.

## Errors

- `Connection refused`: ComfyUI is not running; ask the user to start it.
- `ComfyUI error: ...`: usually a missing model (`z_image_turbo_bf16.safetensors`, `qwen_3_4b.safetensors`, `ae.safetensors`); report the message as is.
- `timeout waiting for prompt ...`: report the timeout. The queued job may still run; check its status before resubmitting.
- Report failures without silently switching to another image provider.
- Changed workflow: re-export it from ComfyUI via "Export (API)" over `workflow.json`. The script expects node ids 67 (prompt), 68 (size), 70 (KSampler), 71 (negative), 9 (SaveImage); update `gen.py` if they change.
