# analyze-diff.ps1 - Generate PR summary from git changes (Windows)
# Usage: .\analyze-diff.ps1 [base-branch]
# Example: .\analyze-diff.ps1 main
#          .\analyze-diff.ps1  # auto-detect

param(
    [string]$BaseBranch = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$MaxBulletPoints = 5

# Detect base branch
if ([string]::IsNullOrEmpty($BaseBranch)) {
    # Try upstream/main first, fallback to origin/main
    git rev-parse upstream/main 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $BaseBranch = "upstream/main"
    }
    else {
        git rev-parse origin/main 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $BaseBranch = "origin/main"
        }
        else {
            Write-Host "❌ Error: Could not find base branch. Please specify: .\analyze-diff.ps1 <branch-name>"
            Write-Host "   Available remote branches:"
            git branch -r | Select-Object -First 10
            exit 1
        }
    }
}

# Fetch latest updates
Write-Host "📡 Fetching latest from remotes..."
git fetch upstream 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    git fetch origin 2>$null | Out-Null
}

# Verify branch exists
git rev-parse $BaseBranch 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Branch '$BaseBranch' not found"
    exit 1
}

$CurrentBranch = git rev-parse --abbrev-ref HEAD

Write-Host "🔍 Analyzing changes from $BaseBranch..."
Write-Host "   Current branch: $CurrentBranch"
Write-Host ""

# Generate diff with meaningful context
$Diff = git diff "$BaseBranch"..HEAD --no-color --ignore-all-space --no-prefix -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.py' '*.json' '*.md' 2>$null

if ([string]::IsNullOrWhiteSpace($Diff)) {
    Write-Host "⚠️  No meaningful changes found between $BaseBranch and $CurrentBranch"
    exit 0
}

# Get list of changed files
Write-Host "📝 Detected file changes:"
Write-Host ""

$ChangedFiles = git diff --name-only "$BaseBranch"..HEAD 2>$null | Sort-Object -Unique

foreach ($File in $ChangedFiles) {
    # Determine change type
    try {
        $null = git show "$BaseBranch`:$File" 2>$null
        $exists_in_base = $true
    }
    catch {
        $exists_in_base = $false
    }

    try {
        $null = git show "HEAD:$File" 2>$null
        $exists_in_head = $true
    }
    catch {
        $exists_in_head = $false
    }

    if ($exists_in_base -and $exists_in_head) {
        Write-Host "   • Modified: $File"
    }
    elseif ($exists_in_head) {
        Write-Host "   • Added: $File"
    }
    elseif ($exists_in_base -and -not $exists_in_head) {
        Write-Host "   • Deleted: $File"
    }
}

Write-Host ""
Write-Host "💡 Summary categories detected:"
Write-Host "   Looking for intent patterns in changes..."
Write-Host ""

# Analyze commit messages for intent
$CommitMessages = git log "$BaseBranch"..HEAD --oneline --no-decorate 2>$null | ForEach-Object { $_ -replace '^[a-f0-9]+ ', '' } | Sort-Object -Unique

# Categorize by common patterns
$HasFeature = $false
$HasBugfix = $false
$HasRefactor = $false
$HasTest = $false
$HasConfig = $false
$HasDocs = $false

foreach ($Msg in $CommitMessages) {
    $MsgLower = $Msg.ToLower()
    
    if ($MsgLower -match '(feat|add|new|implement|create|feature)') { $HasFeature = $true }
    if ($MsgLower -match '(fix|bug|bugfix|resolve|issue|patch)') { $HasBugfix = $true }
    if ($MsgLower -match '(refactor|restructure|clean|improve|optimize)') { $HasRefactor = $true }
    if ($MsgLower -match '(test|spec|unit|e2e|testing)') { $HasTest = $true }
    if ($MsgLower -match '(config|setup|build|tsconfig|package|dependencies)') { $HasConfig = $true }
    if ($MsgLower -match '(doc|readme|docs|document|comment)') { $HasDocs = $true }
}

# Generate bullet points based on detected intents
Write-Host "Summary:"
$PointCount = 0

if ($HasFeature -and $PointCount -lt $MaxBulletPoints) {
    Write-Host "- Added new features and functionality"
    $PointCount++
}

if ($HasBugfix -and $PointCount -lt $MaxBulletPoints) {
    Write-Host "- Fixed bugs and resolved issues"
    $PointCount++
}

if ($HasRefactor -and $PointCount -lt $MaxBulletPoints) {
    Write-Host "- Refactored code for maintainability and performance"
    $PointCount++
}

if ($HasTest -and $PointCount -lt $MaxBulletPoints) {
    Write-Host "- Added and improved tests"
    $PointCount++
}

if ($HasConfig -and $PointCount -lt $MaxBulletPoints) {
    Write-Host "- Updated configuration and dependencies"
    $PointCount++
}

if ($HasDocs -and $PointCount -lt $MaxBulletPoints) {
    Write-Host "- Updated documentation"
    $PointCount++
}

if ($PointCount -eq 0) {
    Write-Host "- Code changes and improvements"
}

Write-Host ""
Write-Host "✅ Summary generated! Copy the 'Summary:' section to your PR description."
Write-Host ""
Write-Host "📊 Statistics:"

$CommitCount = (git log "$BaseBranch"..HEAD --oneline 2>$null | Measure-Object -Line).Lines
$FileCount = ($ChangedFiles | Measure-Object -Line).Lines

Write-Host "   • Commits: $CommitCount"
Write-Host "   • Files changed: $FileCount"

$DiffStat = git diff "$BaseBranch"..HEAD --stat 2>$null | Select-Object -Last 1
if ($DiffStat) {
    Write-Host "   • Diff stats: $DiffStat"
}
