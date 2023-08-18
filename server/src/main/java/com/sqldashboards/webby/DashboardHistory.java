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

import javax.persistence.Column;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Lob;

import java.time.Instant;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

import io.micronaut.core.annotation.Introspected;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.data.annotation.MappedEntity;
import lombok.Data;

/**
 * Note this entity is a copy of Dashboard but to allow for storing of history with JPA. 
 */
@MappedEntity @Data @Introspected 
public class DashboardHistory {

	public DashboardHistory() { }
	public DashboardHistory(Dashboard o) {
		this.id = o.getId();
		this.version = o.getVersion();
		this.name = o.getName(); 
		this.defaultParams = o.getDefaultParams();
		this.dateCreated = o.getDateCreated();
		this.dateUpdated = o.getDateUpdated();
		this.data = o.getData();
	}
	
	public Dashboard toDashboard() {
		Dashboard d = new Dashboard();
		d.setId(this.getId());
		d.setVersion(this.getVersion()); // ??????
		d.setName(this.getName());
		d.setData(this.getData());
		d.setDateCreated(this.getDateCreated());
		d.setDateUpdated(this.getDateUpdated());
		return d;
	}

	@Id @GeneratedValue(strategy = GenerationType.AUTO) private Long dashboardHistoryId;
	@NotBlank @NotNull private Long id;
	@NotBlank @NotNull private Long version;
	@NotBlank @NotNull private String name;
    
	@Column(length = 2000, nullable = false) @NotNull private String defaultParams;
	@NotBlank @NotNull private Instant dateCreated;
	@NotBlank @NotNull private Instant dateUpdated;
	@Nullable @Lob @Column(length = 10200300, columnDefinition = "CLOB")
	private String data;

}