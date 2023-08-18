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

import java.security.Principal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import io.micronaut.core.annotation.Nullable;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.validation.Valid;
import javax.validation.constraints.NotNull;

import io.micronaut.context.annotation.Executable;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.annotation.Introspected;
import io.micronaut.data.annotation.MappedEntity;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.data.repository.CrudRepository;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Consumes;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NonNull;


@MappedEntity @Data @Introspected @AllArgsConstructor
class Subscription {
	@Id @GeneratedValue(strategy = GenerationType.AUTO) private Long id;
	private long userId;
	private long reportId;
	
	public Subscription(long userId, long reportId) {
		super();
		this.id = -1l;
		this.userId = userId;
		this.reportId = reportId;
	}
	
	
}

@JdbcRepository(dialect = Dialect.H2)  
interface SubscriptionRepository extends CrudRepository<Subscription, Long> {
    @Executable Subscription save(@Valid @NotNull Subscription entity);
    @Executable void saveAll(@Valid @NotNull Collection<Subscription> entities);
    @Executable void deleteByUserId(@NotNull Long userId);
    @Executable Collection<Subscription> findByReportId(@NotNull Long reportId);
    @Executable Collection<Subscription> findByUserId(@NotNull Long userId);

    @Query("SELECT s.ID,s.USER_ID,s.REPORT_ID FROM SUBSCRIPTION s INNER JOIN REPORT_CONFIG rc ON s.REPORT_ID=rc.ID WHERE rc.DASH_ID=:dashId")
    public abstract Collection<Subscription> findForDashId(Long dashId);
}


@Secured(SecurityRule.IS_ANONYMOUS)
@Controller("/api/subscription") // @ExecuteOn(TaskExecutors.IO)
public class SubscriptionController {
	@Inject SubscriptionRepository repo;
	@Inject UserRepository userRepository;

	// The below two functions contain hacks to allow sending long[] as a string. Since micronaut doesn't convert automatically easily.
	
	@Post("/{dashId}")   @Consumes(MediaType.TEXT_PLAIN)
	public HttpResponse<String> setMySubs(long dashId, @Body String csvReportIds, @Nullable Authentication authentication) {
		return setUserSubs(dashId, csvReportIds, authentication, getLoggedInUserId(authentication));
	}
	
	@Post("/{dashId}/{targetUserId}") @Secured({"ADMIN"})
	public HttpResponse<String> setUserSubs(long dashId, @Body String csvReportIds, @Nullable Authentication authentication, 
			@Nullable Long targetUserId) {
		List<Long> reportIds = toLongList(csvReportIds.trim());
		List<Subscription> subs = new ArrayList<>(reportIds.size());
		repo.deleteByUserId(targetUserId);
		if(reportIds.size()>0) {
			for(long rid : reportIds) {
				subs.add(new Subscription(targetUserId, rid));
			}
			repo.saveAll(subs);
		}
		return HttpResponse.ok(""+subs.size());
	}

	private static List<Long> toLongList(@Valid String csvReportIds) {
		if(csvReportIds.trim().length() == 0) {
			return Collections.emptyList();
		}
		return Arrays.asList(csvReportIds.split(",")).stream().map(s -> Long.parseLong(s)).collect(Collectors.toList());
	}

	@Get("/{dashId}{?targetUserId}") @Produces(MediaType.APPLICATION_JSON)
	public Stream<Subscription> list(long dashId, @Nullable Long targetUserId) {
		if(targetUserId == null) {
			return repo.findForDashId(dashId).stream();
		}
		return repo.findForDashId(dashId).stream().filter(s -> s.getUserId() == targetUserId);
	}

	public static long getLoggedInUserId(@NonNull Authentication authentication) {
		for(String r : authentication.getRoles()) {
			if(r.startsWith("USERID")) {
				try {
					return Long.parseLong(r.substring("USERID".length()));
				} catch(NumberFormatException nfe) {}
			}
		}
		throw new IllegalStateException("Error finding ID");
	}
}
