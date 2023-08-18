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

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Optional;

import javax.validation.Valid;

import com.sqldashboards.pro.ConnectionShortFormat;
import com.sqldashboards.pro.ConnectionShortFormat.ParseResult;
import com.sqldashboards.shared.JdbcTypes;
import com.sqldashboards.shared.PluginLoader;

import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Consumes;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.annotation.Put;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import lombok.extern.java.Log;

@Secured(SecurityRule.IS_AUTHENTICATED) 
@Controller("/api/dbserver") // @ExecuteOn(TaskExecutors.IO)
@Log 
public class DbServerController {

	/*
	 * Initially I was always fetching ServerConns from the database and it was the golden source.
	 * BUT to allow connection pooling I needed ConnectionMnager created somewhere and kept alive.
	 * Application seems most sensible for now.
	 * All server connection edits MUST
	 * 	1. Update the database
	 *  2. AND update connectionManager.
	 * Else things will get weird and break.
	 */

	@Inject ServerConfigRepository serverConfigRepository;
    
	@Post("/")  @Secured({"ADMIN"})
    public HttpResponse<ServerConfigDTO> save(@Body @Valid ServerConfigDTO serverConfig) {
		ServerConfigDTO sc = saveSC(serverConfig);
		return HttpResponse.created(sc).headers(headers -> headers.location(toUri(sc)));
    }

    public ServerConfigDTO saveSC(ServerConfigDTO serverConfig) {
		Optional<ServerConfigDTO> saved = serverConfigRepository.findByName(serverConfig.getName());
		if(saved.isPresent()) {
			throw new IllegalStateException("serverConfig with that name already exists");
		}
		installDriverIfDriverNotPresent(Application.APPNAME, serverConfig.getJdbcType());
		ServerConfigDTO newSC = serverConfigRepository.save(serverConfig);
		Application.CONNMAN.addServer(newSC.toDashySC());
    	return newSC;
    }

	@Post("/add-conns")  @Secured({"ADMIN"})    @Consumes(MediaType.ALL)
    public String addConns(@Body String serverConfigShorts) {
		List<ParseResult> prs = ConnectionShortFormat.parse(serverConfigShorts, JdbcTypes.KDB, JdbcTypes.values());
		StringBuilder sb = new StringBuilder();
		for(ParseResult p : prs) {
			if(p.serverConfig == null) {
				sb.append(p.originalLine + " - failed as: " + p.report + "\n");
			} else {
				try {
					saveSC(ServerConfigDTO.getServerConfig(p.serverConfig));
					sb.append("OK\n");
				} catch(IllegalStateException e) {
					sb.append(e.getLocalizedMessage() + "\n");
				}
			}
		}
		return sb.toString();
    }
	

	@Post("/upsert-conns")  @Secured({"ADMIN"})   @Consumes(MediaType.ALL)
    public String upsertConns(@Body String serverConfigShorts) {
		List<ParseResult> prs = ConnectionShortFormat.parse(serverConfigShorts, JdbcTypes.KDB, JdbcTypes.values());
		StringBuilder sb = new StringBuilder();
		for(ParseResult p : prs) {
			if(p.serverConfig == null) {
				sb.append(p.originalLine + " - failed as: " + p.report + "\n");
			} else {
				try {
					sb.append(upsertSC(ServerConfigDTO.getServerConfig(p.serverConfig)) + "\n");
				} catch(IllegalStateException e) {
					sb.append(e.getLocalizedMessage() + "\n");
				}
			}
		}
		return sb.toString();
    }

	/**
	 * @return true if updated else false if new entry saved.
	 */
    private String upsertSC(ServerConfigDTO serverConfigDTO) {
		Optional<ServerConfigDTO> originalSC = serverConfigRepository.findByName(serverConfigDTO.getName());
		if(originalSC.isPresent()) {
			serverConfigDTO.setId(originalSC.get().getId());
			if(serverConfigDTO.equals(originalSC.get())) {
				return "unchanged";
			}
			serverConfigRepository.update(serverConfigDTO);
			installDriverIfDriverNotPresent(Application.APPNAME, serverConfigDTO.toDashySC().getJdbcType());
			Application.CONNMAN.updateServer(serverConfigDTO.getName(), serverConfigDTO.toDashySC());
			return "updated";
		}
		saveSC(serverConfigDTO);
		return "added";
    }
	
	@Put("/")  @Secured({"ADMIN"})
    public HttpResponse<ServerConfigDTO> update(@Body @Valid ServerConfigDTO serverConfig) {
		Optional<ServerConfigDTO> originalSC = serverConfigRepository.findById(serverConfig.getId());
		ServerConfigDTO sc = serverConfigRepository.update(serverConfig);
		Optional<ServerConfigDTO> saved = serverConfigRepository.findById(sc.getId());
		installDriverIfDriverNotPresent(Application.APPNAME, serverConfig.getJdbcType());
		Application.CONNMAN.updateServer(originalSC.get().getName(), saved.get().toDashySC());
		return saved.isPresent() ? 
				HttpResponse.created(sc).headers(headers -> headers.location(toUri(sc)))
				: HttpResponse.notFound();
    }
	
    @Delete("/{id}")  @Secured({"ADMIN"})
    public HttpResponse<?> delete( Long id) {
		Optional<ServerConfigDTO> exists = serverConfigRepository.findById(id);
		if(!exists.isPresent()) {
			return HttpResponse.notFound();
		}
		Application.CONNMAN.removeServer(exists.get().getName());
    	serverConfigRepository.deleteById(id);
        return HttpResponse.noContent();
    }
	
	@Get("/") @Produces(MediaType.APPLICATION_JSON)
	public Iterable<ServerConfigDTO> list() { return serverConfigRepository.findAll(); }

	@Post("/test") 
	public String test(@Body ServerConfigDTO serverConfig) {
		boolean b = false;
		String f = "unknown failure";
		try {
			installDriverIfDriverNotPresent(Application.APPNAME, serverConfig.getJdbcType());
			Application.CONNMAN.testConnection(serverConfig.toDashySC());
			b = true;
		} catch (RuntimeException | IOException e) {
			f = e.getLocalizedMessage();
		} 
		return b ? "success" : f;
	}
	
	private URI toUri(ServerConfigDTO sc) { return URI.create("/dbserver/"+sc.getId()); }


	public static void installDriverIfDriverNotPresent(String appname, JdbcTypes jdbcTypes) {
		try {
			PluginLoader.getCClass(appname, jdbcTypes.getDriver());
		} catch (Throwable e) {
			try {
				PluginLoader.installDriver(appname, jdbcTypes);
			} catch (IOException e1) {
				log.severe("Driver wasn't found. Tried to download driver for " + jdbcTypes + " but failed.");
			}
		}
	}
}


