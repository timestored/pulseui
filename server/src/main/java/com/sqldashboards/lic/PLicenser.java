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
 
package com.sqldashboards.lic;

public class PLicenser {

	/**
	 * @param signedLicense A digitally signed license
	 * @return true if license was accepted and set, otherwise false.
	 */
	public static boolean setSignedLicense(String signedLicense) {
		return true;
	}
	
	public static String getLicenseText() { return "Pulse Community Edition"; }
	public static String getLicenseUser() { return getLicenseText(); }
	public static boolean isPro() { return true; }
	public static boolean isPermissioned() { return true; }
	public static int getNumberUsers() { return 2000; }
	public static int getDaysLicenseLeft() { return 220; }
	
}

