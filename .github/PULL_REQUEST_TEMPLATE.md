## 📝 Description
<!-- Provide a brief description of the changes in this PR -->



## 🎯 Type of Change
<!-- Mark relevant options with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Style/UI update (no functional changes)
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test addition or update
- [ ] 🔧 Configuration change
- [ ] 🔒 Security fix

## 🔗 Related Issues
<!-- Link to related issues using #issue_number -->

Fixes #
Relates to #

## 🧪 Testing
<!-- Describe the tests you ran and how to reproduce them -->

### Test Checklist
- [ ] Unit tests pass (`npm run test`)
- [ ] Linter passes (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Manual testing completed
- [ ] Tested on multiple browsers (if UI change)
- [ ] Tested on mobile (if UI change)
- [ ] Tested with screen reader (if accessibility change)

### Test Instructions
<!-- Provide step-by-step instructions to test the changes -->

1. 
2. 
3. 

## 📸 Screenshots / Videos
<!-- If applicable, add screenshots or videos to demonstrate the changes -->

### Before


### After


## 📋 Checklist
<!-- Mark completed items with an "x" -->

### Code Quality
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No console.log statements left in code
- [ ] No commented-out code blocks
- [ ] Error handling implemented
- [ ] Loading states added (if applicable)

### Documentation
- [ ] Updated relevant documentation
- [ ] Added JSDoc comments for new functions
- [ ] Updated CHANGELOG.md
- [ ] Updated README if needed
- [ ] Added inline comments for complex logic

### Internationalization (i18n)
- [ ] No hardcoded user-facing strings
- [ ] All text wrapped in t() function
- [ ] Translation keys added to locale files
- [ ] Tested with multiple languages (if applicable)

### Accessibility (WCAG 2.1 AA)
- [ ] Added ARIA labels where needed
- [ ] Semantic HTML used
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader friendly

### Security
- [ ] No sensitive data exposed
- [ ] No hardcoded credentials
- [ ] Input validation added
- [ ] XSS prevention measures in place
- [ ] CSRF protection maintained
- [ ] Authentication/authorization checks present

### Performance
- [ ] No unnecessary re-renders
- [ ] Optimized database queries
- [ ] Large lists paginated
- [ ] Images optimized
- [ ] Bundle size impact acceptable

### Database
- [ ] Migration files created (if schema changes)
- [ ] Migration tested locally
- [ ] Rollback plan documented
- [ ] No data loss risk

## 🚀 Deployment Notes
<!-- Any special instructions for deployment -->



## 📚 Additional Context
<!-- Add any other context about the PR here -->



## 👀 Reviewers
<!-- Tag specific people for review -->

@username

---

## Reviewer Guidelines

### What to Check
1. **Code Quality:** Clean, readable, follows conventions
2. **Functionality:** Works as described, no bugs
3. **Tests:** Adequate coverage, tests pass
4. **Security:** No vulnerabilities introduced
5. **Performance:** No performance regressions
6. **Accessibility:** WCAG 2.1 AA compliant
7. **Documentation:** Code is well-documented

### Review Commands
```bash
# Checkout the PR branch
git fetch origin
git checkout BRANCH_NAME

# Install dependencies
npm install

# Run tests
npm run test

# Run linter
npm run lint

# Build project
npm run build

# Run locally
npm run dev
```

---

**Thank you for contributing to BISMAN ERP! 🎉**
