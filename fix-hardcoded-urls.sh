#!/bin/bash
# Script to replace all hardcoded localhost:3001 URLs with relative URLs

echo "🔍 Finding and replacing hardcoded backend URLs..."

# Find all TypeScript/JavaScript files with localhost:3001
FILES=$(grep -rl "localhost:3001" my-frontend/src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null)

if [ -z "$FILES" ]; then
  echo "✅ No hardcoded localhost:3001 URLs found!"
  exit 0
fi

echo "📝 Files with hardcoded URLs:"
echo "$FILES"
echo ""

# Replace patterns
echo "🔧 Replacing patterns..."

# Pattern 1: fetch('http://localhost:3001/api/...') → fetch('/api/...')
find my-frontend/src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' 's|fetch(`http://localhost:3001/api/|fetch(`/api/|g' {} \;
find my-frontend/src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' "s|fetch('http://localhost:3001/api/|fetch('/api/|g" {} \;
find my-frontend/src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' 's|fetch("http://localhost:3001/api/|fetch("/api/|g' {} \;

# Pattern 2: const url = `http://localhost:3001/api/...` → const url = `/api/...`
find my-frontend/src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' 's|`http://localhost:3001/api/|`/api/|g' {} \;
find my-frontend/src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' "s|'http://localhost:3001/api/|'/api/|g" {} \;
find my-frontend/src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' 's|"http://localhost:3001/api/|"/api/|g' {} \;

# Pattern 3: baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
# → baseURL = '' (use relative URLs)
find my-frontend/src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' "s|process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'|''|g" {} \;

echo ""
echo "✅ Replacement complete!"
echo ""
echo "🔍 Remaining instances of localhost:3001:"
grep -rn "localhost:3001" my-frontend/src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | grep -v "node_modules" | grep -v ".next" || echo "   None found! ✨"
echo ""
echo "📖 Note: API proxy routes (pages/api/) are intentionally excluded"
