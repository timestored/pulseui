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

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import io.micronaut.core.annotation.Nullable;
import javax.persistence.Column;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

import io.micronaut.context.annotation.Executable;
import io.micronaut.core.annotation.Introspected;
import io.micronaut.data.annotation.DateCreated;
import io.micronaut.data.annotation.MappedEntity;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.data.repository.CrudRepository;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import lombok.Data;
import lombok.extern.java.Log;


@MappedEntity @Data @Introspected 
class PageView {
	@Id @GeneratedValue(strategy = GenerationType.AUTO) private Long id;
	@Column(length = 500, nullable = false) @NotBlank private String url;
	@NotNull private String path;
	@Column(length = 500, nullable = false)  private String search = "";
	@DateCreated private Instant dateCreated;
	@NotBlank @NotNull private String anonymousId;
	long dashId = -1;
	private String dashName;
	@Nullable String userId;

	void setSearch(String search) {
		this.search = search == null ? "" : search.length()>500 ? search.substring(0, 500) : search;
	}

	void setUrl(String url) {
		this.url = url == null ? "NULL" : url.length()>500 ? url.substring(0, 500) : url;
	}
}

@MappedEntity @Data @Introspected 
class Event {
	@Id @GeneratedValue(strategy = GenerationType.AUTO) private Long id;
	@NotBlank @NotNull private String event;
	@DateCreated private Instant dateCreated;
	@NotBlank @NotNull private String anonymousId;
	Long dashId;
	private String dashName;
	@Nullable String userId;
}

@JdbcRepository(dialect = Dialect.H2)  
interface PageViewRepository extends CrudRepository<PageView, Long> {
    @Executable PageView save(@Valid @NotNull PageView entity);
}


@JdbcRepository(dialect = Dialect.H2)  
interface EventRepository extends CrudRepository<Event, Long> {
    @Executable Event save(@Valid @NotNull Event entity);
}

@Secured(SecurityRule.IS_ANONYMOUS) @Log
@Controller("/api/analytics") // @ExecuteOn(TaskExecutors.IO)
public class AnalyticsController {
	@Inject PageViewRepository pRepo;
	@Inject EventRepository eRepo;

	@Post("/page")
	public HttpResponse<String> upsert(@Body @Valid PageView pageView) {
		try {
			if(pageView.getUserId() == null) { pageView.setUserId(""); }
			pageView.setDashId(-1);
			pageView.setDashName("");
			// If it's a dashboard view try to efficiently store that ID 
			String p = pageView.getPath();
			if(p.startsWith("/dash/")) {
				String q = p.substring(6);
				if(q.length() > 0 && q.contains("/")) {
					String num = q.substring(0, q.indexOf("/"));
					String title = q.substring(q.indexOf("/")+1);
					try {
						title = java.net.URLDecoder.decode(title, StandardCharsets.UTF_8.name());
					} catch (UnsupportedEncodingException e1) { }
					try {
						long l = Long.parseLong(num);
						pageView.setDashId(l);
						pageView.setDashName(title);
					} catch(NumberFormatException e) {}
				}
			}
			pRepo.save(pageView);
		} catch(RuntimeException e) {
			log.info("pageview failed " + e.getLocalizedMessage());
		}
		return HttpResponse.ok("{}");
	}
	

	@Post("/event")
	public HttpResponse<String> upsert(@Body @Valid Event event) {
		try {
			if(event.getUserId() == null) { event.setUserId(""); }
			if(event.getDashId() == null) { event.setDashId(-1l); }
			if(event.getDashName() == null) { event.setDashName(""); }
			eRepo.save(event);
		} catch(RuntimeException e) {
			log.info("event failed " + e.getLocalizedMessage());
		}
		return HttpResponse.ok("{}");
	}	

	@Get("/stringy")  public String stringy() { return "OKEY"; }
}
