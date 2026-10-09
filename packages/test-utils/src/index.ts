export const githubIssueFixture = () => ({
  number: 1,
  title: "Discussion: /docs/page",
  body: "Page identifier: /docs/page",
  locked: false,
  state: "open" as const,
  comments: 0,
  html_url: "https://github.com/owner/repo/issues/1",
});
