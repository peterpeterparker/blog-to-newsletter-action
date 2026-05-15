import type { Factory } from "../common/types.ts";
import type { NewsletterPayload } from "../common/newsletter.ts";
import type { Result } from "../common/types.ts";
import type { Blog } from "../common/blog.ts";

interface AI {
  generateNewsletter(blog: Blog): Promise<Result<NewsletterPayload>>;
}

export function AIProvider(_constructor: Factory<AI>) {}
