import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import icon from "astro-icon";

export default defineConfig({
  site: "https://haiodo.github.io",
  integrations: [
    starlight({
      customCss: ["./src/styles.css"],
      title: "Андрей Соболев Блог (haiodo)",
      defaultLocale: "ru",
      tableOfContents: true,

      // locales: {
      //   // Документация на русском в `src/content/docs/ru/`
      //   ru: {
      //     label: "Русский",
      //   },
      //   // Документация на английском в `src/content/docs/en/`
      //   en: {
      //     label: "English",
      //     lang: "en",
      //   },
      // },
      favicon: "/favicon.ico",
      components: {
        // override default 'SocialIcons' component
        SocialIcons: "./src/components/CustomSocialIcons.astro",
      },
      sidebar: [
        {
          label: "Блог",
          translations: {
            en: "Blog",
          },
          collapsed: false,
          items: [
            {
              label: "Заметки по дням",
              translations: {
                en: "Daily activities",
              },
              collapsed: true,
              autogenerate: { directory: "daily" },
            },
            {
              label: "Статьи",
              translations: {
                en: "Posts",
              },
              autogenerate: { directory: "posts" },
            },
          ],
        },
        {
          label: "Мои проекты",
          translations: {
            en: "Projects",
          },
          autogenerate: { directory: "projects" },
        },
      ],
    }),
    ,
    icon(),
  ],
  image: {
    service: {
      config: {
        limitInputPixels: false,
      },
    },
  },
});
