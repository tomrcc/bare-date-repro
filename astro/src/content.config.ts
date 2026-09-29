import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

export const collections = {
	pages: defineCollection({
		loader: glob({ pattern: "*.md", base: "./src/content/pages" }),
		schema: z.object({
			title: z.string(),
			date: z.coerce.date(),
			card: z.object({ heading: z.string(), body: z.string() }),
			event: z.object({ name: z.string(), starts: z.coerce.date() }),
		}),
	}),
	posts: defineCollection({
		loader: glob({ pattern: "*.md", base: "./src/content/posts" }),
		schema: z.object({
			title: z.string(),
			date: z.coerce.date(),
		}),
	}),
};
