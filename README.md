# pr-diff-action

[action.yaml](action.yaml)

GitHub Action to get the diff of a pull request.

This is a JavaScript Action port of [suzuki-shunsuke/go-pr-diff](https://github.com/suzuki-shunsuke/go-pr-diff).
It first tries the GitHub REST API, and falls back to `git` commands if the API fails (e.g. when the diff is too large).

The diff is written to a file so that large diffs are not truncated by the GitHub Actions output size limit.

## How To Use

```yaml
name: Example
on:
  pull_request: {}
permissions:
  contents: read
  pull-requests: read
jobs:
  example:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v5
      - id: diff
        uses: suzuki-shunsuke/pr-diff-action@v0
      - run: |
          echo "diff size: ${{ steps.diff.outputs.size }} bytes"
          head -n 100 "${{ steps.diff.outputs.diff_path }}"
```

## Inputs

| name                | required | default                            | description                                                                                                                                                   |
| ------------------- | -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pr_number`         | no       | `github.event.pull_request.number` | Pull Request number. When empty, the action uses the PR number from the triggering `pull_request` / `pull_request_target` event.                              |
| `repository`        | no       | `${{ github.repository }}`         | Target repository in the `owner/repo` format.                                                                                                                 |
| `github_token`      | no       | `${{ github.token }}`              | GitHub Access Token. `contents:read` and `pull-requests:read` are required.                                                                                   |
| `github_api_url`    | no       | `${{ github.api_url }}`            | GitHub API base URL. Useful for GitHub Enterprise Server.                                                                                                     |
| `output_path`       | no       | —                                  | Path to write the diff to. When empty, the action writes the diff to a temporary file under `os.tmpdir()`.                                                    |
| `working_directory` | no       | `process.cwd()`                    | Working directory for the git fallback. If the directory is a Git repository, the action fetches commits into it; otherwise a temporary directory is created. |

## Outputs

| name        | description                                        |
| ----------- | -------------------------------------------------- |
| `diff_path` | Path to the file containing the pull request diff. |
| `size`      | Size of the diff in bytes.                         |

## How It Works

1. The action calls `GET /repos/{owner}/{repo}/pulls/{number}` with `Accept: application/vnd.github.v3.diff` to get the raw diff.
2. If the API call fails, the action falls back to `git`:
   1. Fetch the base SHA, head SHA, and the base repository's clone URL via the pulls API.
   2. Compute the merge-base SHA via the compare API.
   3. `git fetch --depth 1 <base_clone_url> <merge_base>` and `<head_sha>`.
   4. `git diff <merge_base> <head_sha>` and capture stdout.

## Available versions

This action's `main` branch and feature branches don't contain the built `dist/index.js`.
Please use a release tag (e.g. `v0`).
