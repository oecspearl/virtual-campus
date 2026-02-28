# PowerShell script to add environment variables to Vercel via CLI
# Usage: .\add-vercel-env.ps1

Write-Host "🚀 Adding Environment Variables to Vercel" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (Test-Path .env.local) {
    Write-Host "📄 Found .env.local file" -ForegroundColor Green
    Write-Host "Reading variables from .env.local..." -ForegroundColor Yellow
    Write-Host ""
    
    # Read .env.local and add each variable
    Get-Content .env.local | ForEach-Object {
        $line = $_.Trim()
        
        # Skip empty lines and comments
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
            return
        }
        
        # Split on first = sign
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            
            # Remove quotes if present
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            if ($value.StartsWith("'") -and $value.EndsWith("'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            
            # Skip if value is empty
            if ([string]::IsNullOrWhiteSpace($value)) {
                return
            }
            
            Write-Host "Adding: $key" -ForegroundColor Yellow
            
            # Add to each environment separately
            $environments = @("production", "preview", "development")
            foreach ($env in $environments) {
                $value | vercel env add "$key" $env
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  Failed to add to $env" -ForegroundColor Red
                }
            }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Added $key" -ForegroundColor Green
            } else {
                Write-Host "⚠️  $key may already exist or failed to add" -ForegroundColor Yellow
            }
            Write-Host ""
        }
    }
    
    Write-Host "✅ Finished adding variables from .env.local" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env.local not found" -ForegroundColor Yellow
    Write-Host "Please add variables manually or create .env.local first" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To add variables manually, use:" -ForegroundColor Cyan
    Write-Host "  vercel env add VARIABLE_NAME production preview development" -ForegroundColor White
    Write-Host ""
    Write-Host "You'll be prompted to enter the value." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify variables: vercel env ls" -ForegroundColor White
Write-Host "2. Redeploy: vercel --prod" -ForegroundColor White

