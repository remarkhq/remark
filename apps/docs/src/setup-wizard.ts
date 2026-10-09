const doc = typeof document === "undefined" ? null : document;
const form = doc?.getElementById("setup-form") as HTMLFormElement | null;
const output = doc?.getElementById(
  "snippet-output",
) as HTMLTextAreaElement | null;
const copyButton = doc?.getElementById(
  "copy-snippet",
) as HTMLButtonElement | null;
const repoPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const generateSnippet = (values: {
  repository: string;
  issueTerm: string;
  theme: string;
  reactions: string;
  apiBaseUrl: string;
}): string => {
  return `<div id="remark-comments"></div>\n\n<script\n  src="https://your-remark-domain.example/widget.js"\n  data-repository="${values.repository}"\n  data-issue-term="${values.issueTerm}"\n  data-theme="${values.theme}"\n  data-reactions="${values.reactions}"\n  data-api-base-url="${values.apiBaseUrl}"\n  async></script>`;
};

if (form && output) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const repository = String(data.get("repository") ?? "").trim();
    if (!repoPattern.test(repository)) {
      output.value = "Repository must be in owner/repository format.";
      return;
    }
    const snippet = generateSnippet({
      repository,
      issueTerm: String(data.get("issueTerm") ?? "pathname"),
      theme: String(data.get("theme") ?? "auto"),
      reactions: String(data.get("reactions") ?? "true"),
      apiBaseUrl: String(
        data.get("apiBaseUrl") ?? "https://api.remark.example",
      ),
    });
    output.value = `${snippet}\n\nNever put secrets in this snippet. Ensure Issues are enabled and the Remark bot has access.`;
  });
}

if (copyButton && output) {
  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(output.value);
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1200);
  });
}

export { generateSnippet };
