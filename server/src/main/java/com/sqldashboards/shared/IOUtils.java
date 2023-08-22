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
 *  Commercially licensed only. 
 *  contact licensing@timestored.com 
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 ******************************************************************************/
 
package com.sqldashboards.shared;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.Charset;


/**
 * THIS FILE IS VERY SIMILAR TO A FILE FROM QSTUDIO. KEEP IN SYNC.
 * THIS FILE IS VERY SIMILAR TO A FILE FROM QSTUDIO. KEEP IN SYNC.
 * THIS FILE IS VERY SIMILAR TO A FILE FROM QSTUDIO. KEEP IN SYNC.
 */


/**
 * Common IO tasks, imitaton of apache library.
 */
public class IOUtils {

	/** Read a file and return it as a string */
	public static String toString(File file, Charset charset, int bytes) throws IOException {
		   int bytesToRead = bytes!=-1 ? bytes : (int)file.length(); 
		   byte[] buffer = new byte[bytesToRead];
		   BufferedInputStream f = new BufferedInputStream(new FileInputStream(file));
		   f.read(buffer);
		   f.close();
		   return new String(buffer, charset);
	}

	/** Read a file and return it as a string */
	public static String toString(File file, Charset charset) throws IOException {
		return toString(file, charset, -1);
	}

	/** Read a file and return it as a string */
	public static String toString(File file) throws IOException {
		return toString(file, Charset.forName("UTF-8"), -1);
	}
	
//	/**
//	 * Read a text resource from the same directory as a given class and return it as a string.
//	 */
//	public static String toString(@SuppressWarnings("rawtypes") Class c, 
//			String resourceName) throws IOException {
//		// TODO close this stream
//		InputStream is =c.getResourceAsStream(resourceName);
//		return CharStreams.toString(new InputStreamReader(is));
//	}
	
	public static void writeStringToFile(String s, File file) throws IOException {
		file.getParentFile().mkdirs();
		PrintWriter pw = new PrintWriter(file, Charset.forName("UTF-8").name());
		pw.print(s);
		pw.close();
	}

	public static String toString(Throwable e) {
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		e.printStackTrace(new PrintStream(bos));
		return bos.toString();
	}
	
//	/**
//	 * Copy the InputStream to a temp directory and name the file filename.
//	 * Particularly useful for creating test files in junit tests.
//	 */
//	public static File createTempCopy(String filename, final InputStream is)
//			throws IOException {
//		File tempf = Files.createTempDir();
//		File f = new File(tempf, filename);
//	    byte[] buffer = new byte[is.available()];
//	    is.read(buffer);
//		Files.write(buffer, f);
//		return f;
//	}
	
	

	/**
	 * @return true if path dir contains over maxFiles, otherwise false.
	 */
	public static boolean containsMoreThanMaxFiles(File file, int maxFiles){
	    return countFiles(file, maxFiles, 0) > maxFiles;
	}
	
	private static int countFiles(File file, int maxFiles, int currentCount){
	    int i = currentCount;

	    String[] fileNames = file.list();
	    i += fileNames.length;
	    if(i > maxFiles) {
	    	return i;
	    }
	    for(String fn : fileNames) {
	    	File f = new File(file, fn);
	    	if(f.isDirectory()) {
	    		i = countFiles(f, maxFiles, i);
	    	    if(i > maxFiles) {
	    	    	return i;
	    	    }
	    	}
	    }

	    return i;
	}
}
