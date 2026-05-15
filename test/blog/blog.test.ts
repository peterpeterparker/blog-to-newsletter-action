import { describe, expect, it, beforeEach } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ZodError } from "zod";
import { Blog } from "../../src/blog/blog.ts";

const TEST_DIR = join(process.cwd(), "__fixtures__", "blog");

describe("Blog", () => {
  beforeEach(() => {
    process.env.BLOG_AUTHOR = "David Dal Busco";
  });

  describe("build", () => {
    it("should throw if BLOG_AUTHOR is not set", () => {
      delete process.env.BLOG_AUTHOR;
      expect(() => Blog.create()).toThrow();
    });

    it("should return error if BLOG_POSTS_PATH is not set", async () => {
      delete process.env.BLOG_POSTS_PATH;

      const result = await Blog.create().build({ files: [] });

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(ZodError);
    });

    it("should return error if BLOG_POSTS_PATH is empty string", async () => {
      process.env.BLOG_POSTS_PATH = "";

      const result = await Blog.create().build({ files: [] });

      expect(result.status).toBe("error");

      if (result.status !== "error") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.err).toBeInstanceOf(ZodError);
    });

    it("should return empty posts if no .md files match blog path", async () => {
      const result = await Blog.create().build({
        files: ["src/lib/utils.ts", "__fixtures__/blog/notes.txt"],
      });

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.posts).toHaveLength(0);
      expect(result.result.author).toBe("David Dal Busco");
    });

    it("should return blog post with content", async () => {
      await writeFile(join(TEST_DIR, "hello-world.md"), "# Hello World");

      const result = await Blog.create().build({
        files: ["__fixtures__/blog/hello-world.md"],
      });

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.posts).toHaveLength(1);
      expect(result.result.posts[0]?.relativePath).toContain("hello-world.md");
      expect(result.result.posts[0]?.content).toBe("# Hello World");
    });

    it("should return multiple blog posts", async () => {
      await writeFile(join(TEST_DIR, "post-one.md"), "# Post One");
      await writeFile(join(TEST_DIR, "post-two.md"), "# Post Two");

      const result = await Blog.create().build({
        files: ["__fixtures__/blog/post-one.md", "__fixtures__/blog/post-two.md"],
      });

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.posts).toHaveLength(2);
    });

    it("should use default audience if BLOG_AUDIENCE is not set", async () => {
      const result = await Blog.create().build({ files: [] });

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.audience).toBe("developer");
    });

    it("should use custom audience if BLOG_AUDIENCE is set", async () => {
      process.env.BLOG_AUDIENCE = "designer";

      const result = await Blog.create().build({ files: [] });

      delete process.env.BLOG_AUDIENCE;

      expect(result.status).toBe("success");

      if (result.status !== "success") {
        expect(true).toBeFalsy();
        return;
      }

      expect(result.result.audience).toBe("designer");
    });
  });
});
