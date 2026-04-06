---
name: generate-commit-message
description: 'Generate conventional commit messages from staged changes. Use when committing code to suggest well-formatted messages following best practices.'
argument-hint: 'Optional: commit type (feat, fix, refactor, test, docs, chore, perf, ci, style)'
user-invocable: true
disable-model-invocation: false
---

# Generate Commit Message

Generate well-formatted, conventional commit messages automatically from your staged changes.

## When to Use

- **Before committing**: Analyze staged changes to suggest an appropriate commit message
- **Following conventions**: Ensure commits follow [Conventional Commits](https://www.conventionalcommits.org/) format
- **Clear history**: Improve code repository searchability and readability
- **Automated workflows**: Generate messages for scripted deployments or CI/CD pipelines
- **Team consistency**: Enforce commit message standards across the team

## Procedure

### Step 1: Stage Your Changes

Ensure the changes you want to commit are staged:
```bash
git add .           # Stage all changes
git add src/file.ts # Or stage specific files
git status          # Verify staged changes
```

### Step 2: Run the Analysis Script

The skill uses platform-specific scripts to:
1. Analyze staged changes in detail
2. Detect file types and patterns (features, fixes, refactors, etc.)
3. Generate a conventional commit message
4. Display change statistics

**For Linux/macOS users**, use [generate-commit.sh](./scripts/generate-commit.sh):
```bash
# Auto-detect commit type
./generate-commit.sh

# Or specify a commit type
./generate-commit.sh feat       # Feature
./generate-commit.sh fix        # Bug fix
./generate-commit.sh refactor   # Code refactoring
./generate-commit.sh test       # Tests
./generate-commit.sh docs       # Documentation
```

**For Windows users**, use [generate-commit.ps1](./scripts/generate-commit.ps1):
```powershell
# Auto-detect commit type
.\generate-commit.ps1

# Or specify a commit type
.\generate-commit.ps1 feat
.\generate-commit.ps1 fix
.\generate-commit.ps1 refactor
```

> **Note for Windows**: If you encounter execution policy errors, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> Or use Git Bash (included with Git for Windows) to run the bash script directly.

### Step 3: Review the Suggested Message

The output follows this format:

```
📝 Analyzing staged changes...

📄 Staged files:
   • src/components/LoginForm.tsx
   • src/services/auth.ts

✅ Suggested commit message:
  feat(auth): add user authentication endpoints

📊 Change Statistics:
   • Files changed: 2
   • Insertions: +45
   • Deletions: -12
```

**Output includes:**
- Detected commit type (feat, fix, refactor, etc.)
- Inferred scope (affected module/component)
- Concise description (≤50 characters)
- Change statistics (files, insertions, deletions)
- Per-file diff summary

### Step 4: Commit with the Generated Message

Copy the generated message and commit:
```bash
git commit -m "feat(auth): add user authentication endpoints"

# Or for interactive editing:
git commit
```

## Conventional Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **refactor**: Code refactoring without feature changes
- **test**: Adding or updating tests
- **docs**: Documentation changes
- **perf**: Performance improvements
- **ci**: CI/CD configuration changes
- **chore**: Maintenance tasks, dependency updates
- **style**: Code formatting (no logic changes)

### Scope (Optional)

Identifies the affected area:
- `feat(auth)`: Feature in authentication module
- `fix(api)`: Bug fix in API
- `docs(readme)`: Documentation for README

### Description

- 50 characters or less
- Imperative mood ("add", "fix", not "added", "fixes")
- No period at the end
- Clear and specific

### Body (Optional)

- Explain **what** and **why**, not how
- Wrap at 72 characters
- Separate from description with blank line

### Footer (Optional)

- Reference issues: `Fixes #123`, `Resolves #456`
- Note breaking changes: `BREAKING CHANGE: message`

## Key Features

✅ **Conventional format**: Follows [Conventional Commits](https://www.conventionalcommits.org/) standard  
✅ **Smart detection**: Analyzes staged files to suggest appropriate type  
✅ **Scope inference**: Suggests relevant module/component names  
✅ **Multi-platform**: Works on Windows (PowerShell), Mac, and Linux  
✅ **Flexible**: Override auto-detected type with optional argument  
✅ **Detailed output**: Shows statistics and change summary  

## Example Output

Adding a feature:
```
📝 Analyzing staged changes...

📄 Staged files:
   • src/components/LoginForm.tsx
   • src/services/auth.ts

🔍 Detecting commit type...
   Detected type: feat

✅ Suggested commit message:
  feat(auth): add new feature for authentication

📊 Change Statistics:
   • Files changed: 2
   • Insertions: +45
   • Deletions: -12

💾 To commit with this message:
   git commit -m "feat(auth): add new feature for authentication"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No staged changes" | Run `git add` to stage files first |
| PowerShell execution error | Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Commit type not detected | Specify type manually: `./generate-commit.sh feat` |
| Empty output | Verify files are staged: `git status` |

## Advanced Options

Edit [generate-commit.sh](./scripts/generate-commit.sh) or [generate-commit.ps1](./scripts/generate-commit.ps1) to:
- Add custom commit type patterns
- Change scope detection logic
- Adjust description length limits (default: 50 chars)
- Customize file extension mappings
- Add team-specific conventions
