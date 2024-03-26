# Pulse

![Pulse](/multi-chart3-dark.jpg)

For more info see [timestored.com/pulse](http://timestored.com/pulse "timestored.com/pulse")

Pulse is an open source tool for real-time visual analysis, email reporting and alerting.
It allows you to create and share real-time interactive applications with your team.

Pulse supports 40+ databases including kdb, postgresql, mysql, ms sql, clickhouse. 
Databases that are wire compatible with postgres/mysql also work i.e. timescale, questdb, cockroachdb.

# 2.xx Releases

    2024-03-26 - 2.23 - Improved Pivot Table and Filter to save user settings. Support 100+ pie charts.
    2024-03-13 - 2.22 - Dashboard Version Diffs. Improved scatter time-series chart. Copy-paste of panels.
    2024-03-06 - 2.21 - Add SQL Audio Alerts. Improve display of kdb+ objects.
    2024-03-03 - 2.20 - Numerous small bigfixes. Update dependencies, OWASP scan now passing.
    2024-02-22 - 2.19 - Improved Scatter/Bubble chart tooltip and formatter.
    2024-02-15 - 2.17 - Add Tabs. Improve query caching. Bugfixes for pivot/duckdb/legends.
    2024-02-01 - 2.16 - OS specific builds to reduce download sizes. Minor bugfixes and UI improvements.
    2024-01-19 - 2.14 - Expand roles and permissions for enterprise use, include permissioning data sources.
    2023-12-20 - 2.13 - Improve clickhouse support, add encrypted connections and play.clickhouse.com demos.
    2023-12-13 - 2.12 - Add KuCoin Streaming data source.
    2023-12-07 - 2.11 - Add Marker Lines/Points and shaded areas to time-series charts.
    2023-12-04 - 2.10 - Improve candlestick appearance and add Click-drag-to-zoom.
    2023-11-29 - 2.09 - Allow Adding tags and comments to dashboards.
    2023-11-27 - 2.08 - Add Binance candle/kline support.
    2023-11-18 - 2.07 - Improve performance of table, time-series and display panels in general.
    2023-11-15 - 2.06 - Add Ctrl+K SearchBar.
    2023-11-11 - 2.05 - Cache latest queries and reuse results. 100 users with same query = 1 query.
    2023-11-11 - 2.04 - Symbols - Allow querying and searching within UI using only symbols.
    2023-11-09 - 2.03 - Add FRED - Federal Reserve Data Source.
    2023-11-09 - 2.03 - Add ECB - European Central Bank Data Source.
    2023-10-27 - 2.02 - Add BabelDB to query REST, CSV, JSON or streaming source.
    2023-10-14 - 2.01 - Add owners/users/teams roles and permissions for dashboards.

A massive thanks to all those that helped us reach 2.0.

With the recent addition of advanced roles and permissions Pulse successfully scales out to solve real-time dashboards for multiple quant teams within one deploy.

# 1.xx Releases

    2023-09-05 - 1.70 - Add OrderBook streaming DepthMap visualization.
    2023-08-25 - 1.60 - Support on-client appending for streaming Connections
    2023-08-25 - 1.55 - Add Binance streaming data source.
    2023-08-23 - 1.51 - Improve kdb connections to handle disconnects and no longer wrap queries.
    2023-08-18 - 1.50 - Open Sourced Version
    2023-08-14 - 1.36 - Improve server tree listing for more databases.
    2023-08-07 - 1.34 - Add variable formatters.
    2023-08-01 - 1.33 - Support many more database integrations: clickhouse, mongodb, influxdb, SAP.
    2023-07-19 - 1.10 - Add Redis support.
    2023-07-15 - 1.09 - Bugfixes - Improve handling of illegal characters in dashboard URL, particularly saving.
    2023-07-14 - 1.08 - Add date and time column formatters e.g. 14/07/2023 (Thanks CT).
    2023-07-07 - 1.07 - Bugfixes - Improve date timezone handling consistency, particularly for kdb times.
    2023-06-24 - 1.06 - Add experimental PulsePivot.
    2023-06-09 - 1.05 - Add ChatGPT AI SQL generator.
    2023-05-24 - 1.04 - Bugfixes - Table clicks faster and more accurate. _SD_BG mixed casing. (Thanks GD)
    2023-04-27 - 1.03 - UI Improvements - Allow dragging components on. Show failing queries. (Thanks CA)
    2023-04-26 - 1.02 - SQL Server JDBC driver upgrade to improve compatibility (Thanks EL)
    2023-04-24 - 1.01 - First ever 1.0 release.
        Stability improvements - Set max row limit on queries and notify user when reached.
        Speed Improvements - Use smart caching to allow instant browsing of dashboards / connections.

A massive thanks to all those that helped us reach 1.0.

With the recent addition of Interactive Dashboards, Event Handlers and the numerous stability improvements, we've really reached a significant milestone. Pulse is solving the real-time interactive app problem that we initially saw quants and data analysts needing.

# 0.xx Releases

    2023-04-19 - SQL Editor - Improved handling of very large queries and kdb specific results.
    2023-04-05
        Add Event Handlers to trigger queries and perform other actions in response to user interactions.
        Display warning if backend data sources are slow returning queries.
    2023-03-27 - Add User TimeZone Option. Allow author to toggle 1000s separator for numbers.
    2023-03-21
        Add REST API to allow setting servers dynamically using MASTER_API_KEY
        Throttle dashboards if they are slow consuming messages
        Add tooltips to ease onboarding new users
    2023-03-14
        Send websocket heartbeat to prevent timeouts
        Add licensing, restrict free version to 3 users and 12 dashboards
    2023-03-02 - Stability improvements for large dashboards.
    2023-02-22
        Interactive Dashboards
        Chart Click Events
        Table Click Events
    2023-02-15
        Add JQ in-memory.
    2023-02-04
        Add Metrics Panel Component
        Move internal demo database to port 8999 to avoid overlap with clickhouse on 9000
    2023-01-25
        Add demos for Dynamic HTML Component
        Bundle JRE with installer/zip to make it easier for windows users
        Security - Java REST fetch falls back to curl in case java certs are missing
    2023-01-16
        Add Dynamic HTML Component
    2023-01-03
        Add Sparklines to Tables
    2022-12-17
        Improve administration. Add raw json, backup page and -vv very verbose mode.
    2022-12-10
        Add Dual Axis - Can have 2 Y-Axis and customize both.
    2022-12-03
        Add Grid Customization - Can add/remove preHeader/Footer/Pager/Filters. Allow setting frozen rows.
    2022-11-28
        Fix to allow running in subdirectory.
        Form Improvements - Add submit button demo
    2022-11-14
        Enable column renaming
        Allow Pulse to be hosted in website subdirectory. Useful for auth proxying.
    2022-11-07
        Ability to set Column formatting, chart colours etc. from the UI
        Add search/filter for custom chart settings
    2022-11-02
        UI Niceties - Expand default pallette to 20 colours. Add 30 min / 2 hour refresh
        Escape quotes / commas in data download
        Customizeable Security
        KDB Connections - Allow wrapping queries
        Security - Support AuthProxy / Apache user authentication
    2022-10-14
        Reduce build size by removing external dependencies
        Add "Add Server List" button to allow importing list straight from qStudio
        Add Custom Security to allow REST/kdb configured authentication and authorization
        Add YAML based configuration
    2022-09-29
        JDBC Driver Updates: MySQL/PostgreSQL/SQL Server
        Bugfix: UI recovery in event of bad streaming query
        Quicker Startup
        Increase size of SQL query supported to 10MB
    2022-09-28
        UI Improvements
        Added 3 Chart Demo Dashboards
    2022-09-26
        Charts - Add horizontal bar chart and horizontal stack chart
        Charts - Add Boxplot
        Charts - Add 3D Bar Chart, 3D Surface
        Charts - Add Sunburst and Tree
    2022-09-22
        Appearance - Various improvements and refinements to themes, forms, icons
        Automatic screenshot generation
        Add number/text filters to grid
        Improved error handling to retyr charts when user requests or at regular intervals
        Demos - Add demo queries for H2/KDB database for all chart types
        Charts - Add multi-pie chart support
    2022-09-08
        Add Editor component that allows editing code or plain text and sending it as a parameter
        Allow Dashboard/Widget custom user CSS
        Forms - Date component suppoorts date/datetime single values and ranges
        Forms - Add textfield/textarea component
        Forms - Add submit button and allow delaying form submission unless button clicked
        KDB - Improved display of nested types in table
    2022-09-01
        Improved support for kdb minute/second/date/time types
        Allow authors and users to save dashboard parameters
        SQL Editor - Allow sharing links
        SQL Editor - Allow choosing chart type
        Support custom JDBC drivers
        Allow theme/css customization
        Add new Code/Text input component
    2022-08-24
        Add demos: stream liquidity, TAQ, candlestick
        Improve tooltip formatting, particularly decimal places shown
        Improve QueryEditor layout and add chart icon
        bugfix for headless JRE on linux
    2022-08-16
        Improve appearance, expand homepage
        Add grid dark theme support
        Add candlestick chart
    2022-08-01
        Add calendar chart type
    2022-07-24
        Add KDB Streaming Subscriptions
        Add ability to set column formatter from context menu
        Allow setting query refresh rates
    2022-07-16
        Add HTML component
        Added default queries when new chart added
        Reports - screenshot and HTML output can now run
        Reports - Add HTML table to email
        SQL Editor - Improved kdb support. Added console and list view for non-table objects
        Form parameters now use {"{arg}"} and ((arg))
    2022-07-08
        Add Dashboard history tracking to allow quick restoration of old versions
        Users can quick open favourite dashboards
        Add User Analytics
        Dashboard user arguments to URL allows bookmarking
        Add User logins
        Add reports / subscriptions CRUD
    2022-07-01
        Popouts which remember location
        Table context menu allows excel/csv download
    2022-06-01
        Add Screenshot capability
        Added SlickGrid table
        Automated .exe installer
        Added SQL editor.
        Alpha Release
            Dashboards - Ability to add charts/tables, save dashboards
            Automated Continuous Integration
