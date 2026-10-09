export type DiscussionRequest = {
  repository: string;
  issueTerm: "pathname" | "url" | "title" | "og:title" | "custom";
  pathname?: string;
  url?: string;
  title?: string;
  ogTitle?: string;
  custom?: string;
  issueLabel?: string;
};
