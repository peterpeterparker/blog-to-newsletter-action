import type { Factory, Result } from "../common/types.ts";
import type { CampaignId, NewsletterPayload } from "../common/newsletter.ts";
import type { Blog } from "../common/blog.ts";

interface Newsletter {
  createDraft(params: {
    payload: NewsletterPayload;
    blog: Pick<Blog, "author">;
  }): Promise<Result<{ campaignId: CampaignId }>>;
}

export function NewsletterProvider(_constructor: Factory<Newsletter>) {}
