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

import java.util.List;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;

import io.micronaut.context.annotation.Executable;
import io.micronaut.data.repository.CrudRepository;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;

@JdbcRepository(dialect = Dialect.H2) 
public abstract class DashboardHistoryRepository implements CrudRepository<DashboardHistory, Long> {
    @Executable public abstract DashboardHistory save(@Valid @NotNull DashboardHistory entity);

    @Query("select * from DASHBOARD_HISTORY b where b.id = :id ORDER BY DATE_UPDATED DESC")
    public abstract List<DashboardHistory> findForId(Long id);
  
//    @Query("select * from DASHBOARD_HISTORY b where b.id = :id ORDER BY DATE_UPDATED DESC")
    @Query("select dashboard_history_id,id,version,name,default_params,date_created,date_updated,'' as data from DASHBOARD_HISTORY b where b.id = :id ORDER BY DATE_UPDATED DESC")
    public abstract List<DashboardHistory> findForIdWithoutData(Long id);
    @Query("select * from DASHBOARD_HISTORY b where b.id = :id AND b.version = :version LIMIT 1")
    public abstract DashboardHistory findForIdVersion(Long id, Long version);
}