# generate-commit.ps1 - Generate conventional commit messages (Windows)
# Usage: .\generate-commit.ps1 [commit-type]
# Example: .\generate-commit.ps1 feat
#          .\generate-commit.ps1  # auto-detect

param(
    [string]$CommitType = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$MaxDescLength = 50

# Check if there are staged changes
$StagedFiles = @(git diff --cached --name-only 2>$null)
$StagedCount = $StagedFiles.Count

if ($StagedCount -eq 0) {
    Write-Host "❌ Error: No staged changes found" -ForegroundColor Red
    Write-Host "   Stage changes first: git add <files>"
    exit 1
}

Write-Host "📝 Analyzing staged changes..." -ForegroundColor Cyan
Write-Host ""

Write-Host "📄 Staged files:" -ForegroundColor Cyan
$StagedFiles | ForEach-Object { Write-Host "   • $_" }
Write-Host ""

# Detect commit type if not specified
if ([string]::IsNullOrEmpty($CommitType)) {
    Write-Host "🔍 Detecting commit type..." -ForegroundColor Cyan
    
    $HasFeature = $false
    $HasFix = $false
    $HasRefactor = $false
    $HasTest = $false
    $HasDocs = $false
    $HasPerf = $false
    
    # Analyze file patterns and changes
    foreach ($File in $StagedFiles) {
        $FileLower = $File.ToLower()
        
        # Check file extensions
        if ($FileLower -match '\.test\.|\.spec\.') {
            $HasTest = $true
        }
        elseif ($FileLower -match '\.md$|\.txt$' -or $FileLower -match '^docs/') {
            $HasDocs = $true
        }
        
        # Analyze diff for clues
        $Diff = git diff --cached $File 2>$null
        $DiffLower = if ($Diff) { ($Diff -join ' ').ToLower() } else { '' }
        
        if ($DiffLower -match '(perf|performance|optimize|speed|cache)') {
            $HasPerf = $true
        }
        if ($DiffLower -match '(fix|bug|issue|error|crash)') {
            $HasFix = $true
        }
        if ($DiffLower -match '(refactor|restructure|clean|improve)') {
            $HasRefactor = $true
        }
        if ($DiffLower -match '(feature|add|new|implement)') {
            $HasFeature = $true
        }
    }
    
    # Prioritize commit type
    if ($HasFix) {
        $CommitType = "fix"
    }
    elseif ($HasFeature) {
        $CommitType = "feat"
    }
    elseif ($HasPerf) {
        $CommitType = "perf"
    }
    elseif ($HasRefactor) {
        $CommitType = "refactor"
    }
    elseif ($HasTest) {
        $CommitType = "test"
    }
    elseif ($HasDocs) {
        $CommitType = "docs"
    }
    else {
        $CommitType = "chore"
    }
    
    Write-Host "   Detected type: $CommitType" -ForegroundColor Green
}

# Validate commit type
$ValidTypes = @("feat", "fix", "refactor", "test", "docs", "perf", "ci", "chore", "style")
if ($CommitType -notin $ValidTypes) {
    Write-Host "❌ Invalid commit type: $CommitType" -ForegroundColor Red
    Write-Host "   Valid types: feat, fix, refactor, test, docs, perf, ci, chore, style"
    exit 1
}

Write-Host ""
Write-Host "💡 Generating commit message..." -ForegroundColor Cyan
Write-Host ""

# Infer scope from files
$Scope = ""
$FirstFile = $StagedFiles[0]
$FirstDir = $FirstFile -split '/' | Select-Object -First 1

# Common scope mapping
switch ($FirstDir) {
    "src" {
        $FirstSubDir = $FirstFile -split '/' | Select-Object -Index 1
        if ($FirstSubDir -in @("components", "hooks", "utils", "services", "api", "auth", "db")) {
            $Scope = $FirstSubDir
        }
    }
    "tests" { $Scope = "test" }
    "test" { $Scope = "test" }
    "spec" { $Scope = "test" }
    "docs" { $Scope = "docs" }
    "config" { $Scope = "config" }
    ".github" { $Scope = "ci" }
}

# Generate description based on type
$DescriptionMap = @{
    "feat"     = "add new feature for staged changes"
    "fix"      = "resolve issue and improve stability"
    "refactor" = "restructure code for better maintainability"
    "test"     = "add and improve test coverage"
    "docs"     = "update documentation"
    "perf"     = "optimize performance and efficiency"
    "ci"       = "update CI/CD configuration"
    "chore"    = "update dependencies and maintenance tasks"
    "style"    = "apply code formatting and style fixes"
}

$Desc = $DescriptionMap[$CommitType]

# Truncate description if needed
if ($Desc.Length -gt $MaxDescLength) {
    $Desc = $Desc.Substring(0, $MaxDescLength - 3) + "..."
}

# Build full commit message
if ([string]::IsNullOrEmpty($Scope)) {
    $CommitMsg = "$CommitType`: $Desc"
}
else {
    $CommitMsg = "$CommitType($Scope): $Desc"
}

Write-Host "✅ Suggested commit message:" -ForegroundColor Green
Write-Host ""
Write-Host "  $CommitMsg" -ForegroundColor Green
Write-Host ""

# Show change statistics
Write-Host "📊 Change Statistics:" -ForegroundColor Cyan
$FileCount = ($StagedFiles | Measure-Object -Line).Lines

$DiffNumStat = git diff --cached --numstat 2>$null
$Insertions = 0
$Deletions = 0

foreach ($Line in $DiffNumStat) {
    $Parts = $Line -split '\s+' | Where-Object { $_ }
    if ($Parts.Count -ge 2) {
        # Safe parsing for binary files (handle '-' and non-numeric values)
        if ([int]::TryParse($Parts[0], [ref]$null)) {
            $Insertions += [int]$Parts[0]
        }
        if ([int]::TryParse($Parts[1], [ref]$null)) {
            $Deletions += [int]$Parts[1]
        }
    }
}

Write-Host "   • Files changed: $FileCount"
Write-Host "   • Insertions: +$Insertions"
Write-Host "   • Deletions: -$Deletions"
Write-Host ""

# Show detailed file changes
Write-Host "🔄 Detailed changes:" -ForegroundColor Cyan
$StatLines = (git diff --cached --stat 2>$null | Measure-Object -Line).Lines - 1
git diff --cached --stat 2>$null | Select-Object -First $StatLines | ForEach-Object { Write-Host "   $_" }
Write-Host ""

Write-Host "💾 To commit with this message:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   git commit -m ""$CommitMsg"""
Write-Host ""
Write-Host "📝 To edit before committing:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   git commit"
Write-Host ""
