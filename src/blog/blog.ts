import type { Result } from "../common/types.ts";
import {
  assertNotEmptyString,
  NotEmptyStringSchema,
  sanitizeEmptyString,
} from "../common/asserts.ts";
import { extname, join } from "node:path";
import { envRepoRoot } from "../env.ts";
import type { RelativePath } from "../common/files.ts";
import type { Blog as BlogType, BlogPost, BlogPosts } from "../common/blog.ts";

export class Blog {
  readonly #metadata: Omit<BlogType, "posts">;

  private constructor({
    author,
    audience = "developer",
  }: Pick<BlogType, "author"> & Partial<Pick<BlogType, "audience">>) {
    this.#metadata = { author, audience };
  }

  static create(): Blog {
    const { BLOG_AUTHOR, BLOG_AUDIENCE } = process.env;

    assertNotEmptyString(BLOG_AUTHOR, "BLOG_AUTHOR");

    return new this({ author: BLOG_AUTHOR, audience: sanitizeEmptyString(BLOG_AUDIENCE) });
  }

  async build(params: { files: RelativePath[] }): Promise<Result<BlogType>> {
    const result = await this.#collect(params);

    if (result.status === "error") {
      return result;
    }

    const { result: posts } = result;

    return {
      status: "success",
      result: {
        ...this.#metadata,
        posts,
      },
    };
  }

  async #collect(params: { files: RelativePath[] }): Promise<Result<BlogPosts>> {
    const result = await this.#findLatestBlogPosts(params);

    if (result.status === "error") {
      return result;
    }

    const {
      result: { relativePaths },
    } = result;

    const repoRoot = envRepoRoot();

    const buildBlogPost = async (relativePath: RelativePath): Promise<BlogPost> => {
      const file = Bun.file(join(repoRoot, relativePath));
      const content = await file.text();

      return {
        relativePath,
        content,
      };
    };

    try {
      return { status: "success", result: await Promise.all(relativePaths.map(buildBlogPost)) };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  }

  async #findLatestBlogPosts({
    files,
  }: {
    files: RelativePath[];
  }): Promise<Result<{ relativePaths: RelativePath[] }>> {
    const { BLOG_POSTS_PATH } = process.env;

    const blogPathParsed = NotEmptyStringSchema.safeParse(BLOG_POSTS_PATH);

    if (!blogPathParsed.success) {
      return { status: "error", err: blogPathParsed.error };
    }

    const { data: blogRelativePath } = blogPathParsed;

    const mdFiles = files.filter(
      (entry) => entry.includes(blogRelativePath) && extname(entry) === ".md",
    );

    return { status: "success", result: { relativePaths: mdFiles } };
  }
}
