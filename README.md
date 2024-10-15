# Pulse

![Pulse](/multi-chart3-dark.jpg)

For more info see [timestored.com/pulse](http://timestored.com/pulse "timestored.com/pulse")

Pulse is an open source tool for real-time visual analysis, email reporting and alerting.
It allows you to create and share real-time interactive applications with your team.

Pulse supports 40+ databases including kdb, postgresql, mysql, ms sql, clickhouse. 
Databases that are wire compatible with postgres/mysql also work i.e. timescale, questdb, cockroachdb.

# 2.xx Releases

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
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
""  
