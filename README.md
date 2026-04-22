# pr-diff-action

[action.yaml](action.yaml)

GitHub Action to get the diff of a pull request.

This is a JavaScript Action port of [suzuki-shunsuke/go-pr-diff](https://github.com/suzuki-shunsuke/go-pr-diff).
It first tries the GitHub REST API, and falls back to `git` commands if the API fails (e.g. when the diff is too large).

The diff is written to a file so that large diffs are not truncated by the GitHub Actions output size limit.

## How It Works

1. The action calls `GET /repos/{owner}/{repo}/pulls/{number}` with `Accept: application/vnd.github.v3.diff` to get the raw diff.
2. If the API call fails, the action falls back to `git`:
   1. Fetch the base SHA, head SHA, and the base repository's clone URL via the pulls API.
   2. Compute the merge-base SHA via the compare API.
   3. `git fetch --depth 1 <base_clone_url> <merge_base>` and `<head_sha>`.
   4. `git diff <merge_base> <head_sha>` and capture stdout.
