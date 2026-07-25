import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Keep original filename casing so existing URLs (/posts/009_LeaveHuly) stay valid.
const keepCase = ({ entry }: { entry: string }) => entry.replace(/\.mdx?$/, '');

// Replaces Starlight's docsSchema(); keeps the frontmatter already used in posts.
// image() resolves paths relative to the entry file and optimises at build time.
const entry = ({ image }: { image: () => z.ZodType }) => z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  template: z.string().optional(),
  hero: z
    .object({
      tagline: z.string().optional(),
      image: z.object({ file: image() }).optional(),
    })
    .optional(),
  sidebar: z
    .object({
      label: z.string().optional(),
      order: z.number().optional(),
      badge: z
        .union([
          z.string(),
          z.object({ text: z.string(), variant: z.string().optional() }),
        ])
        .optional(),
    })
    .optional(),
});

export const collections = {
  posts: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs/posts', generateId: keepCase }),
    schema: entry,
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs/projects', generateId: keepCase }),
    schema: entry,
  }),
};
