import { z } from "zod";

export const BlogPostSchema = z.strictObject({
  relativePath: z.string(),
  content: z.string(),
});

export const BlogPostsSchema = z.array(BlogPostSchema);

export type BlogPost = z.infer<typeof BlogPostSchema>;
export type BlogPosts = z.infer<typeof BlogPostsSchema>;

export const BlogSchema = z.strictObject({
  author: z.string(),
  audience: z.string(),
  posts: BlogPostsSchema,
});

export type Blog = z.infer<typeof BlogSchema>;
