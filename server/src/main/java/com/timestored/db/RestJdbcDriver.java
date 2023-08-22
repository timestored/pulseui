package com.timestored.db;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import com.sqldashboards.shared.Curler;


/**
 * JDBC Driver for querying REST data sources with JSON/CSV data.
 * Uses {@link JsonResultSetBuilder} to convert JSON automatically to ResultSets.
 * Expected to convert XML / Strings / Almost anything in future.
 */
public class RestJdbcDriver extends BaseJdbcDriver {
	
	static {
		 try {
			java.sql.DriverManager.registerDriver (new RestJdbcDriver());
		} catch (SQLException e) {}
	}

	public static void main(String... args) throws ClassNotFoundException, SQLException {
		try (Connection conn = DriverManager.getConnection("jdbc:rest:", "bob", "pass")) {
			System.out.println("Connecting to database...");
			try(Statement stmt = conn.createStatement()) {
				try(ResultSet rs = stmt.executeQuery("https://api.github.com/search/repositories?q=more+useful+keyboard")) {
					while (rs.next()) {
						// Timestamp timestamp=rs.getTimestamp("timestamp");
						System.out.print(" a: " + rs.getString("name"));
						System.out.println(" s: " + rs.getString("fullName"));
					}
				}
			}
		}
	}

	public boolean acceptsURL(String s){return s.startsWith("jdbc:rest:");}

	@Override public ResultSet executeQry(String sql) throws IOException {
   	 String[] args = sql.split("\\|");
   	 String url = args[0];
   	 String path = args.length > 1 ? args[1] : "";
   	 String columns = args.length > 2 ? args[2] : "";
   	 
   	 String json = Curler.fetchURL(url, "GET", null);
   	return JsonResultSetBuilder.fromJSON(json, path, columns);
	}

}

