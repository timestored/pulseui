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

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import javax.validation.Valid;

import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.annotation.Put;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;

@Secured(SecurityRule.IS_AUTHENTICATED)
@Controller("/api/user") // @ExecuteOn(TaskExecutors.IO)
public class UserController {

	@Inject UserRepository userRepository;
	private final PasswordAuthentication pauth = new PasswordAuthentication();
	
	@Post("/")  @Secured({"ADMIN"})
    public HttpResponse<User> save(@Body @Valid User user) {
		user.setPassword(pauth.hash(user.getPassword()));
		Optional<User> saved = userRepository.findByName(user.getName());
		if(saved.isPresent()) {
			throw new IllegalStateException("user with that name already exists");
		}
		User u = userRepository.save(user);
		return HttpResponse.created(u).headers(headers -> headers.location(toUri(u)));
    }
	
	@Put("/")  @Secured({"ADMIN"})
    public HttpResponse<User> update(@Body @Valid User user) {
		// We don't send passwords to client, so they mostly won't send back unless creating new password.
		if(user.getPassword() == null) {
			Optional<User> existingUser = userRepository.findById(user.getId());
			if(existingUser.isPresent()) {
				User existingU = existingUser.get();
				user.setPassword(existingU.getPassword());
			} else {
				return HttpResponse.notFound();
			}
		} else {
			user.setPassword(pauth.hash(user.getPassword()));
		}
		User u = userRepository.update(user);
		Optional<User> saved = userRepository.findById(u.getId());
		return saved.isPresent() ? 
				HttpResponse.created(u).headers(headers -> headers.location(toUri(u)))
				: HttpResponse.notFound();
    }
	
    @Delete("/{id}")  @Secured({"ADMIN"})
    public HttpResponse<?> delete(Long id) {
		Optional<User> exists = userRepository.findById(id);
		if(!exists.isPresent()) {
			return HttpResponse.notFound();
		}
    	userRepository.deleteById(id);
        return HttpResponse.noContent();
    }
	
	@Get("/") @Produces(MediaType.APPLICATION_JSON)
	public Iterable<User> list() { 
		Iterable<User> it = userRepository.findAll();
		List<User> l = new ArrayList<>();
		it.forEach(u -> { u.setPassword(""); l.add(u); });
		return l;
	}
	
	private URI toUri(User u) { return URI.create("/user/"+u.getId()); }
}


