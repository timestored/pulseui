package com.sqldashboards.dashy;

import lombok.RequiredArgsConstructor;

import java.io.*;
import java.math.*;
import java.sql.*;
import java.net.URL;
import java.util.Calendar;
import java.util.Map;
import java.util.Properties;
import java.util.logging.Logger;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.sqldashboards.shared.Curler;

import java.util.concurrent.Executor;


/**
 * JDBC Driver for querying REST data sources with JSON/CSV data.
 * Uses {@link JsonResultSetBuilder} to convert JSON automatically to ResultSets.
 * Expected to convert XML / Strings / Almost anything in future.
 */
public class RestJdbcDriver implements Driver{
	
	public static interface ToStringer { String asLine(Object k); };
	private static ToStringer toStringer = null;
	private static final int V = 0;
	private static final int v = 0;
	/** Allow setting a toString method for type=0. Used to show KdbHelper.asLine from Pulse **/
	public static void setToStringer(ToStringer toStringer) { RestJdbcDriver.toStringer = toStringer; }
	
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
	
private static void O(String s){System.out.println(s);}


private String u = "";
private String pas = "";

public int getMajorVersion(){return V;}
public int getMinorVersion(){return v;}
public boolean jdbcCompliant(){return false;}
public boolean acceptsURL(String s){return s.startsWith("jdbc:rest:");}

public Connection connect(String s,Properties p)throws SQLException{
	if(!acceptsURL(s)) {
		return null;
	}
	String hpe = s.substring("jdbc:rest:".length());
	u = p!=null?""+p.get("user"):"";
	pas = p!=null?""+p.get("password"):"";
	return new co(hpe,u,pas);
}

public DriverPropertyInfo[]getPropertyInfo(String s,Properties p)throws SQLException{return new DriverPropertyInfo[0];}
static{try{DriverManager.registerDriver(new RestJdbcDriver());}catch(Exception e){O(e.getMessage());}}
//static int[]SQLTYPE={0,16,0,0,-2,5,4,-5,7,8,0,12,0 ,0 ,91,93,0 ,0 ,0 ,92};
  static int[]SQLTYPE={0,16,0,0,-2,5,4,-5,7,8,0,12,93,91,91,93,93,92,92,92}; //  @RYAN updated to be better compatible. Return time column more often.
//static String[]TYPE={"","boolean","","","byte","short","int","long","real","float","char","symbol","","month","date","timestamp","","minute","second","time"};
  static String[]TYPE={"","boolean","","","byte","short","int","long","real","float","char","symbol","timestamp","month","date","timestamp","timespan","minute","second","time" };
static int find(String[]x,String s){
  int i=0;
  while(i<x.length&&!s.equals(x[i]))++i;
  return i;
}
static int find(int[]x,int j){
  int i=0;
  while(i<x.length&&x[i]!=j)++i;
  return i;
}
static void q(String s)throws SQLException{throw new SQLException(s);}
static void q()throws SQLException{throw new SQLFeatureNotSupportedException("nyi");}
static void q(Exception e)throws SQLException{throw new SQLException(e.getMessage());}

@RequiredArgsConstructor
public static class co implements Connection{
 private final String s;
private final String u;
private final String p;

 public Object getMoreRows()throws SQLException{
     throw new SQLException("getMoreRows unsupported");
 }
 
 private boolean autocommit=true;
 private boolean readOnly;
 public void setAutoCommit(boolean b)throws SQLException{autocommit=b;}
 public boolean getAutoCommit()throws SQLException{return autocommit;}
 public void rollback()throws SQLException{}
 public void commit()throws SQLException{}
 public boolean isClosed()throws SQLException{return false;}
 public Statement createStatement()throws SQLException{return new st(this);}
 public DatabaseMetaData getMetaData()throws SQLException{return new dm(this);}
 public PreparedStatement prepareStatement(String s)throws SQLException{return new ps(this,s);}
 public CallableStatement prepareCall(String s)throws SQLException{return new cs(this,s);}
 public String nativeSQL(String s)throws SQLException{return s;}
 private int i=TRANSACTION_SERIALIZABLE;
 private int h=ResultSet.HOLD_CURSORS_OVER_COMMIT;
 public void setReadOnly(boolean x)throws SQLException{readOnly=x;}
 public boolean isReadOnly()throws SQLException{return readOnly;}
 public void setCatalog(String s)throws SQLException{q("setCatalog not supported");}
 public String getCatalog()throws SQLException{q("getCatalog not supported");return null;}
 public void setTransactionIsolation(int x)throws SQLException{i=x;}
 public int getTransactionIsolation()throws SQLException{return i;}
 public SQLWarning getWarnings()throws SQLException{return null;}
 public void clearWarnings()throws SQLException{}
 public void close()throws SQLException{ }
 public Statement createStatement(int resultSetType,int resultSetConcurrency)throws SQLException{return new st(this);}
 public PreparedStatement prepareStatement(String s,int resultSetType,int resultSetConcurrency)throws SQLException{return new ps(this,s);}
 public CallableStatement prepareCall(String s,int resultSetType,int resultSetConcurrency)throws SQLException{return new cs(this,s);}
 public Map<String, Class<?>> getTypeMap()throws SQLException{return null;}
 public void setTypeMap(Map map)throws SQLException{}
//3
 public void setHoldability(int holdability)throws SQLException{h=holdability;}
 public int getHoldability()throws SQLException{return h;}
 public Savepoint setSavepoint()throws SQLException{q("setSavepoint not supported");return null;}
 public Savepoint setSavepoint(String name)throws SQLException{q("setSavepoint not supported");return null;}
 public void rollback(Savepoint savepoint)throws SQLException{}
 public void releaseSavepoint(Savepoint savepoint)throws SQLException{}
 public Statement createStatement(int resultSetType,int resultSetConcurrency,int resultSetHoldability)throws SQLException{return new st(this);}
 public PreparedStatement prepareStatement(String s,int resultSetType,int resultSetConcurrency,int resultSetHoldability)throws SQLException{return new ps(this,s);}
 public CallableStatement prepareCall(String s,int resultSetType,int resultSetConcurrency,int resultSetHoldability)throws SQLException{return new cs(this,s);}
 public PreparedStatement prepareStatement(String s,int autoGeneratedKeys)throws SQLException{return new ps(this,s);}
 public PreparedStatement prepareStatement(String s,int[]columnIndexes)throws SQLException{return new ps(this,s);}
 public PreparedStatement prepareStatement(String s,String[]columnNames)throws SQLException{return new ps(this,s);}
//4
 private Properties clientInfo=new Properties();
 public Clob createClob()throws SQLException{q();return null;}
 public Blob createBlob()throws SQLException{q();return null;}
 public NClob createNClob()throws SQLException{q();return null;}
 public SQLXML createSQLXML()throws SQLException{q();return null;}
 public boolean isValid(int i)throws SQLException{ return true; }
 public void setClientInfo(String k, String v)throws SQLClientInfoException{clientInfo.setProperty(k,v);}
 public void setClientInfo(Properties p)throws SQLClientInfoException{clientInfo=p;}
 public String getClientInfo(String k)throws SQLException{return (String)clientInfo.get(k);}
 public Properties getClientInfo()throws SQLException{return clientInfo;}
 public Array createArrayOf(String string, Object[] os)throws SQLException{q();return null;}
 public Struct createStruct(String string, Object[] os)throws SQLException{q();return null;}
 public <T> T unwrap(Class<T> type)throws SQLException{q();return null;}
 public boolean isWrapperFor(Class<?> type)throws SQLException{q();return false;}
//1.7
 public int getNetworkTimeout()throws SQLFeatureNotSupportedException{throw new SQLFeatureNotSupportedException("nyi");}
 public void setNetworkTimeout(Executor executor,int milliseconds)throws SQLFeatureNotSupportedException{throw new SQLFeatureNotSupportedException("nyi");}
 public void abort(Executor executor)throws SQLFeatureNotSupportedException{throw new SQLFeatureNotSupportedException("nyi");}
 public void setSchema(String s){}
 public String getSchema(){return null;}
}

public static class st implements Statement{
 private co co;
 private ResultSet resultSet;
 private int maxRows=0;
 private int timeOut;
 private int fetchSize=0;
 protected Object[]p={};
 public st(co x){co=x;}
 
 public int executeUpdate(String s)throws SQLException{
	 executeQuery(s);
	 return 0;
}
 
 public ResultSet executeQuery(String s)throws SQLException{
   if(!execute(s))q("Statement did not produce a ResultSet");
   return getResultSet();
 }
 
 public boolean execute(String s)throws SQLException{
	 String val = Curler.fetchURL(s, "GET", null);
     try {
		resultSet = JsonResultSetBuilder.fromJSON(val);
	} catch (JsonProcessingException e) {
		throw new SQLException(e);
	} 
     return true;
 }
 
 public ResultSet getResultSet()throws SQLException{return resultSet;}
 public int getUpdateCount(){return -1;}
 public int getMaxRows()throws SQLException{return maxRows;}
 public void setMaxRows(int n)throws SQLException{
   if(n<0)
     q("setMaxRows(int), rows must be >=0. Passed "+n);
   maxRows=n;
 }
 public int getQueryTimeout()throws SQLException{return timeOut;}
 public void setQueryTimeout(int i)throws SQLException{timeOut=i;}
 // truncate excess BINARY,VARBINARY,LONGVARBINARY,CHAR,VARCHAR,and LONGVARCHAR fields
 public int getMaxFieldSize()throws SQLException{return 0;}
 public void setMaxFieldSize(int i)throws SQLException{}
 public void setEscapeProcessing(boolean b)throws SQLException{}
 public void cancel()throws SQLException{}
 public SQLWarning getWarnings()throws SQLException{return null;}
 public void clearWarnings()throws SQLException{}
 // positioned update? different statement?
 public void setCursorName(String name)throws SQLException{q("setCursorName not supported");}
 public boolean getMoreResults()throws SQLException{return false;}
 public void close()throws SQLException{
  if(resultSet!=null)
    resultSet.close();
  resultSet=null;
  co=null;
 }
 public void setFetchDirection(int direction)throws SQLException{q("setFetchDirection not supported");}
 public int getFetchDirection()throws SQLException{return 0;}
 public void setFetchSize(int rows)throws SQLException{
  if(fetchSize<0)
    throw new SQLException("setFetchSize(rows), rows must be >=0. Passed"+fetchSize);
  fetchSize=rows;
 }
 public int getFetchSize()throws SQLException{return fetchSize;}
 public int getResultSetConcurrency()throws SQLException{return ResultSet.CONCUR_READ_ONLY;}
 public int getResultSetType()throws SQLException{return ResultSet.TYPE_SCROLL_INSENSITIVE;}
 public void addBatch(String sql)throws SQLException{q("addBatch not supported");}
 public void clearBatch()throws SQLException{}
 public int[]executeBatch()throws SQLException{return new int[0];}
 public Connection getConnection()throws SQLException{return co;}
//3
 public boolean getMoreResults(int current)throws SQLException{return false;}
 public ResultSet getGeneratedKeys()throws SQLException{return null;}
 public int executeUpdate(String sql,int autoGeneratedKeys)throws SQLException{q("a");return 0;}
 public int executeUpdate(String sql,int[]columnIndexes)throws SQLException{q("a");return 0;}
 public int executeUpdate(String sql,String[]columnNames)throws SQLException{q("a");return 0;}
 public boolean execute(String sql,int autoGeneratedKeys)throws SQLException{q("a");return false;}
 public boolean execute(String sql,int[]columnIndexes)throws SQLException{q("a");return false;}
 public boolean execute(String sql,String[]columnNames)throws SQLException{q("a");return false;}
 public int getResultSetHoldability()throws SQLException{return ResultSet.HOLD_CURSORS_OVER_COMMIT;}
//4
 boolean poolable=false;
 public boolean isClosed()throws SQLException{return co==null||co.isClosed();}
 public void setPoolable(boolean b)throws SQLException{
  if(isClosed())
    throw new SQLException("Closed");
  poolable=b;
 }
 public boolean isPoolable()throws SQLException{
  if(isClosed())
    throw new SQLException("Closed");
  return poolable;
 }
 public <T> T unwrap(Class<T> type)throws SQLException{q();return null;}
 public boolean isWrapperFor(Class<?> type)throws SQLException{q();return false;}
//1.7
 boolean _closeOnCompletion=false;
 public void closeOnCompletion(){_closeOnCompletion=true;}
 public boolean isCloseOnCompletion(){return _closeOnCompletion;}
}

public static class ps extends st implements PreparedStatement{
 private String s;
 public ps(co co,String x){super(co);s=x;}
 public ResultSet executeQuery()throws SQLException{return executeQuery(s);}
 public int executeUpdate()throws SQLException{return executeUpdate(s);}
 public boolean execute()throws SQLException{return execute(s);}
 public void clearParameters()throws SQLException{q("err");}
 public void setObject(int i,Object x)throws SQLException{q("err"); }
 public void setObject(int i,Object x,int targetSqlType)throws SQLException{setObject(i,x);}
 public void setObject(int i,Object x,int targetSqlType,int scale)throws SQLException{setObject(i,x);}
 public void setNull(int i,int t)throws SQLException{q("err");}
 public void setBoolean(int i,boolean x)throws SQLException{setObject(i,Boolean.valueOf(x));}
 public void setByte(int i,byte x)throws SQLException{setObject(i,Byte.valueOf(x));}
 public void setShort(int i,short x)throws SQLException{setObject(i,Short.valueOf(x));}
 public void setInt(int i,int x)throws SQLException{setObject(i,Integer.valueOf(x));}
 public void setLong(int i,long x)throws SQLException{setObject(i,Long.valueOf(x));}
 public void setFloat(int i,float x)throws SQLException{setObject(i,Float.valueOf(x));}
 public void setDouble(int i,double x)throws SQLException{setObject(i,Double.valueOf(x));}
 public void setString(int i,String x)throws SQLException{setObject(i,x);}
 public void setDate(int i,Date x)throws SQLException{setObject(i,x);}
 public void setTime(int i,Time x)throws SQLException{setObject(i,x);}
 public void setTimestamp(int i,Timestamp x)throws SQLException{setObject(i,x);}
 public void setBytes(int i,byte[] x)throws SQLException{q();}
 public void setBigDecimal(int i,BigDecimal x)throws SQLException{q();}
 public void setAsciiStream(int i,InputStream x,int length)throws SQLException{q();}
 @Deprecated
 public void setUnicodeStream(int i,InputStream x,int length)throws SQLException{q();}
 public void setBinaryStream(int i,InputStream x,int length)throws SQLException{q();}
 public void addBatch()throws SQLException{}
 public void setCharacterStream(int parameterIndex,Reader reader,int length)throws SQLException{q();}
 public void setRef(int i,Ref x)throws SQLException{q();}
 public void setBlob(int i,Blob x)throws SQLException{q();}
 public void setClob(int i,Clob x)throws SQLException{q();}
 public void setArray(int i,Array x)throws SQLException{q();}
 public ResultSetMetaData getMetaData()throws SQLException{q("getMetaData not supported");return null;}
 public void setDate(int parameterIndex,Date x,Calendar cal)throws SQLException{q();}
 public void setTime(int parameterIndex,Time x,Calendar cal)throws SQLException{q();}
 public void setTimestamp(int parameterIndex,Timestamp x,Calendar cal)throws SQLException{q();}
 public void setNull(int paramIndex,int sqlType,String typeName)throws SQLException{q();}
//3
 public void setURL(int parameterIndex,URL x)throws SQLException{q();}
 public ParameterMetaData getParameterMetaData()throws SQLException{q("getParameterMetaData not supported");return null;}
//4
 public void setRowId(int i,RowId rowid)throws SQLException{q();}
 public void setNString(int i,String string)throws SQLException{q();}
 public void setNCharacterStream(int i,Reader reader,long l)throws SQLException{q();}
 public void setNClob(int i,NClob nclob)throws SQLException{q();}
 public void setClob(int i,Reader reader, long l)throws SQLException{q();}
 public void setBlob(int i,InputStream in, long l)throws SQLException{q();}
 public void setNClob(int i,Reader reader, long l)throws SQLException{q();}
 public void setSQLXML(int i,SQLXML sqlxml)throws SQLException{q();}
 public void setAsciiStream(int i,InputStream in,long l)throws SQLException{q();}
 public void setBinaryStream(int i,InputStream in,long l)throws SQLException{q();}
 public void setCharacterStream(int i,Reader reader,long l)throws SQLException{q();}
 public void setAsciiStream(int i,InputStream in)throws SQLException{q();}
 public void setBinaryStream(int i,InputStream in)throws SQLException{q();}
 public void setCharacterStream(int i,Reader reader)throws SQLException{q();}
 public void setNCharacterStream(int i,Reader reader)throws SQLException{q();}
 public void setClob(int i,Reader reader)throws SQLException{q();}
 public void setBlob(int i,InputStream in)throws SQLException{q();}
 public void setNClob(int i,Reader reader)throws SQLException{q();}
}

public static class cs extends ps implements CallableStatement{
 public cs(co c,String s){super(c,s);}
 public void registerOutParameter(int i,int sqlType)throws SQLException{}
 public void registerOutParameter(int i,int sqlType,int scale)throws SQLException{}
 public boolean wasNull()throws SQLException{return false;}
 public String getString(int i)throws SQLException{return null;}
 public boolean getBoolean(int i)throws SQLException{return false;}
 public byte getByte(int i)throws SQLException{return 0;}
 public short getShort(int i)throws SQLException{return 0;}
 public int getInt(int i)throws SQLException{return 0;}
 public long getLong(int i)throws SQLException{return 0;}
 public float getFloat(int i)throws SQLException{return(float)0.0;}
 public double getDouble(int i)throws SQLException{return 0.0;}
 @Deprecated
 public BigDecimal getBigDecimal(int i,int scale)throws SQLException{return null;}
 public Date getDate(int i)throws SQLException{return null;}
 public Time getTime(int i)throws SQLException{return null;}
 public Timestamp getTimestamp(int i)throws SQLException{return null;}
 public byte[]getBytes(int i)throws SQLException{return null;}
 public Object getObject(int i)throws SQLException{return null;}
 public BigDecimal getBigDecimal(int parameterIndex)throws SQLException{q();return null;}
 public Object getObject(int i,Map map)throws SQLException{q();return null;}
 public Ref getRef(int i)throws SQLException{q();return null;}
 public Blob getBlob(int i)throws SQLException{q();return null;}
 public Clob getClob(int i)throws SQLException{q();return null;}
 public Array getArray(int i)throws SQLException{q();return null;}
 public Date getDate(int parameterIndex,Calendar cal)throws SQLException{q();return null;}
 public Time getTime(int parameterIndex,Calendar cal)throws SQLException{q();return null;}
 public Timestamp getTimestamp(int parameterIndex,Calendar cal)throws SQLException{q();return null;}
 public void registerOutParameter(int paramIndex,int sqlType,String typeName)throws SQLException{q();}
//3
 public void registerOutParameter(String parameterName,int sqlType)throws SQLException{q();}
 public void registerOutParameter(String parameterName,int sqlType,int scale)throws SQLException{q();}
 public void registerOutParameter(String parameterName,int sqlType,String typeName)throws SQLException{q();}
 public URL getURL(int parameterIndex)throws SQLException{q();return null;}
 public void setURL(String parameterName,URL val)throws SQLException{q();}
 public void setNull(String parameterName,int sqlType)throws SQLException{q();}
 public void setBoolean(String parameterName,boolean x)throws SQLException{q();}
 public void setByte(String parameterName,byte x)throws SQLException{q();}
 public void setShort(String parameterName,short x)throws SQLException{q();}
 public void setInt(String parameterName,int x)throws SQLException{q();}
 public void setLong(String parameterName,long x)throws SQLException{q();}
 public void setFloat(String parameterName,float x)throws SQLException{q();}
 public void setDouble(String parameterName,double x)throws SQLException{q();}
 public void setBigDecimal(String parameterName,BigDecimal x)throws SQLException{q();}
 public void setString(String parameterName,String x)throws SQLException{q();}
 public void setBytes(String parameterName,byte[]x)throws SQLException{q();}
 public void setDate(String parameterName,Date x)throws SQLException{q();}
 public void setTime(String parameterName,Time x)throws SQLException{q();}
 public void setTimestamp(String parameterName,Timestamp x)throws SQLException{q();}
 public void setAsciiStream(String parameterName,InputStream x,int length)throws SQLException{q();}
 public void setBinaryStream(String parameterName,InputStream x,int length)throws SQLException{q();}
 public void setObject(String parameterName,Object x,int targetSqlType,int scale)throws SQLException{q();}
 public void setObject(String parameterName,Object x,int targetSqlType)throws SQLException{q();}
 public void setObject(String parameterName,Object x)throws SQLException{q();}
 public void setCharacterStream(String parameterName,Reader reader,int length)throws SQLException{q();}
 public void setDate(String parameterName,Date x,Calendar cal)throws SQLException{q();}
 public void setTime(String parameterName,Time x,Calendar cal)throws SQLException{q();}
 public void setTimestamp(String parameterName,Timestamp x,Calendar cal)throws SQLException{q();}
 public void setNull(String parameterName,int sqlType,String typeName)throws SQLException{q();}
 public String getString(String parameterName)throws SQLException{return null;}
 public boolean getBoolean(String parameterName)throws SQLException{return false;}
 public byte getByte(String parameterName)throws SQLException{return 0;}
 public short getShort(String parameterName)throws SQLException{return 0;}
 public int getInt(String parameterName)throws SQLException{return 0;}
 public long getLong(String parameterName)throws SQLException{return 0;}
 public float getFloat(String parameterName)throws SQLException{return 0;}
 public double getDouble(String parameterName)throws SQLException{return 0;}
 public byte[]getBytes(String parameterName)throws SQLException{return null;}
 public Date getDate(String parameterName)throws SQLException{return null;}
 public Time getTime(String parameterName)throws SQLException{return null;}
 public Timestamp getTimestamp(String parameterName)throws SQLException{return null;}
 public Object getObject(String parameterName)throws SQLException{return null;}
 public BigDecimal getBigDecimal(String parameterName)throws SQLException{return null;}
 public Object getObject(String parameterName,Map map)throws SQLException{return null;}
 public Ref getRef(String parameterName)throws SQLException{return null;}
 public Blob getBlob(String parameterName)throws SQLException{return null;}
 public Clob getClob(String parameterName)throws SQLException{return null;}
 public Array getArray(String parameterName)throws SQLException{return null;}
 public Date getDate(String parameterName,Calendar cal)throws SQLException{return null;}
 public Time getTime(String parameterName,Calendar cal)throws SQLException{return null;}
 public Timestamp getTimestamp(String parameterName,Calendar cal)throws SQLException{return null;}
 public URL getURL(String parameterName)throws SQLException{return null;}
//4
 public RowId getRowId(int i)throws SQLException{q();return null;}
 public RowId getRowId(String string)throws SQLException{q();return null;}
 public void setRowId(String string, RowId rowid)throws SQLException{q();}
 public void setNString(String string, String string1)throws SQLException{q();}
 public void setNCharacterStream(String string, Reader reader, long l)throws SQLException{q();}
 public void setNClob(String string, NClob nclob)throws SQLException{q();}
 public void setClob(String string, Reader reader, long l)throws SQLException{q();}
 public void setBlob(String string, InputStream in, long l)throws SQLException{q();}
 public void setNClob(String string, Reader reader, long l)throws SQLException{q();}
 public NClob getNClob(int i)throws SQLException{q();return null;}
 public NClob getNClob(String string)throws SQLException{q();return null;}
 public void setSQLXML(String string, SQLXML sqlxml)throws SQLException{q();}
 public SQLXML getSQLXML(int i)throws SQLException{q();return null;}
 public SQLXML getSQLXML(String string)throws SQLException{q();return null;}
 public String getNString(int i)throws SQLException{q();return null;}
 public String getNString(String string)throws SQLException{q();return null;}
 public Reader getNCharacterStream(int i)throws SQLException{q();return null;}
 public Reader getNCharacterStream(String string)throws SQLException{q();return null;}
 public Reader getCharacterStream(int i)throws SQLException{q();return null;}
 public Reader getCharacterStream(String string)throws SQLException{q();return null;}
 public void setBlob(String string, Blob blob)throws SQLException{q();}
 public void setClob(String string, Clob clob)throws SQLException{q();}
 public void setAsciiStream(String string, InputStream in, long l)throws SQLException{q();}
 public void setBinaryStream(String string, InputStream in, long l)throws SQLException{q();}
 public void setCharacterStream(String string, Reader reader, long l)throws SQLException{q();}
 public void setAsciiStream(String string, InputStream in)throws SQLException{q();}
 public void setBinaryStream(String string, InputStream in)throws SQLException{q();}
 public void setCharacterStream(String string, Reader reader)throws SQLException{q();}
 public void setNCharacterStream(String string, Reader reader)throws SQLException{q();}
 public void setClob(String string, Reader reader)throws SQLException{q();}
 public void setBlob(String string, InputStream in)throws SQLException{q();}
 public void setNClob(String string, Reader reader)throws SQLException{q();}
//1.7
 public <T>T getObject(String s,Class<T> t)throws SQLFeatureNotSupportedException{throw new SQLFeatureNotSupportedException("nyi");}
 public <T>T getObject(int parameterIndex,Class<T>t)throws SQLFeatureNotSupportedException{throw new SQLFeatureNotSupportedException("nyi");} 
}

private static final ResultSet EMPTY_RS = new SimpleResultSet(new String[] {"tabb"});

public static class dm implements DatabaseMetaData{
private co co;
public dm(co x){co=x;}
// supporting these top ones may be useful
 public ResultSet getCatalogs()throws SQLException{return EMPTY_RS;}
 public ResultSet getSchemas()throws SQLException{return EMPTY_RS;}
 public ResultSet getTableTypes()throws SQLException{return EMPTY_RS;}
 public ResultSet getTables(String a,String b,String t,String[] x)throws SQLException{return EMPTY_RS;}
 public ResultSet getTypeInfo()throws SQLException{return EMPTY_RS;}
 public ResultSet getColumns(String a,String b,String t,String c)throws SQLException{ return EMPTY_RS;}
 
 public ResultSet getPrimaryKeys(String a,String b,String t)throws SQLException{q("getPrimaryKeys not supported"); return EMPTY_RS;}
 public ResultSet getImportedKeys(String a,String b,String t)throws SQLException{q("getImportedKeys not supported");return EMPTY_RS;}
 public ResultSet getProcedures(String a,String b,String p)throws SQLException{q("getProcedures not supported");return EMPTY_RS;}
 public ResultSet getExportedKeys(String a,String b,String t)throws SQLException{q("getExportedKeys not supported");return null;}
 public ResultSet getCrossReference(String pa,String pb,String pt,String fa,String fb,String ft)throws SQLException{q("getCrossReference not supported");return null;}
 public ResultSet getIndexInfo(String a,String b,String t,boolean unique,boolean approximate)throws SQLException{q("getIndexInfo not supported");return null;}
 public ResultSet getProcedureColumns(String a,String b,String p,String c)throws SQLException{q("getProcedureColumns not supported");return null;}
// PROCEDURE_CAT PROCEDURE_SCHEM PROCEDURE_NAME ...
 public ResultSet getColumnPrivileges(String a,String b,String table,String columnNamePattern)throws SQLException{q("getColumnPrivileges not supported");return null;}
//select TABLE_CAT TABLE_SCHEM TABLE_NAME COLUMN_NAME GRANTOR GRANTEE PRIVILEGE IS_GRANTABLE ordered by COLUMN_NAME and PRIVILEGE.
 public ResultSet getTablePrivileges(String a,String b,String t)throws SQLException{q("getTablePrivileges not supported");return null;}
//select TABLE_CAT TABLE_SCHEM TABLE_NAME GRANTOR GRANTEE PRIVILEGE IS_GRANTABLE ordered by TABLE_SCHEM,TABLE_NAME,and PRIVILEGE.
 public ResultSet getBestRowIdentifier(String a,String b,String t,int scope,boolean nullable)throws SQLException{q("getBestRowIdentifier not supported");return null;}
//select SCOPE COLUMN_NAME DATA_TYPE TYPE_NAME COLUMN_SIZE DECIMAL_DIGITS PSEUDO_COLUMN ordered by SCOPE
 public ResultSet getVersionColumns(String a,String b,String t)throws SQLException{q("getVersionColumns not supported");return null;}
//select SCOPE COLUMN_NAME DATA_TYPE TYPE_NAME COLUMN_SIZE DECIMAL_DIGITS PSEUDO_COLUMN ordered by SCOPE
 public boolean allProceduresAreCallable()throws SQLException{return true;}
 public boolean allTablesAreSelectable()throws SQLException{return true;}
 public boolean dataDefinitionCausesTransactionCommit()throws SQLException{return false;}
 public boolean dataDefinitionIgnoredInTransactions()throws SQLException{return false;}
 public boolean doesMaxRowSizeIncludeBlobs()throws SQLException{return true;}
 public String getSchemaTerm()throws SQLException{return"schema";}
 public String getProcedureTerm()throws SQLException{return"procedure";}
 public String getCatalogTerm()throws SQLException{return"catalog";}
 public String getCatalogSeparator()throws SQLException{return".";}
 public int getMaxBinaryLiteralLength()throws SQLException{return 0;}
 public int getMaxCharLiteralLength()throws SQLException{return 0;}
 public int getMaxColumnNameLength()throws SQLException{return 0;}
 public int getMaxColumnsInGroupBy()throws SQLException{return 0;}
 public int getMaxColumnsInIndex()throws SQLException{return 0;}
 public int getMaxColumnsInOrderBy()throws SQLException{return 0;}
 public int getMaxColumnsInSelect()throws SQLException{return 0;}
 public int getMaxColumnsInTable()throws SQLException{return 0;}
 public int getMaxConnections()throws SQLException{return 0;}
 public int getMaxCursorNameLength()throws SQLException{return 0;}
 public int getMaxIndexLength()throws SQLException{return 0;}
 public int getMaxSchemaNameLength()throws SQLException{return 0;}
 public int getMaxProcedureNameLength()throws SQLException{return 0;}
 public int getMaxCatalogNameLength()throws SQLException{return 0;}
 public int getMaxRowSize()throws SQLException{return 0;}
 public int getMaxStatementLength()throws SQLException{return 0;}
 public int getMaxStatements()throws SQLException{return 0;}
 public int getMaxTableNameLength()throws SQLException{return 0;}
 public int getMaxTablesInSelect()throws SQLException{return 0;}
 public int getMaxUserNameLength()throws SQLException{return 0;}
 public int getDefaultTransactionIsolation()throws SQLException{return Connection.TRANSACTION_SERIALIZABLE;}
 public String getSQLKeywords()throws SQLException{return"show,meta,load,save";}
 public String getNumericFunctions()throws SQLException{return"";}
 public String getStringFunctions()throws SQLException{return"";}
 public String getSystemFunctions()throws SQLException{return"";}
 public String getTimeDateFunctions()throws SQLException{return"";}
 public String getSearchStringEscape()throws SQLException{return"";}
 public String getExtraNameCharacters()throws SQLException{return"";}
 public String getIdentifierQuoteString()throws SQLException{return"";}
 public String getURL()throws SQLException{return null;}
 public String getUserName()throws SQLException{return"";}
 public String getDatabaseProductName()throws SQLException{return"rest";}
 public String getDatabaseProductVersion()throws SQLException{return"2.0";}
 public String getDriverName()throws SQLException{return"jdbc";}
 public String getDriverVersion()throws SQLException{return V+"."+v;}
 public int getDriverMajorVersion(){return V;}
 public int getDriverMinorVersion(){return v;}
 public boolean isCatalogAtStart()throws SQLException{return true;}
 public boolean isReadOnly()throws SQLException{return false;}
 public boolean nullsAreSortedHigh()throws SQLException{return false;}
 public boolean nullsAreSortedLow()throws SQLException{return true;}
 public boolean nullsAreSortedAtStart()throws SQLException{return false;}
 public boolean nullsAreSortedAtEnd()throws SQLException{return false;}
 public boolean supportsMixedCaseIdentifiers()throws SQLException{return false;}
 public boolean storesUpperCaseIdentifiers()throws SQLException{return false;}
 public boolean storesLowerCaseIdentifiers()throws SQLException{return false;}
 public boolean storesMixedCaseIdentifiers()throws SQLException{return true;}
 public boolean supportsMixedCaseQuotedIdentifiers()throws SQLException{return true;}
 public boolean storesUpperCaseQuotedIdentifiers()throws SQLException{return false;}
 public boolean storesLowerCaseQuotedIdentifiers()throws SQLException{return false;}
 public boolean storesMixedCaseQuotedIdentifiers()throws SQLException{return true;}
 public boolean supportsAlterTableWithAddColumn()throws SQLException{return true;}
 public boolean supportsAlterTableWithDropColumn()throws SQLException{return true;}
 public boolean supportsTableCorrelationNames()throws SQLException{return true;}
 public boolean supportsDifferentTableCorrelationNames()throws SQLException{return true;}
 public boolean supportsColumnAliasing()throws SQLException{return true;}
 public boolean nullPlusNonNullIsNull()throws SQLException{return true;}
 public boolean supportsExpressionsInOrderBy()throws SQLException{return true;}
 public boolean supportsOrderByUnrelated()throws SQLException{return false;}
 public boolean supportsGroupBy()throws SQLException{return true;}
 public boolean supportsGroupByUnrelated()throws SQLException{return false;}
 public boolean supportsGroupByBeyondSelect()throws SQLException{return false;}
 public boolean supportsLikeEscapeClause()throws SQLException{return false;}
 public boolean supportsMultipleResultSets()throws SQLException{return false;}
 public boolean supportsMultipleTransactions()throws SQLException{return false;}
 public boolean supportsNonNullableColumns()throws SQLException{return true;}
 public boolean supportsMinimumSQLGrammar()throws SQLException{return true;}
 public boolean supportsCoreSQLGrammar()throws SQLException{return true;}
 public boolean supportsExtendedSQLGrammar()throws SQLException{return false;}
 public boolean supportsANSI92EntryLevelSQL()throws SQLException{return true;}
 public boolean supportsANSI92IntermediateSQL()throws SQLException{return false;}
 public boolean supportsANSI92FullSQL()throws SQLException{return false;}
 public boolean supportsIntegrityEnhancementFacility()throws SQLException{return false;}
 public boolean supportsOuterJoins()throws SQLException{return false;}
 public boolean supportsFullOuterJoins()throws SQLException{return false;}
 public boolean supportsLimitedOuterJoins()throws SQLException{return false;}
 public boolean supportsConvert()throws SQLException{return false;}
 public boolean supportsConvert(int fromType,int toType)throws SQLException{return false;}
 public boolean supportsSchemasInDataManipulation()throws SQLException{return false;}
 public boolean supportsSchemasInProcedureCalls()throws SQLException{return false;}
 public boolean supportsSchemasInTableDefinitions()throws SQLException{return false;}
 public boolean supportsSchemasInIndexDefinitions()throws SQLException{return false;}
 public boolean supportsSchemasInPrivilegeDefinitions()throws SQLException{return false;}
 public boolean supportsCatalogsInDataManipulation()throws SQLException{return false;}
 public boolean supportsCatalogsInProcedureCalls()throws SQLException{return false;}
 public boolean supportsCatalogsInTableDefinitions()throws SQLException{return false;}
 public boolean supportsCatalogsInIndexDefinitions()throws SQLException{return false;}
 public boolean supportsCatalogsInPrivilegeDefinitions()throws SQLException{return false;}
 public boolean supportsSelectForUpdate()throws SQLException{return false;}
 public boolean supportsPositionedDelete()throws SQLException{return false;}
 public boolean supportsPositionedUpdate()throws SQLException{return false;}
 public boolean supportsOpenCursorsAcrossCommit()throws SQLException{return true;}
 public boolean supportsOpenCursorsAcrossRollback()throws SQLException{return true;}
 public boolean supportsOpenStatementsAcrossCommit()throws SQLException{return true;}
 public boolean supportsOpenStatementsAcrossRollback()throws SQLException{return true;}
 public boolean supportsStoredProcedures()throws SQLException{return false;}
 public boolean supportsSubqueriesInComparisons()throws SQLException{return true;}
 public boolean supportsSubqueriesInExists()throws SQLException{return true;}
 public boolean supportsSubqueriesInIns()throws SQLException{return true;}
 public boolean supportsSubqueriesInQuantifieds()throws SQLException{return true;}
 public boolean supportsCorrelatedSubqueries()throws SQLException{return true;}
 public boolean supportsUnion()throws SQLException{return true;}
 public boolean supportsUnionAll()throws SQLException{return true;}
 public boolean supportsTransactions()throws SQLException{return true;}
 public boolean supportsTransactionIsolationLevel(int level)throws SQLException{return true;}
 public boolean supportsDataDefinitionAndDataManipulationTransactions()throws SQLException{return true;}
 public boolean supportsDataManipulationTransactionsOnly()throws SQLException{return false;}
 public boolean usesLocalFiles()throws SQLException{return false;}
 public boolean usesLocalFilePerTable()throws SQLException{return false;}
 public boolean supportsResultSetType(int type)throws SQLException{return type!=ResultSet.TYPE_SCROLL_SENSITIVE;}
 public boolean supportsResultSetConcurrency(int type,int concurrency)throws SQLException{return type==ResultSet.CONCUR_READ_ONLY;}
 public boolean ownUpdatesAreVisible(int type)throws SQLException{return false;}
 public boolean ownDeletesAreVisible(int type)throws SQLException{return false;}
 public boolean ownInsertsAreVisible(int type)throws SQLException{return false;}
 public boolean othersUpdatesAreVisible(int type)throws SQLException{return false;}
 public boolean othersDeletesAreVisible(int type)throws SQLException{return false;}
 public boolean othersInsertsAreVisible(int type)throws SQLException{return false;}
 public boolean updatesAreDetected(int type)throws SQLException{return false;}
 public boolean deletesAreDetected(int type)throws SQLException{return false;}
 public boolean insertsAreDetected(int type)throws SQLException{return false;}
 public boolean supportsBatchUpdates()throws SQLException{return false;}
 public ResultSet getUDTs(String catalog,String schemaPattern,String typeNamePattern,int[]types)throws SQLException{return null;}
 public Connection getConnection()throws SQLException{return co;}
//3
 public boolean supportsSavepoints()throws SQLException{return false;}
 public boolean supportsNamedParameters()throws SQLException{return false;}
 public boolean supportsMultipleOpenResults()throws SQLException{return false;}
 public boolean supportsGetGeneratedKeys()throws SQLException{return false;}
 public ResultSet getSuperTypes(String catalog,String schemaPattern,String typeNamePattern)throws SQLException{return null;}
 public ResultSet getSuperTables(String catalog,String schemaPattern,String tableNamePattern)throws SQLException{return null;}
 public ResultSet getAttributes(String catalog,String schemaPattern,String typeNamePattern,String attributeNamePattern)throws SQLException{return null;}
 public boolean supportsResultSetHoldability(int holdability)throws SQLException{return false;}
 public int getResultSetHoldability()throws SQLException{return 0;}
 public int getDatabaseMajorVersion()throws SQLException{return 0;}
 public int getDatabaseMinorVersion()throws SQLException{return 0;}
 public int getJDBCMajorVersion()throws SQLException{return 0;}
 public int getJDBCMinorVersion()throws SQLException{return 0;}
 public int getSQLStateType()throws SQLException{return 0;}
 public boolean locatorsUpdateCopy()throws SQLException{return false;}
 public boolean supportsStatementPooling()throws SQLException{return false;}
//4
 public RowIdLifetime getRowIdLifetime()throws SQLException{q();return null;}
 public ResultSet getSchemas(String string, String string1)throws SQLException{q();return null;}
 public boolean supportsStoredFunctionsUsingCallSyntax()throws SQLException{q();return false;}
 public boolean autoCommitFailureClosesAllResultSets()throws SQLException{q();return false;}
 public ResultSet getClientInfoProperties()throws SQLException{q();return null;}
 public ResultSet getFunctions(String string, String string1, String string2)throws SQLException{q();return null;}
 public ResultSet getFunctionColumns(String string, String string1, String string2, String string3)throws SQLException{q();return null;}
 public <T> T unwrap(Class<T> type)throws SQLException{q();return null;}
 public boolean isWrapperFor(Class<?> type)throws SQLException{q();return false;}
//1.7
 public boolean generatedKeyAlwaysReturned(){return false;}
 public ResultSet getPseudoColumns(String catalog,String schemaPattern,String tableNamePattern,String columnNamePattern)throws SQLFeatureNotSupportedException{throw new SQLFeatureNotSupportedException("nyi");}
}
//1.7
 public Logger getParentLogger()throws SQLFeatureNotSupportedException{throw new SQLFeatureNotSupportedException("nyi");}



}

