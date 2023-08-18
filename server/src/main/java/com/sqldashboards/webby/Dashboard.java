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
 
package com.sqldashboards.webby;

import java.time.Instant;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

import io.micronaut.core.annotation.Introspected;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.data.annotation.DateCreated;
import io.micronaut.data.annotation.DateUpdated;
import io.micronaut.data.annotation.MappedEntity;
import lombok.Data;

@MappedEntity @Data @Introspected 
public class Dashboard {

	/**
	 * Possible dashboard settings:
	 * 	- Allow user subscriptions? Why? If wanted reports filtered by user, better to send SOEID and filter on remote end?
	 *                    Alternative is only letting dash users select certain options e.g. USD PNL vs GBP PnL
	 */
	
	public Dashboard() { }
	public Dashboard(@NotNull String name) { this.name = name; this.id=-1l; this.defaultParams = ""; }

	public static Dashboard copy(Dashboard original) {
		Dashboard d = new Dashboard(original.name);
		d.setDefaultParams(original.getDefaultParams());
		d.setData(original.getData());
		d.setDateCreated(original.dateCreated);
		d.setDateUpdated(Instant.now());
		return d;
	}

	@Id @GeneratedValue(strategy = GenerationType.AUTO) private Long id;

	@Version private Long version;

	@NotBlank @NotNull @Column(name = "name", nullable = false, unique = true)
	private String name;

    @Column(length = 2000, nullable = false) private String defaultParams = "";
	
	public void setDefaultParams(String defaultParams) {
		this.defaultParams = defaultParams == null ? "" : defaultParams.length()>2000 ? defaultParams.substring(0, 2000) : defaultParams;
	}

	@DateCreated private Instant dateCreated;
	@DateUpdated private Instant dateUpdated;

	@Nullable @Lob @Column(length = 10200300, columnDefinition = "CLOB")
	private String data;

}
