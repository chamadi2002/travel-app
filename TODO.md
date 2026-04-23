# Remove Package Selection Filter Only on Expenses Page

## Steps:
- [x] 1. Add `id="packageFilterGroup"` to the package filter div in index.html
- [x] 2. Update app.js refreshPage() to hide `#packageFilterGroup` on expenses page, show on others, and clear package filter
- [x] 3. Test navigation between pages to verify filter visibility
- [x] 4. Verify global filters still work on other pages

**Task completed:** Package selection filter is now removed (hidden) only on the expenses page. It remains visible and functional on all other pages (dashboard, sales, etc.). Navigate between pages to confirm.

## Next steps (if needed):
- None
