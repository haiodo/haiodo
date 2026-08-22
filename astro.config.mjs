import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";
import compress from "astro-compress";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://haiodo.github.io",
  // Slashless URLs: GitHub Pages serves /posts/x.html at /posts/x with 200, while
  // the directory layout would 301 /posts/x -> /posts/x/. External links and typed
  // URLs almost always omit the slash, so this drops a redirect hop from most hits.
  // scripts/slash-compat.mjs keeps the old /posts/x/ addresses answering 200 in the
  // build; "ignore" makes `astro dev` accept both forms too, so dev matches prod.
  // Canonical is pinned slashless in Base.astro regardless.
  trailingSlash: "ignore",
  build: { format: "file" },
  integrations: [
    mdx(),
    icon(),
    sitemap({
      serialize: (item) => {
        const isPost = /\/posts\/.+/.test(item.url);
        return {
          ...item,
          // trailingSlash: 'never' strips the slash off the bare origin too
          url: item.url === "https://haiodo.github.io" ? `${item.url}/` : item.url,
          changefreq: isPost ? "yearly" : "weekly",
          priority: isPost ? 0.8 : 0.6,
        };
      },
    }),
    compress(),
  ],
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
      config: {
        limitInputPixels: false,
      },
    },
  },
});
