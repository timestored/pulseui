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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import com.google.common.base.Preconditions;
import com.sqldashboards.dashy.ServerConfig;
import com.sqldashboards.shared.JdbcTypes;

public class ConnectionShortFormat {

	public static class ParseResult {
		
		/** Will hold {@link ServerConfig} is parsing was successful, otherwise null. */
		public final ServerConfig serverConfig;

		/**  "" means that ServerConfig was created ok, otherwise gives error details. */
		public final String report;
		public final String originalLine;
		
		public ParseResult(String originalLine, ServerConfig serverConfig) {
			this(originalLine, serverConfig, "");
		}
		
		public ParseResult(String originalLine, String error) {
			this(originalLine, null, error);
		}

		private ParseResult(String originalLine, ServerConfig serverConfig, String error) {
			this.serverConfig = serverConfig;
			this.report = error;
			this.originalLine = Objects.requireNonNull(originalLine);
		}
	}

	public static List<ParseResult> parse(String serverEntries, JdbcTypes defaultServerType, 
			JdbcTypes[] permittedJdbcTypes) {

		Objects.requireNonNull(defaultServerType);
		Objects.requireNonNull(permittedJdbcTypes);
		Set<JdbcTypes> permittedTypes = new HashSet<>(Arrays.asList(permittedJdbcTypes));
		Preconditions.checkArgument(permittedTypes.contains(defaultServerType));
		
		String[] serverLines = serverEntries.split("\n");
		List<ParseResult> r = new ArrayList<ParseResult>(serverLines.length);
		
		return r;
	}

	/**
	 * Compose the list of {@link ServerConfig}s into a single string.
	 * @return ShortFormat string, see class notes for details.
	 */
	public static String compose(List<ServerConfig> serverConfs, JdbcTypes defaultServerType) {
		
		StringBuilder sb = new StringBuilder();
		return sb.toString();
	}
}
