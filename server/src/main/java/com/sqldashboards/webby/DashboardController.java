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

import java.io.FileNotFoundException;
import java.net.URI;
import java.sql.Blob;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.Collectors;

import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.sql.rowset.serial.SerialBlob;
import javax.sql.rowset.serial.SerialException;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

import com.sqldashboards.pro.DashDemos;

import io.micronaut.context.annotation.Executable;
import io.micronaut.core.annotation.Introspected;
import io.micronaut.core.annotation.NonNull;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.core.io.ResourceResolver;
import io.micronaut.data.annotation.MappedEntity;
import io.micronaut.data.exceptions.OptimisticLockException;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.data.repository.CrudRepository;
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
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.http.server.types.files.StreamedFile;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import lombok.Data;
import lombok.extern.java.Log;

import static io.micronaut.http.HttpHeaders.CACHE_CONTROL;

@JdbcRepository(dialect = Dialect.H2)  
interface DashboardScreenshotRepository extends CrudRepository<DashboardScreenshot, Long> {
    @Executable Optional<DashboardScreenshot> findById(@NotNull Long id);
    @Executable void deleteById(@NotNull Long id);
    @Executable DashboardScreenshot save(@Valid @NotNull DashboardScreenshot entity);
}


@MappedEntity @Data @Introspected
class DashboardScreenshot {
	@Id @GeneratedValue(strategy = GenerationType.AUTO) private long dashboardScreenshotId;
	@NotBlank @NotNull private long id;
	@Nullable @Lob private Blob screenshot;
	
	DashboardScreenshot(long id, Blob screenshot) {
		this.id = id;
		this.screenshot = screenshot;
	}
}



@Secured(SecurityRule.IS_AUTHENTICATED)
@Controller("/api/dashboard") //@ExecuteOn(TaskExecutors.IO)
@Log
public class DashboardController {
	@Inject DashboardRepository repo;
	@Inject DashboardHistoryRepository histRepo;
	@Inject DashboardScreenshotRepository screenshotRepo;

	private static final String[] NAMES = {"Athena","Poseidon","Hera","Zeus","Aphrodite","Demeter","Apollo","Artemis","Ares","Hades","Hermes","Pan","Hestia","Iris","Batman","Canary","Casanova","Cascade","Bigfish","Bigfoot","Matador","Mercury","Whistler","Sputnik","Stratos","Revolution","Rhinestone","phoenix","Aurora","Firecracker","Ivory","Barcelona","Plutonium","Lobster","maroon","Tango","Kangaroo","Atwood","Roadrunner","Silverstar","WhiteFox","Bladerunner","Bulldozer","Disco Winter","Colossus","Cyclone","Dagwood","Sunburst","Darwin","Purple Lake","Edison","Einstein","Elixir","Fireball","Firefly","Magenta","Firestorm","Firetruck","Fusion","Solid Alpha","Honeycomb","Hot Java","Indigo","Irongate","Kryptonite","Liquid Sky","Mango","Metro","Moonshine","Oyster","Nautilus","Nitro","Odyssey","Omega","Orion","Piglet","Green Storm","Quicksilver","Massive Monkey","Intense Lama","Sahara","Topaz","Topcat","Vegas","Vineseed","Voyager","Wombat","Moonshot","Frostbite","Helium","Torpedo","Top Tiger","Prime Eight","HappyClub","FlyTap","WhiteStar","GoldFish","BrightWood","MadMatrix","Zenderon","UglyFox","FutureCurves","RockStable","WhiteCoast","HopeStone","SplashWave","SugarLady","RandomSky","SilverSoft","StillRocks","BlueCloud"};
	
	private Optional<Dashboard> upsertDB(Dashboard d) {
		Dashboard da = d.getId() == -1 ? repo.save(d) : repo.update(d);
		Optional<Dashboard> saved = repo.findById(da.getId());
		if(saved.isPresent()) {
			histRepo.save(new DashboardHistory(saved.get()));
		}
		return saved;
	}
	
	@Post("/") @Secured({"ADMIN"})
    public HttpResponse<Dashboard> create() {
		Dashboard da = upsertDB(new Dashboard(NAMES[Math.abs(new Random().nextInt()) % NAMES.length])).get();
		return HttpResponse.created(da).headers(headers -> headers.location(toUri(da)));
    }

	@Post("/copy/{id}") @Secured({"ADMIN"})
    public HttpResponse<Dashboard> copy(@NonNull @QueryValue Long id) {
		Optional<Dashboard> saved = repo.findById(id);
		if(saved.isPresent()) {
			final Dashboard d = Dashboard.copy(saved.get());
			d.setName(d.getName() + " Copy");
			repo.save(d);
			return HttpResponse.created(d).headers(headers -> headers.location(toUri(d)));
		}
		return HttpResponse.notFound();
	}
	
	@Put("/") @Secured({"ADMIN"})
    public HttpResponse<Dashboard> upsert(@Body @Valid Dashboard dashboard) {
		try {
			Optional<Dashboard> saved = upsertDB(dashboard);
			return saved.isPresent() ? 
					HttpResponse.created(saved.get()).headers(headers -> headers.location(toUri(saved.get())))
					: HttpResponse.notFound();
		} catch(OptimisticLockException ole) {
			HashSet<String> s = new HashSet<String>();
			s.add("Your version was out of date. Someone else may have saved after you opened your dashboard");
			return HttpResponse.notAllowedGeneric(s);
		}
    }

	@Post("/add-demo") @Secured({"ADMIN"})  @Consumes(MediaType.TEXT_PLAIN)
    public HttpResponse<Dashboard> addDemo(@Body String name) {
		// Names must match list from client exactly to ensure correct covers displayed
		// "Price Grid"|"Trade Blotter"|"Candlestick"|"PnL"|"Stream Liquidity"|"TAQ"|"Misc"
		Dashboard d = DashDemos.getDashboard(name);
		Dashboard da = upsertDB(d).get();
		return HttpResponse.created(da).headers(headers -> headers.location(toUri(da)));
    }
	
    @Delete("/{id}") @Secured({"ADMIN"})
    public HttpResponse<?> delete(Long id) {
		Optional<Dashboard> exists = repo.findById(id);
		if(!exists.isPresent()) {
			return HttpResponse.notFound();
		}
		repo.deleteById(id);
    	try {
			ConferenceController.runSQL("delete from DASHBOARD_HISTORY where id = " + id);
		} catch (ClassNotFoundException | SQLException e) {
			log.warning("Error deleting DASHBOARD_HISTORY");
		}
        return HttpResponse.noContent();
    }
	
	@Get("/") @Produces(MediaType.APPLICATION_JSON)
	public Iterable<Dashboard> list() { return repo.findAllWithoutData(); }

	@Get("/history/{id}") @Produces(MediaType.APPLICATION_JSON)
	public Iterable<Dashboard> history(Long id) {
		return histRepo.findForId(id).stream().map(d -> d.toDashboard()).collect(Collectors.toList());
	}
	
    @Get("/{id}")
    public HttpResponse<?> get(Long id) {
    	if(id == null) {
    		return HttpResponse.created(list());
    	}
    	Optional<Dashboard> exists =  repo.findById(id);
		return exists.isPresent() ? HttpResponse.created(exists.get()) : HttpResponse.notFound();
    }

    @Get("/{id}/{version}")
    public HttpResponse<?> get(Long id, Long version) {
    	if(id == null || version == null) {
    		return HttpResponse.created(list());
    	}
    	Dashboard d =  histRepo.findForIdVersion(id, version).toDashboard();
		return d!=null ? HttpResponse.created(d) : HttpResponse.notFound();
    }

    @Post("/{id}/img")   @Consumes(MediaType.TEXT_PLAIN) 
    public HttpResponse<?> postImage(@Nullable @QueryValue Long id, @Body String screenshotPngUrl) throws SerialException, SQLException {
    	String encodingPrefix = "base64,";
    	int contentStartIndex = screenshotPngUrl.indexOf(encodingPrefix) + encodingPrefix.length();
    	byte[] imageData = Base64.getDecoder().decode(screenshotPngUrl.substring(contentStartIndex));
    	screenshotRepo.deleteById(id);
    	screenshotRepo.save(new DashboardScreenshot(id,new SerialBlob(imageData)));
		return HttpResponse.ok();
    }

    private static final byte[] TRANSPARENT_GIF = Base64.getDecoder().decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
    
    private static final String[] IMGS = {"antenna.jpg","belfast.jpg","bull.jpg","calculator.jpg","car-dashboard.jpg","central-station.jpg","city.jpg","clock.jpg","cockpit.jpg","euro.jpg","fishing.jpg","fistbump.jpg","graph.jpg","lightning.jpg","mining.jpg","plane.jpg","rocket.jpg","safe.jpg","speedometer.jpg","stock-chart.jpg","stopwatch.jpg","telescope.jpg","underground.jpg","wall-street.jpg"};

    /**
     * The below is essential for React SPA - Single Page Application
     * i.e. forward all unknown addresses to index.html 
     */
    
    @Inject ResourceResolver resourceResolver;    
    
    @Get("/img/{idHyphenVersion}")   @Consumes(MediaType.TEXT_PLAIN)     @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> getImage(@Nullable @QueryValue String idHyphenVersion) throws FileNotFoundException {
    	// On the client the id-version is used to force a fresh fetch when there is a new verison to avoid caching.
    	int p = idHyphenVersion.indexOf("-");
    	long id = Long.parseLong(p == -1 ? idHyphenVersion : idHyphenVersion.substring(0, p));
    	Optional<DashboardScreenshot> ss = screenshotRepo.findById(id);
		if(ss.isPresent()) {
			Blob blob = ss.get().getScreenshot();
			try {
				return HttpResponse.ok(blob.getBytes(1l, (int) blob.length())).contentType(MediaType.IMAGE_PNG_TYPE)
						.header(CACHE_CONTROL, "public, immutable, max-age=604800"); // 1 week ;
			} catch (SQLException e) { }
		}

    	String imgPath = "classpath:public/img/dashbg/" + IMGS[(int) (id % IMGS.length)];
		Optional<StreamedFile> f = resourceResolver.getResource(imgPath).map(StreamedFile::new);
		if(f.isPresent()) {
			return HttpResponse.ok(f.get());
		}
		
		return HttpResponse.ok(TRANSPARENT_GIF).contentType(MediaType.IMAGE_GIF_TYPE)
					.header(CACHE_CONTROL, "public, immutable, max-age=604800"); // 1 week 
    }

	
	private URI toUri(Dashboard da) {
		// do NOT report a failure if default params cause URI creation to fail.
		// reporting a failure would make the client think it wasn't saved and the client wouldn't update to newesst save.
		// Then since its not on newest save, it would have sync issues.
		URI uri = URI.create("/dash/"+da.getId());
		try {
			String p = da.getDefaultParams().replace(" ", "%20");
			uri = URI.create("/dash/"+da.getId() + p);
		} catch (IllegalArgumentException e) {
			log.warning("Error converting parameters to URI: " + e.getLocalizedMessage());
		}
		return uri;
	}
}
