# Pulse

![Pulse](/demos/multi-chart3-dark.jpg)

For more info see [timestored.com/pulse](http://timestored.com/pulse "timestored.com/pulse")

Pulse is an open source tool for real-time visual analysis, email reporting and alerting.
It allows you to create and share real-time interactive applications with your team.

Pulse supports 40+ databases including kdb, postgresql, mysql, ms sql, clickhouse. 
Databases that are wire compatible with postgres/mysql also work i.e. timescale, questdb, cockroachdb.

# Realtime SQL Data Apps

![Pulse Demo](/demos/pulse-silent-demo.gif)

# Notebooks

Pulse [SQL Notebooks](http://timestored.com/sqlnotebook) are a code-driven method for building data applications with SQL. 
This includes reports, analysis, monitoring and embedded dashboards. 
Notebooks allow someone that knows SQL and a little markdown to create beatiful fully interactive data applications.

For help getting started see: http://www.timestored.com/sqlnotebook

![Pulse Demo](/demos/notebooks-301.png)


# 3.xx Releases

    2025-04-22 - 3.16 - Add {{ALL}} variable
        remove auto_sign_up flag.
    2025-03-21 - 3.15 - Improve Git releases 
        Force process pl-config directory every 10 minutes to ensure even if symlinked, they get updated.
        Add file hash cache to reduce processing cost of git releases.
    2025-01-22 - 3.14 - Improve null and error handling to backend database processes from java server, particularly for kdb.
        Add KDB_ALWAYS_CLOSE_CONN_AFTER_USE - Specifically for enterprises that force close handles.
        Form editor - added align / disabled / large / inline option flags per form input.
    2024-12-21 - 3.13 - Date/time/minute timezone bugfix. 
        Upgrade duckdb to 1.1.3. #288 
        Grid click populates all variables.  #237 #255
        Slider form input allows specifying step size. #262
    2024-12-18 - 3.12 - Update NETTY version.
    2024-12-18 - 3.11 - H2 Database upgrade from v1 to v2, requires manual steps. Pulse now requires Java 11.
    
    2024-12-13 - 3.05 - MySQL/PostgreSQL driver upgrades. REST api bugfix.#282 #283.
    2024-12-10 - 3.04 - Larger code editor. #274.
        Add Sankey Options #273
        Heatmap decimal place formatting of labels as configured in UI. #273
        Pie Chart - Add selectedMode to legend. #278
        SQL Notebook - Add type='table' support to show full HTML tables rather than grid.
        SQL Notebook - Allow charts and tables to be nested to allow column layouts.
        Non-serif font for code editor blocks. #132
    2024-11-22 - 3.03 - Add custom chart configuration. Pie chart supports custom area color. #274 #188 #269 #209
    2024-11-20 - 3.02 - bugfix: Linux SERVER_HOST default fixed.
    2024-11-18 - 3.01 - Officially Released for everyone.
    2024-11-18 - 3.01 - Officially Released for everyone.
    2024-11-18 - 	SQL Notebooks - Add built-in demos, website examples and small CSS improvements.
    2024-11-15 - 	SQL Notebooks - Bugfixes and stability improvements. e.g. auto reconnect when pulse/qstudio restarts.
    2024-10-30 - 	SQL Notebooks - Improved support for links within documents.
    2024-10-28 - 	SQL Notebooks - Add support for nested code blocks ```` to allow showing code within code for demos.
    2024-10-24 - 	SQL Notebooks - Add offline mode - aka Snapshot to allow sharing a static version.
    2024-10-24 - 	SQL Notebooks - Support configuration attributes including height.
    2024-10-24 - 	SQL Notebooks - Add showcodeonly to allow displaying SQL code blocks.
    2024-10-16 - 	SQL Notebooks - Mobile now supported. Left and right menus shrink.
    2024-10-11 - 	SQL Notebooks - Now works in both QStudio and Pulse.
    2024-10-08 - 	SQL Notebooks - Add support for all chart types.
    2024-10-05 - 	SQL Notebooks - Allow notebook to be added within Pulse.
    2024-10-02 - 	SQL Notebooks - Add show query option. Add page and table of contents listing.
    2024-09-30 - 	SQL Notebooks initial test version given to select users for feedback.
    2024-09-28 - 	BabelDB, improve speed by using bulk inserts. (Benchmarks here)

A massive thanks to all those that helped us reach 3.0. Particularly Brian Luft and Rich Brown for all their creative input and testing.



# 2.xx Releases
	2024-06-18 - 2.32 - Add redshift driver.
	2024-05-21 - 2.31 - BabelDB, add support for nested arrays. Improve null handling.
	2024-05-14 - 2.30 - BabelDB improve time type support.
	2024-04-29 - 2.25 - Add File Based Import/Export. Improved logging.
	2024-04-14 - 2.24 - Add <a href='https://www.timestored.com/pulse/help/sankey-diagram'>Sankey Diagram</a>. Login bugfix.</li>
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
    2023-04-05 - Add Event Handlers to trigger queries and perform other actions in response to user interactions.
    2023-03-27 - Add User TimeZone Option. Allow author to toggle 1000s separator for numbers.
    2023-03-21 - Throttle dashboards if they are slow consuming messages
    2023-03-14 - Send websocket heartbeat to prevent timeouts
    2023-03-02 - Stability improvements for large dashboards.
    2023-02-22 - Interactive Dashboards, Chart Click Events, Table Click Events
    2023-02-04 - Add Metrics Panel Component
    2023-01-25 - Add demos for Dynamic HTML Component
    2023-01-16 - Add Dynamic HTML Component 
	2022-09-28 - UI Improvements
    2022-09-26 - Charts - Add horizontal bar chart and horizontal stack chart. Add Boxplot.
    2022-09-22 - Appearance - Various improvements and refinements to themes, forms, icons
    2022-08-24 - Add demos: stream liquidity, TAQ, candlestick
    2022-06-01 - First Release
