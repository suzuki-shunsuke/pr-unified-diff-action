import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getDiff } from "./diff";

export const main = async (): Promise<void> => {
  const prNumber = resolvePRNumber();
  if (prNumber === undefined) {
    core.setFailed(
      "pr_number is required when the event is not a pull request",
    );
    return;
  }

  const repoFullName = core.getInput("repository");
  let owner = github.context.repo.owner;
  let repo = github.context.repo.repo;
  if (repoFullName) {
    const [o, r] = repoFullName.split("/");
    if (!o || !r) {
      core.setFailed("Invalid repository format. Use 'owner/repo'.");
      return;
    }
    owner = o;
    repo = r;
  }

  const token = core.getInput("github_token");
  if (!token) {
    core.setFailed("github_token is required");
    return;
  }

  const baseUrl =
    core.getInput("github_api_url") ||
    process.env.GITHUB_API_URL ||
    "https://api.github.com";

  const workingDirectory = core.getInput("working_directory") || process.cwd();

  const octokit = github.getOctokit(token, { baseUrl });

  const diff = await getDiff({
    octokit,
    owner,
    repo,
    prNumber,
    token,
    workingDirectory,
  });

  const outputPath =
    core.getInput("output_path") ||
    path.join(
      os.tmpdir(),
      `pr-unified-diff-action-${github.context.runId}-${prNumber}.diff`,
    );
  fs.writeFileSync(outputPath, diff);

  core.setOutput("diff_path", outputPath);
  core.setOutput("size", Buffer.byteLength(diff));
};

const resolvePRNumber = (): number | undefined => {
  const raw = core.getInput("pr_number");
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      throw new Error(`pr_number must be an integer: ${raw}`);
    }
    return n;
  }
  const fromEvent = github.context.payload.pull_request?.number;
  if (typeof fromEvent === "number") {
    return fromEvent;
  }
  return undefined;
};
