# Developer Manual Testing

0. Prelim client tests
1. Prelim server tests

## Open with your old settings

 - [ ] 1. Check all servers still visible.
 - [ ] 2. Check all dashboards still visible.
 - [ ] 3. Open old dashboard.
 - [ ] 4. Open old noteboook.

### SQL Editor page

1. Query KDB server 
    - [ ] 1. single line
    - [ ] 2. selected text
    - [ ] 3. all
    - [ ] 4. Try to send multiple queries
    - [ ] 5. cancel query
    - [ ] 6. Send query that returns kdb nested dict.
    - [ ] 7. Send query that fails to kdb.
    - [ ] 8. Send query that fails to non-kdb 
2. Edit code      (highlighting , brackets, autocomplete working?)
    - [ ] 1. by typing
    - [ ] 2. by copy paste
    - [ ] 3. search and replace
    - [ ] 4. Horizontal of long file
    - [ ] 5. Vertical scroll of long line

# Dashboards
  
1. Dashboard - Should display smoothly
    - [ ] 1. Create - Large table with appending data e.g. Trade Blotter
    - [ ] 2. Create - Large table with moving window e.g. Quotes for last 15 mins.
    - [ ] 3. Create - Small table of randomly updating table. FX
    - [ ] 4. Resize window, resize window by changing web instpector divider check console for "updating columns" calls.
    - [ ] 5. Forms with underscore in the values and multiples selected.
    - [ ] 6. Bookmarked reports with args in the URL
2. Permissions
	 - [ ] 1. Sign in as admin
		 - [ ] - Try admin only action. e.g. add connection
		 - [ ] - Try standard action e.g. view dashboard 
	 - [ ] 2. Sign in as standard user
		 - [ ] - Try admin only action. e.g. add connection. Type in raw URL if need be. 
		 - [ ] - Try standard action e.g. view dashboard 
3. CRUD for every item - Create, update, delete, restore from history
     - [ ] 1. JDBC connections
     - [ ] 3. Dashboard
4. Subscriptions
	 - [ ] 1. Create kdb subscription with {key} as arg to .u.sub.
	 - [ ] 2. Check that old subs turned off and arg changes work. 
5. Formatting
    - [ ] 1. Right-CLick - set column formatting - check it applied
    - [ ] 2. Save Dash, Reload Dash check it reloaded fine.
    - [ ] 3. Remove formatting - Check column name still applies - Save -> Check.
6. Backwards compatible
    - [ ] 1. Add kdb price-grid demo. Click on table to edit it. (Reason: kdb demo is "old" config without all flags BUT should still work especially editor when it tries to access subSonfig etc.)


# Noteboooks

- [ ] 1. Open an new notebook - example should be shown.
- [ ] 2. Save notebook and refresh.
- [ ] 3. Add sheet, save notebook in that sheet, check left menu.
- [ ] 4. Add chart nad header, are they shown.
