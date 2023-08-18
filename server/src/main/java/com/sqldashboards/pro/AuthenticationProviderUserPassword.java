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

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.reactivestreams.Publisher;

import com.sqldashboards.webby.Application;
import com.sqldashboards.webby.PasswordAuthentication;
import com.sqldashboards.webby.User;
import com.sqldashboards.webby.UserRepository;

import io.micronaut.http.HttpRequest;
import io.micronaut.security.authentication.AuthenticationProvider;
import io.micronaut.security.authentication.AuthenticationRequest;
import io.micronaut.security.authentication.AuthenticationResponse;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import lombok.extern.java.Log;
import reactor.core.publisher.Mono;

@Singleton @Log
public class AuthenticationProviderUserPassword implements AuthenticationProvider {

	@Inject UserRepository userRepository;
    public static final String USER_HEADER = Application.CONFIG.getUsername_header_name();
	
    @Override
    public Publisher<AuthenticationResponse> authenticate(HttpRequest<?> httpRequest, AuthenticationRequest<?, ?> req) {
        return Mono.<AuthenticationResponse>create(emitter -> {
        	// Authentication - Confirming username/password - can be built-in or external
        	// Authorization - Getting a list of roles - can be built-in or external
        	String username = (String) req.getIdentity();
        	String pass = (String) req.getSecret();

        	UserAuthentication userAuth =   new StoredUserAuthentication() ;
        	RoleProvider roleProvider =  new StoredRoleProvider() ;

        	String reqUsername = null;
        	
        	Optional<User> u = userRepository.findByName(username);
        	User user = u.isPresent() ? u.get() : null;
        	boolean isAdmin = false; 
        	// IF hardcoded in request override OR authenticated, return success but possibly with very few roles.
        	// NOTE: The hardcoded in HTTP header does zero real authentication. It trusts the header entirely.
        	if(reqUsername != null || userAuth.authenticate(username, pass, user)) {
        		if(user == null) {
    				String password = "EXTERNALAUTHENTICATION";
    				user = userRepository.save(new User(username, null, password, isAdmin));
        		}
    			List<String> roles = roleProvider.getRoles(username, user);
    			isAdmin = roles.stream().anyMatch(s -> s.toUpperCase().equals("ADMIN"));
    			if(user.isAdmin() != isAdmin) {
					user.setAdmin(isAdmin);
    				user = userRepository.update(user);	
				}
				Map<String, Object> attributes = new HashMap<>(2);
        		attributes.put("email", user.getEmail());
        		attributes.put("id", user.getId());
                emitter.success(AuthenticationResponse.success(username, roles, attributes));
        	}
            emitter.error(AuthenticationResponse.exception());
        });
    }

    public static interface UserAuthentication {
    	boolean authenticate(String username, String password, User u);
    }
    
    public static interface RoleProvider {
    	List<String> getRoles(String username, User u);
    }

    
    public static class StoredUserAuthentication implements UserAuthentication {
    	@Inject UserRepository userRepository;
    	private final PasswordAuthentication pauth = new PasswordAuthentication();
		@Override public boolean authenticate(String username, String password, User user) {
        	if(user != null) {
        		 return pauth.authenticate(password.toCharArray(), user.getPassword());
        	}
        	return false;
		}
    }

    public static class StoredRoleProvider implements RoleProvider {
    	@Inject UserRepository userRepository;
    	@Override public List<String> getRoles(String username, User user) {
        	if(user != null) {
        		return user.isAdmin() ? Arrays.asList("ADMIN","STANDARD","USERID" + user.getId()) : Arrays.asList("STANDARD","USERID" + user.getId());
        	}
        	return Collections.emptyList();
    	}
    }
}