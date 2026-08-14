[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $CoverageDirectory,

    [ValidateRange(0, 100)]
    [double] $MinimumLineCoverage = 80
)

$coverageFiles = Get-ChildItem -Path $CoverageDirectory -Recurse -Filter 'coverage.cobertura.xml'

if ($coverageFiles.Count -eq 0) {
    throw "No Cobertura coverage reports were found in '$CoverageDirectory'."
}

[long] $coveredLines = 0
[long] $validLines = 0

foreach ($coverageFile in $coverageFiles) {
    [xml] $coverageReport = Get-Content -Path $coverageFile.FullName
    $coveredLines += [long] $coverageReport.coverage.'lines-covered'
    $validLines += [long] $coverageReport.coverage.'lines-valid'
}

if ($validLines -eq 0) {
    throw 'The coverage reports do not contain any valid lines.'
}

$lineCoverage = [Math]::Round(($coveredLines / $validLines) * 100, 2)
$summary = "Line coverage: $lineCoverage% ($coveredLines/$validLines); required: $MinimumLineCoverage%."

Write-Host $summary

if ($env:GITHUB_STEP_SUMMARY) {
    @(
        '## Test coverage'
        ''
        '| Metric | Result | Required |'
        '| --- | ---: | ---: |'
        "| Line coverage | $lineCoverage% | $MinimumLineCoverage% |"
    ) | Add-Content -Path $env:GITHUB_STEP_SUMMARY
}

if ($lineCoverage -lt $MinimumLineCoverage) {
    throw "Coverage gate failed. $summary"
}
