# Branch workflow

`main` is production trunk. Never push directly to it.

`dev` is shared integration branch. It starts from `main` and stays close to it.

## Daily work

1. Update `dev`: `git switch dev && git pull --ff-only`.
2. Create short-lived branch: `git switch -c feature/<name>`.
3. Open pull request into `dev`. CI must pass before merge.
4. Test `dev` in staging.
5. Open pull request from `dev` into `main` for each release. Merge only after CI and release checks pass.
6. Deploy production only from merged `main`.

## Rules

- No direct pushes, force pushes, or deletions on `main` or `dev`.
- Keep feature branches small; delete after merge.
- Rebase or merge current `dev` before opening a pull request.
- Require `CI / validate` on pull requests to both protected branches.
- Use squash merge for feature pull requests. Use merge commit or squash for `dev` to `main`, preserving release context.

## GitHub branch protection

Apply rules to `main` and `dev` in **Settings > Rules > Rulesets**:

- Require a pull request before merging.
- Require status check `validate`.
- Block force pushes and branch deletion.
- Require conversation resolution when reviews are used.

As sole repository owner, do not require an approving review unless another maintainer is added; GitHub cannot self-approve a pull request.

## Note on terminology

Strict trunk-based development merges short-lived feature branches directly into `main`. This repository uses a practical two-branch variant requested here: feature branches merge into `dev`, then release pull requests merge `dev` into protected `main`. Keep `dev` short-lived in divergence so `main` remains trunk in practice.
