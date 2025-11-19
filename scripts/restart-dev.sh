#!/bin/bash
# Restart development servers with proper environment variables

echo "🛑 Stopping current dev servers..."
# The terminal will stop the current npm run dev:both when you Ctrl+C

echo ""
echo "✅ Ready to restart!"
echo ""
echo "To restart the dev servers:"
echo "1. Press Ctrl+C in the terminal running 'npm run dev:both'"
echo "2. Wait for processes to stop"
echo "3. Run: npm run dev:both"
echo ""
echo "This will:"
echo "  • Load .env.local environment variables"
echo "  • Enable Next.js API proxy to http://localhost:3001"
echo "  • Fix CORS errors"
echo "  • Allow Hub Incharge dashboard to load permissions"
