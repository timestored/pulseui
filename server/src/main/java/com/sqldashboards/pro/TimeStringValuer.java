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

import com.sqldashboards.dashy.StringValue;


/**
 * Converts common date/time formats to a more presentable form,
 * including showing nano seconds etc which generally are not supported elsewhere.
 * Most the logic for showing data in tables or as strings for both sqlDashboards and qStudio goes here,
 * so that the logic is shared.
 */
class TimeStringValuer implements StringValue {
	

	/**
	 * @param overidingStringFormatter A function that if it returns non-null will be used
	 * first to return the value of a single item. Overiding nested structures is not possible.
	 */
	public TimeStringValuer(StringValue overidingStringFormatter) {
	}
	
	public TimeStringValuer() { this(null); }
	
	@Override public String getString(Object o) {
		if(o == null) {
			return "";
		}
		return "";
	}
	 

	public static String trimTrailingPointZeroes(String numString) {
		int dotPos = numString.lastIndexOf(".");
		if(dotPos==-1) {
			return numString;
		} else {
			int lastIdx = numString.length();
			while(numString.charAt(lastIdx-1)=='0') {
				lastIdx--;
			}
			if(numString.charAt(lastIdx-1)=='.') {
				lastIdx--;
			}
			return numString.substring(0, lastIdx);
		}
	}

 }