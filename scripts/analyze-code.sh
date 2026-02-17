#!/bin/bash
# Code Quality Analysis Script

echo "🔍 Survivor Fantasy League - Code Quality Report"
echo "=================================================="
echo ""

# Count TypeScript any usage
echo "📊 TypeScript 'any' usage:"
any_count=$(grep -r "any" src --include="*.ts" --include="*.tsx" | wc -l | xargs)
echo "   Found: $any_count occurrences"
echo ""

# Count console.log usage
echo "📊 Console statements:"
console_count=$(grep -rE "console\.(log|warn|error)" src --include="*.ts" --include="*.tsx" | wc -l | xargs)
echo "   Found: $console_count occurrences"
echo ""

# Find large files
echo "📊 Largest component files (>400 lines):"
find src -name "*.tsx" -exec wc -l {} \; | sort -rn | head -5 | while read line; do
  echo "   $line"
done
echo ""

# Count TODOs
echo "📊 TODO comments:"
todo_count=$(grep -rE "TODO|FIXME|HACK" src --include="*.ts" --include="*.tsx" | wc -l | xargs)
echo "   Found: $todo_count items"
echo ""

# Test coverage (if available)
if [ -d "coverage" ]; then
  echo "📊 Test Coverage:"
  echo "   See: coverage/index.html"
else
  echo "📊 Test Coverage: Run 'npm run test:coverage' first"
fi
echo ""

# Bundle size estimation
if [ -d ".next" ]; then
  echo "📊 Build artifacts:"
  du -sh .next 2>/dev/null | awk '{print "   .next/: "$1}'
else
  echo "📊 Build artifacts: Run 'npm run build' first"
fi
echo ""

echo "✅ Analysis complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Review BEST_PRACTICES.md for improvement recommendations"
echo "   2. Start with 'Quick Wins' section (40 min)"
echo "   3. Run 'npm run test:coverage' for detailed test coverage"
