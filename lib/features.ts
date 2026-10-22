/**
 * Parts of the public site that can be switched off without deleting them.
 *
 * Insights, the journal: off while nothing new is being published. Off, it
 * is gone from the menu, the homepage, the project pages, the sitemap, the
 * RSS feed and the LLM texts, its pages answer 404, and its URLs are not
 * announced to search engines. The admin keeps working, so posts can be
 * written ahead of time. To bring it back, set this to true and deploy.
 */
export const INSIGHTS_ENABLED: boolean = false
