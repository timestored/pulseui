Version 0.13.6
	Add Metrics Panels for showing latest values in large text
Version 0.13.5
    Bundle JRE with installer/zip to make it easier for windows users
    Add demos for Dynamic HTML Component
Version 0.13.4
    Add Dynamic HTML Component
Version 0.13.1
    Add Sparklines to Tables
Version 0.12.3
    Improve administration. Add raw json, backup page and -vv very verbose mode.
Version 0.12.2
    Add Dual Axis - Can have 2 Y-Axis and customize both.
Version 0.12.1
    Add Grid Customization - Can add/remove preHeader/Footer/Pager/Filters. Allow setting frozen rows.
Version 0.11.5
	Breaking Change - Forms with multiple parameters stored in the URL now use ~ instead of _ as separator as it's less common
Version 0.11.4	
	Forms - Various improvements and bug fixes
Version 0.11.3
	Enable column renaming
	Allow Pulse to be hosted in website subdirectory. Useful for auth proxying
Version 0.11.2
	Ability to set Column formatting, chart colours etc. from the UI
	Add search/filter for custom chart settings
Version 0.11.1
	UI Niceties - Expand default pallette to 20 colours. Add 30 min / 2 hour refresh
	Escape quotes / commas in data download
	Customizeable Security
	KDB Connections - Allow wrapping queries
	Security - Support AuthProxy / Apache user authentication
Version 0.9.7
	Reduce build size by removing external dependencies
	Add "Add Server List" button to allow importing list straight from qStudio
	Add Custom Security to allow REST/kdb configured authentication and authorization
	Add YAML based configuration
Version 0.9.6
	JDBC Driver Updates: MySQL/PostgreSQL/SQL Server
	Bugfix: UI recovery in event of bad streaming query
	Quicker Startup
	Increase size of SQL query supported to 10MB
Version 0.9.5
	UI Improvements
	Added 3 Chart Demo Dashboards
Version 0.9.4
	Charts - Add horizontal bar chart and horizontal stack chart
	Charts - Add Boxplot
	Charts - Add 3D Bar Chart, 3D Surface
	Charts - Add Sunburst and Tree
Version 0.9.3
	Appearance - Various improvements and refinements to themes, forms, icons
	Automatic screenshot generation
	Add number/text filters to grid
	Improved error handling to retyr charts when user requests or at regular intervals
	Demos - Add demo queries for H2/KDB database for all chart types
	Charts - Add multi-pie chart support
Version 0.9.2
	Add Editor component that allows editing code or plain text and sending it as a parameter
	Allow Dashboard/Widget custom user CSS
	Forms - Date component suppoorts date/datetime single values and ranges
	Forms - Add textfield/textarea component
	Forms - Add submit button and allow delaying form submission unless button clicked
	KDB - Improved display of nested types in table
Version 0.9.1
	Improved support for kdb minute/second/date/time types
	Allow authors and users to save dashboard parameters
	SQL Editor - Allow sharing links
	SQL Editor - Allow choosing chart type
	Support custom JDBC drivers
	Allow theme/css customization
	Add new Code/Text input component
Version 0.8.4
	Add demos: stream liquidity, TAQ, candlestick
	Improve tooltip formatting, particularly decimal places shown
	Improve QueryEditor layout and add chart icon
	bugfix for headless JRE on linux
Version 0.8.3
	Improve appearance, expand homepage
	Add grid dark theme support
	Add candlestick chart
Version 0.8.2
	Improve appearance, expand homepage
	Add grid dark theme support
	Add candlestick chart
Version 0.8.1
	Add calendar chart type
Version 0.7.4
	Add KDB Streaming Subscriptions
	Add ability to set column formatter from context menu
	Allow setting query refresh rates
Version 0.7.3
	Add HTML component
	Added default queries when new chart added
	Reports - screenshot and HTML output can now run
	Reports - Add HTML table to email
	SQL Editor - Improved kdb support. Added console and list view for non-table objects
	Form parameters now use {"{arg}"} and ((arg))
Version 0.7.2
	Add Dashboard history tracking to allow quick restoration of old versions
	Users can quick open favourite dashboards
	Add User Analytics
	Dashboard user arguments to URL allows bookmarking
	Add User logins
	Add reports / subscriptions CRUD
Version 0.7.1
	Popouts which remember location
	Table context menu allows excel/csv download
Version 0.6.6 - Add Screenshot capability
Version 0.6.5 - Added SlickGrid table
Version 0.6.4 - Automated .exe installer
Version 0.6.3 - Added SQL editor.
Version 0.6.2 - Alpha Release
	Dashboards - Ability to add charts/tables, save dashboards
	Automated Continuous Integration
