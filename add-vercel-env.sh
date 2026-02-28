#!/bin/bash

# Script to add environment variables to Vercel via CLI
# Usage: ./add-vercel-env.sh

echo "🚀 Adding Environment Variables to Vercel"
echo "=========================================="
echo ""

# Function to add a single environment variable
add_env_var() {
    local var_name=$1
    local var_value=$2
    local environments=${3:-"production preview development"}
    
    echo "Adding: $var_name"
    echo "$var_value" | vercel env add "$var_name" $environments
    
    if [ $? -eq 0 ]; then
        echo "✅ Added $var_name"
    else
        echo "❌ Failed to add $var_name"
    fi
    echo ""
}

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "📄 Found .env.local file"
    echo "Reading variables from .env.local..."
    echo ""
    
    # Read .env.local and add each variable
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^#.*$ ]] && continue
        
        # Remove quotes from value if present
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        
        # Skip if value is empty
        [[ -z "$value" ]] && continue
        
        echo "Adding: $key"
        echo "$value" | vercel env add "$key" production preview development
        
        if [ $? -eq 0 ]; then
            echo "✅ Added $key"
        else
            echo "⚠️  $key may already exist or failed to add"
        fi
        echo ""
    done < .env.local
    
    echo "✅ Finished adding variables from .env.local"
else
    echo "⚠️  .env.local not found"
    echo "Please add variables manually or create .env.local first"
    echo ""
    echo "To add variables manually, use:"
    echo "  vercel env add VARIABLE_NAME production preview development"
    echo ""
    echo "You'll be prompted to enter the value."
fi

echo ""
echo "📝 Next steps:"
echo "1. Verify variables: vercel env ls"
echo "2. Redeploy: vercel --prod"

