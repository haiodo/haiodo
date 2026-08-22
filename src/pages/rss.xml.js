import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = (await getCollection("posts"))
    .filter((entry) => entry.id !== "overview")
    .sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0));

  return rss({
    title: "haiodo.blog",
    description: "Андрей Соболев - про инженерию, ИИ и то, что под капотом",
    site: context.site,
    trailingSlash: false,
    items: posts.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.date,
      link: `/posts/${entry.id}`,
      author: "haiodo@gmail.com (Андрей Соболев)",
    })),
    customData: "<language>ru-RU</language>",
  });
}
