import { Component } from 'react';
import { getSmartRs, SmartRs } from './chartResultSet';



/**
 * A strategy of looking at {@link ResultSet} data in a JPanel e.g. chart,table.
 * You get an inital {@link UpdateableView} and then update it with each new {@link ResultSet}, 
 * some strategies may choose to entirely redraw the component others may append data.
 */
export default interface ViewStrategy {
	    
		/**
	     * For the given data, give us a panel with a view of that data if possible.
	     * @return a panel showing qtab if possible otherwise false.
	     */
		getView():UpdateableView;
		
		/** a textual description of this chart type */
		getDescription():string;

		/**
		 *  An explanation of the format of QTable format best used and how it affects 
		 *  what is displayed. May contain HTML markup but will not be wrapped
		 *  in an html tag.
		 */
		getFormatExplainationHtml():string;

		/**
		 *  An explanation of the format of QTable format best used and how it affects 
		 *  what is displayed. Will use line breaks to spearate items, No HTML markup.
		 */
		getFormatExplaination():string;
		
		/**  @return Examples of queries.   */
		getExamples():Array<ExampleView>;

		/**  @return Examples of queries.   */
		getQueryEg(jdbcType:JdbcTypes):string;
		
		/**
		 *@return component that has a form allowing configuration of the given 
		 * {@link ColResultSetViewStrategy}.
		 */
		getControlPanel():Component;
		
		icon:string;
    }
    

/**
 * A visual component that can be updated with the latest {@link ResultSet} data.
 */
export interface UpdateableView extends Component {
	
    /**
     * Update the view with new data, in some cases this means regenerating for just new data
     * in other cases the new RS data is just appended.
     * @param rs The raw {@link ResultSet} as retrieved from database.
     * @param chartResultSet Where possible a more chart oriented {@link ResultSet} that many
     * 	{@link ViewStrategy}'s need. Generated higher level to save regerating each time.
     * @throws ChartFormatException Thrown if data is incompatible with view.
     */
    update(srs:SmartRs):void;
}

class ExampleView {
    constructor(readonly name:string, readonly description:string, readonly testCase:TestCase){}
}
    
class TestCase {
    constructor(readonly kdbQuery:string, readonly name:string, readonly srs:SmartRs){}
}

enum JdbcTypes { KDB,POSTGRES,CLICKHOUSE,CUSTOM,MSSERVER,H2,MYSQL }


export class ExampleTestCases {    
    
    public static COUNTRY_STATS:TestCase = (function() {
        const COUNTRIES = ["US", "China", "japan", "Germany", "UK", "Zimbabwe", "Bangladesh", "Nigeria", "Vietnam"];
        const CONTINENT = ["NorthAmerica", "Asia", "Asia", "Europe", "Europe",  "Africa", "Asia", "Africa", "Asia", ];
        const GDP = [ 15080, 11300, 4444, 3114, 2228, 9.9, 113, 196, 104 ];
        const GDP_PER_CAPITA = [48300, 8400, 34700, 38100, 36500, 413, 1788, 732, 3359 ];
        const POPULATION = [313847, 500000, 127938, 81308, 63047,13010, 152518, 166629, 87840];
        const LIFE_EXP = [ 77.14, 72.22, 80.93, 78.42, 78.16, 39.01, 61.33, 51.01, 70.05];
    

        function toQ(nums:number[]):String {
            let r = "";
            nums.forEach(s => r += s + " ");
            return r;
        }
        function toQsym(symSafeStrings:string[]):string {
            let r = "";
            symSafeStrings.forEach(s => r += "`" + s);
            return r;
        }	

		let countryCol =  " Country:" + toQsym(COUNTRIES) + "; ";
		let numCols = "\r\n\t Population:" + toQ(POPULATION) + 
				";\r\n\t GDP:" + toQ(GDP) +  
				"; \r\n\tGDPperCapita:" + toQ(GDP_PER_CAPITA) + 
				";  \r\n\tLifeExpectancy:" + toQ(LIFE_EXP) + ")";

		let countryQuery = "([] Continent:" + toQsym(CONTINENT) + ";\r\n\t" + countryCol + numCols;
		let colTitles = ["Continent", "Country", "Population", "GDP", "GDPperCapita", "LifeExpectancy"];
		let colValues = [CONTINENT, COUNTRIES, POPULATION, GDP, GDP_PER_CAPITA, LIFE_EXP];
		let rs = getSmartRs(colTitles, colValues);
		return ExampleTestCases.COUNTRY_STATS = new TestCase(countryQuery, "COUNTRY_STATS", rs);
      })();


	  public static OHLC_TESTCASE:TestCase = (function() {
        const DATES = "2024.03.17 2024.03.18 2024.03.19 2024.03.20 2024.03.21 2024.03.24 2024.03.25 2024.03.26 2024.03.27 2024.03.28 2024.03.31 2024.04.01 2024.04.02 2024.04.03 2024.04.04 2024.04.07 2024.04.08 2024.04.09 2024.04.10 2024.04.11 2024.04.14 2024.04.15 2024.04.16 2024.04.17 2024.04.18 2024.04.21 2024.04.22 2024.04.23 2024.04.24 2024.04.25".split(" ");
        const VOL = [3,9,6,5,4,7,8,2,13,3,9,6,5,4,7,8,2,13,3,9,6,5,4,7,8,2,13,3,9,6];
        const CLOSE = Array(30).fill(0).map((e, idx) => 55 + idx * 2);
		const OPEN = Array(30).fill(0).map((e, idx) => 60 + idx);
    
		let ohlcvQuery = "{ c:55+2*til 30; ([] t:`$string raze 2024.03.17+(7*til 6)+\\:til 5; high:c+30; low:c-20; open:60+til 30; close:c; volume:30#3 9 6 5 4 7 8 2 13) }[]";
		let colTitles = ["Date", "Open", "High", "Low", "Close", "Volume"];
		let colValues = [DATES, OPEN, CLOSE.map(e => e+30), CLOSE.map(e => e - 20),  CLOSE, VOL];
		let rs = getSmartRs(colTitles, colValues);
		return ExampleTestCases.OHLC_TESTCASE = new TestCase(ohlcvQuery, "OHLC", rs);
      })();

	  public static CALENDAR_TESTCASE:TestCase = (function() {
		const DATES = Array(365).fill(new Date()).map((e, idx) => { let d = new Date(); d.setDate(e.getDate() + idx); return d});
        const VAL = Array(365).fill(0).map((e, idx) => 55 + idx * 2);
    
		let calendarQuery = "([] dt:2023.12.31 - til 730; v:(asc 730?50)+(730?50)+730#90 80 72 83 40 2 3)";
		let rs = getSmartRs(["Date", "Val"], [DATES, VAL]);
		return ExampleTestCases.CALENDAR_TESTCASE = new TestCase(calendarQuery, "OHLC", rs);
      })();
    
}








//
// export class ViewStrategyProvider {
//     getViewStrategy() {
//         return new CategoryViewStrategy("Bar Chart", "barchart", () => new ABar({}));
//     }
// }


