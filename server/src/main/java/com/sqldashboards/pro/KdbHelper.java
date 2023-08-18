/*******************************************************************************
 *
 *   $$$$$$$\            $$\                     
 *   $$  __$$\           $$ |                     
 *   $$ |  $$ |$$\   $$\ $$ | $$$$$$$\  $$$$$$\   
 *   $$$$$$$  |$$ |  $$ |$$ |$$  _____|$$  __$$\  
 *   $$  ____/ $$ |  $$ |$$ |\$$$$$$\  $$$$$$$$ |  
 *   $$ |      $$ |  $$ |$$ | \____$$\ $$   ____|  
 *   $$ |      \$$$$$$  |$$ |$$$$$$$  |\$$$$$$$\  
 *   \__|       \______/ \__|\_______/  \_______|
 *
 *  Copyright c 2022-2023 TimeStored
 *
 *  Licensed under the Reciprocal Public License RPL-1.5
 *  You may obtain a copy of the License at
 *
 *  https://opensource.org/license/rpl-1-5/
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 ******************************************************************************/
 
package com.sqldashboards.pro;

import java.text.DecimalFormat;
import java.text.NumberFormat;

/**
 * THIS CODE WAS COPY_PASTED FROM QSTUDIO.
 * Contains functions useful for handling KDb data structures and presenting them.
 */
public class KdbHelper {

	private static final NumberFormat NUM_FORMAT;
	public static final int DEFAULT_MAX_FRACTION_DIGITS = 7;
	private static int decimalPlaces = DEFAULT_MAX_FRACTION_DIGITS;
	
	static {
		NUM_FORMAT = NumberFormat.getInstance();
		setMaximumFractionDigits(decimalPlaces);
	}

	/**
	 * @param decimalPlaces the maximum number of fraction digits to be shown; 
	 * if less than zero, then zero is used.
	 */
	public static void setMaximumFractionDigits(int decimalPlaces) {
		if(decimalPlaces < 0) {
			decimalPlaces = 0;
		}
		 if (NUM_FORMAT instanceof DecimalFormat) {
			 NUM_FORMAT.setMaximumFractionDigits(decimalPlaces);
		 }
		 KdbHelper.decimalPlaces = decimalPlaces;
	}
	
	/**
	 * Flatten any KDB object into a single line, output similar to -3! in KDB. 
	 * But types will always be shown and tables will be shown differently.
	 * @param k a KDB result object
	 * @return String representation of the array or null if it could not convert.
	 */
	public static String asLine(Object k) {
		return asText(k, false, true);
	}
	

	/**
	 * Convert a kdb object to a string for display in a console etc.
	 * @param k a KDB result object
	 * @return String representation of the array or null if it could not convert.
	 */
	public static String asText(Object k) {
		return asText(k, false, false);
	}
	
	/**
	 * Convert a kdb object to a string for display in a console etc.
	 * @param k a KDB result object
	 * @return String representation of the array or null if it could not convert.
	 * @param singleLine Controls whether we spread over multiple lines and try to imitate kdb exactly.
	 */
	public static String asText(Object k, boolean forTable, boolean singleLine) {
		String s = null;
		return s + (singleLine ? "" : "\r\n");
	}	
	
	/**
	 * Flatten any KDB object into a single line, output similar to -3! in KDB. 
	 * But types will always be shown and tables will be shown differently.
	 * @param k a KDB result object
	 * @param forTable when displaying values in a table, nulls are shown as
	 * 		blanks and single items do not have their type shown.
	 * @return String representation of the array or null if it could not convert.
	 */
	public static String asLine(Object k, boolean forTable) {
		return asText(k, forTable, true);
	}


	/** 
	 * @return a topmost count of a KDB object, or -1 if unknown
	 */
	public static int count(Object k) {
		return 0;
	}
	

	
	/** For a KDB type number return the character for that type */
	public static char getTypeChar(int type) {
		final String typec = " b gxhijefcspmdznuvt";
		int t = Math.abs(type);
		if(t<typec.length()) {
			return typec.charAt(t);
		}
		return '?';
	}
	
	/**
	 * Take qCode and escape it so that it could be value'd.
	 * new lines are replaced with \r\n, tabs with \t etc.
	 */
	public static String escape(String qCode) {
		return qCode.replace("\\", "\\\\").replace("\t", "\\t")
				.replace("\r", "\\r").replace("\n", "\\n")
				.replace("\"", "\\\"");
	}

}


