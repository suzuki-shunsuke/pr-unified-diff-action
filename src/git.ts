import * as exec from "@actions/exec";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface EnsuredRepo {
  dir: string;
  cleanup: () => void;
}

export const isGitRepo = async (cwd: string): Promise<boolean> => {
  const out = await exec.getExecOutput("git", ["rev-parse", "--git-dir"], {
    cwd,
    silent: true,
    ignoreReturnCode: true,
  });
  return out.exitCode === 0;
};

export const ensureRepo = async (cwd: string): Promise<EnsuredRepo> => {
  if (await isGitRepo(cwd)) {
    return { dir: cwd, cleanup: () => {} };
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-diff-action-"));
  try {
    await runGit(dir, ["init"]);
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
};

export const runGit = async (cwd: string, args: string[]): Promise<string> => {
  const out = await exec.getExecOutput("git", args, {
    cwd,
    silent: true,
    ignoreReturnCode: true,
  });
  if (out.exitCode !== 0) {
    throw new Error(
      `git ${args.join(" ")}: exit ${out.exitCode}: ${out.stderr.trim()}`,
    );
  }
  return out.stdout;
};

export const buildAuthHeader = (token: string): string => {
  const encoded = Buffer.from(`x-access-token:${token}`).toString("base64");
  return `AUTHORIZATION: basic ${encoded}`;
};
