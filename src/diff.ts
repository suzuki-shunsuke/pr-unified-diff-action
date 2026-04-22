import * as core from "@actions/core";
import * as github from "@actions/github";
import { buildAuthHeader, ensureRepo, runGit } from "./git";

type Octokit = ReturnType<typeof github.getOctokit>;

export interface DiffInput {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
  token: string;
  workingDirectory: string;
}

export const getDiff = async (input: DiffInput): Promise<string> => {
  try {
    return await getDiffViaAPI(input);
  } catch (apiErr) {
    core.info(
      `get diff via GitHub API failed, falling back to git: ${errMsg(apiErr)}`,
    );
    try {
      return await getDiffViaGit(input);
    } catch (gitErr) {
      throw new Error(
        `get diff via GitHub API: ${errMsg(apiErr)}\n` +
          `get diff via git fallback: ${errMsg(gitErr)}`,
      );
    }
  }
};

const getDiffViaAPI = async (input: DiffInput): Promise<string> => {
  const res = await input.octokit.rest.pulls.get({
    owner: input.owner,
    repo: input.repo,
    pull_number: input.prNumber,
    mediaType: { format: "diff" },
  });
  return res.data as unknown as string;
};

const getDiffViaGit = async (input: DiffInput): Promise<string> => {
  const pr = await input.octokit.rest.pulls.get({
    owner: input.owner,
    repo: input.repo,
    pull_number: input.prNumber,
  });
  const baseSHA = pr.data.base.sha;
  const headSHA = pr.data.head.sha;
  const cloneURL = pr.data.base.repo.clone_url;
  if (!cloneURL) {
    throw new Error("base repository clone URL is empty");
  }

  const cmp = await input.octokit.rest.repos.compareCommitsWithBasehead({
    owner: input.owner,
    repo: input.repo,
    basehead: `${baseSHA}...${headSHA}`,
  });
  const mergeBase = cmp.data.merge_base_commit.sha;

  const authHeader = buildAuthHeader(input.token);
  core.setSecret(authHeader);

  const { dir, cleanup } = await ensureRepo(input.workingDirectory);
  try {
    for (const sha of [mergeBase, headSHA]) {
      await runGit(dir, [
        "-c",
        `http.extraheader=${authHeader}`,
        "fetch",
        "--depth",
        "1",
        cloneURL,
        sha,
      ]);
    }
    return await runGit(dir, ["diff", mergeBase, headSHA]);
  } finally {
    cleanup();
  }
};

const errMsg = (err: unknown): string =>
  err instanceof Error ? err.message : JSON.stringify(err);
