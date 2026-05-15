import type { Result } from "./common/types.ts";
import { GitHub } from "./git/github.ts";
import { Blog } from "./blog/blog.ts";
import { Mailchimp } from "./newsletter/mailchimp/mailchimp.ts";
import type { CampaignId } from "./common/newsletter.ts";
import { Claude } from "./ai/anthropic/claude.ts";
import { Telegram } from "./bot/telegram/telegram.ts";

export const run = async (): Promise<Result<void>> => {
  // 1. Collect new blog posts from GitHub commit

  const addedFilesResult = await GitHub.create().findAddedFiles();

  if (addedFilesResult.status === "error") {
    return addedFilesResult;
  }

  const {
    result: { files },
  } = addedFilesResult;

  if (files.length === 0) {
    console.info("No blog files found. Skipping.");
    return { status: "success", result: undefined };
  }

  const blogPostsResult = await Blog.create().build({ files });

  if (blogPostsResult.status === "error") {
    return blogPostsResult;
  }

  const { result: blog } = blogPostsResult;

  // 2. Generate newsletter with Claude

  const generateNewsletter = async () => {
    return await Claude.create().generateNewsletter(blog);
  };

  const generateNewsletterResult = await safeExec(generateNewsletter);

  if (generateNewsletterResult.status === "error") {
    return generateNewsletterResult;
  }

  const { result: payload } = generateNewsletterResult;

  // 3. Create newsletter draft with Mailchimp

  const createNewsletter = async (): Promise<Result<{ campaignId: CampaignId }>> => {
    return await Mailchimp.create().createDraft({ payload, blog });
  };

  const createNewsletterResult = await safeExec(createNewsletter);

  if (createNewsletterResult.status === "error") {
    return createNewsletterResult;
  }

  const {
    result: { campaignId },
  } = createNewsletterResult;

  // 4. Send approval via Telegram Bot

  const sendApproval = async (): Promise<Result<void>> => {
    return await Telegram.create().sendApproval({ payload, campaignId });
  };

  const sendApprovalResult = await safeExec(sendApproval);

  if (sendApprovalResult.status === "error") {
    return sendApprovalResult;
  }

  return { status: "success", result: undefined };
};

const safeExec = async <T>(fn: () => Promise<Result<T>>): Promise<Result<T>> => {
  try {
    return await fn();
  } catch (err: unknown) {
    return { status: "error", err };
  }
};
