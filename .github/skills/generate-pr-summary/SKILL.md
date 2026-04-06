---
name: generate-pr-summary
description: 'Generate concise, human-readable PR descriptions from git diffs. Use when drafting pull requests, creating PR descriptions, or summarizing code changes between branches.'
argument-hint: 'Optional: target branch name (defaults to origin/main or upstream/main)'
user-invocable: true
disable-model-invocation: false
---

# Generate PR Summary

Generate minimal, human-readable pull request descriptions automatically from meaningful code changes.

## When to Use

- **Creating PR descriptions**: Quickly summarize changes for your current branch
- **Reviewing changes**: Understand what modifications were made before opening a PR
- **Context isolation**: Get a high-level overview without parsing raw diffs
- **Team communication**: Present changes in a format that's easy for reviewers to scan

## Procedure

### Step 1: Prepare Your Git Repository

Ensure your git remotes are configured and your current branch has commits to summarize:
```bash
git status  # Confirm you're on the correct branch
git log --oneline -5  # View recent commits
```

### Step 2: Run the Analysis Script

The skill uses platform-specific scripts to:
1. Fetch the latest base branch (`upstream/main` or fallback to `origin/main`)
2. Generate a meaningful diff (ignoring formatting noise)
3. Analyze changes by type and intent
4. Group related changes logically

**For Linux/macOS users**, use [analyze-diff.sh](./scripts/analyze-diff.sh):
```bash
# Auto-detect base branch
./analyze-diff.sh

# Or specify a custom target branch
./analyze-diff.sh main
./analyze-diff.sh staging
```

**For Windows users**, use [analyze-diff.ps1](./scripts/analyze-diff.ps1):
```powershell
# Auto-detect base branch
.\analyze-diff.ps1

# Or specify a custom target branch
.\analyze-diff.ps1 main
.\analyze-diff.ps1 staging
```

> **Note for Windows**: If you encounter execution policy errors, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> Or use Git Bash (included with Git for Windows) to run the bash script directly.

### Step 3: Review the Summary

The output follows this format:

```
Summary:
- <change 1: under 15 words, human-friendly>
- <change 2: under 15 words>
- <change 3: under 15 words>
```

**Output rules:**
- Maximum 5 bullet points
- Each point ≤12-15 words
- Focus on "what" and "why", not technical noise
- Merge similar changes; avoid repetition
- Plain language (explain to a teammate)

### Step 4: Copy to PR Description

Use the generated summary as-is or customize further for your PR template.

## Key Features

✅ **Smart filtering**: Ignores formatting, whitespace, and merge commits  
✅ **Intent detection**: Identifies bug fixes, features, refactors, tests, config changes  
✅ **Auto base detection**: Tries upstream, falls back to origin  
✅ **Grouped output**: Groups related changes logically  
✅ **Human-readable**: No file paths, no diff syntax in output  

## Example Output

```
Summary:
- Added user preference schema for personalized recommendations
- Fixed race condition in event volunteer creation
- Improved validation for API input fields
- Added unit tests for recurrence logic
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No upstream or origin found" | Ensure remotes are configured: `git remote -v` |
| "No commits to analyze" | Check that your branch has commits: `git log --oneline` |
| "Fetch fails" | Ensure network access: `git fetch --all` manually |
| "Empty summary" | Verify your branch differs from base: `git diff upstream/main` |

## Advanced Options

Edit [analyze-diff.sh](./scripts/analyze-diff.sh) or [analyze-diff.ps1](./scripts/analyze-diff.ps1) to:
- Change max bullet points (default: 5)
- Adjust word limit per point (default: 15 words)
- Customize commit type detection (feature, fix, refactor, test, config, docs)
- Add or remove supported file extensions
