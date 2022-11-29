// copy pasted version of  https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
import {keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
    rectangularSelection, crosshairCursor,
    lineNumbers, highlightActiveLineGutter} from "@codemirror/view"
import {Extension, EditorState} from "@codemirror/state"
import {defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching,foldGutter, foldKeymap} from "@codemirror/language"
import {defaultKeymap, history, historyKeymap} from "@codemirror/commands"
import {searchKeymap, highlightSelectionMatches} from "@codemirror/search"
import {autocompletion, completionKeymap, closeBracketsKeymap} from "@codemirror/autocomplete"
import { SQLConfig, SQLDialect } from "@codemirror/lang-sql"


// import {lintKeymap} from "@codemirror/lint"

/// This is an extension value that just pulls together a number of
/// extensions that you might want in a basic editor. It is meant as a
/// convenient helper to quickly set up CodeMirror without installing
/// and importing a lot of separate packages.
///
/// Specifically, it includes...
///
///  - [the default command bindings](#commands.defaultKeymap)
///  - [line numbers](#view.lineNumbers)
///  - [special character highlighting](#view.highlightSpecialChars)
///  - [the undo history](#commands.history)
///  - [a fold gutter](#language.foldGutter)
///  - [custom selection drawing](#view.drawSelection)
///  - [drop cursor](#view.dropCursor)
///  - [multiple selections](#state.EditorState^allowMultipleSelections)
///  - [reindentation on input](#language.indentOnInput)
///  - [the default highlight style](#language.defaultHighlightStyle) (as fallback)
///  - [bracket matching](#language.bracketMatching)
///  - [bracket closing](#autocomplete.closeBrackets)
///  - [autocompletion](#autocomplete.autocompletion)
///  - [rectangular selection](#view.rectangularSelection) and [crosshair cursor](#view.crosshairCursor)
///  - [active line highlighting](#view.highlightActiveLine)
///  - [active line gutter highlighting](#view.highlightActiveLineGutter)
///  - [selection match highlighting](#search.highlightSelectionMatches)
///  - [search](#search.searchKeymap)
///  - [linting](#lint.lintKeymap)
///
/// (You'll probably want to add some language package to your setup
/// too.)
///
/// This extension does not allow customization. The idea is that,
/// once you decide you want to configure your editor more precisely,
/// you take this package's source (which is just a bunch of imports
/// and an array literal), copy it into your own code, and adjust it
/// as desired.
export const basicSetup: Extension = [
lineNumbers(),
highlightActiveLineGutter(),
highlightSpecialChars(),
history(),
foldGutter(),
drawSelection(),
dropCursor(),
EditorState.allowMultipleSelections.of(true),
indentOnInput(),
syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
bracketMatching(),
// closeBrackets(), - Don't turn on as this adds two ``, when clicked once.
autocompletion(),
rectangularSelection(),
crosshairCursor(),
highlightActiveLine(),
highlightSelectionMatches(),
keymap.of([
...closeBracketsKeymap,
...defaultKeymap,
...searchKeymap,
...historyKeymap,
...foldKeymap,
...completionKeymap,
// ...lintKeymap
])
]

/// A minimal set of extensions to create a functional editor. Only
/// includes [the default keymap](#commands.defaultKeymap), [undo
/// history](#commands.history), [special character
/// highlighting](#view.highlightSpecialChars), [custom selection
/// drawing](#view.drawSelection), and [default highlight
/// style](#language.defaultHighlightStyle).
export const minimalSetup: Extension = [
highlightSpecialChars(),
history(),
drawSelection(),
syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
keymap.of([
...defaultKeymap,
...historyKeymap,
])
]

// Taken from https://github.com/codemirror/lang-sql/blob/main/src/tokens.ts#L147
const SQLTypes = "array binary bit boolean char character clob date decimal double float int integer interval large national nchar nclob numeric object precision real smallint time timestamp varchar varying "
const SQLKeywords = "absolute action add after all allocate alter and any are as asc assertion at authorization before begin between both breadth by call cascade cascaded case cast catalog check close collate collation column commit condition connect connection constraint constraints constructor continue corresponding count create cross cube current current_date current_default_transform_group current_transform_group_for_type current_path current_role current_time current_timestamp current_user cursor cycle data day deallocate declare default deferrable deferred delete depth deref desc describe descriptor deterministic diagnostics disconnect distinct do domain drop dynamic each else elseif end end-exec equals escape except exception exec execute exists exit external fetch first for foreign found from free full function general get global go goto grant group grouping handle having hold hour identity if immediate in indicator initially inner inout input insert intersect into is isolation join key language last lateral leading leave left level like limit local localtime localtimestamp locator loop map match method minute modifies module month names natural nesting new next no none not of old on only open option or order ordinality out outer output overlaps pad parameter partial path prepare preserve primary prior privileges procedure public read reads recursive redo ref references referencing relative release repeat resignal restrict result return returns revoke right role rollback rollup routine row rows savepoint schema scroll search second section select session session_user set sets signal similar size some space specific specifictype sql sqlexception sqlstate sqlwarning start state static system_user table temporary then timezone_hour timezone_minute to trailing transaction translation treat trigger under undo union unique unnest until update usage user using value values view when whenever where while with without work write year zone "

// Taken from qStudio - syntaxpane
const qKeyWords = "xlog xdesc wj1 while sums rsave read1 read0 prior prev prds next mmin mins md5 mavg lsq load if hopen hclose get first exit exec do dev deltas cut cov cor binr attr and avg asc all bin cross count differ each eval except exp fby fills fkeys flip getenv group gtime hcount hsym iasc idesc in inter insert inv key keys ltime max maxs mcount mdev med meta mmax mmu mod msum neg not null or over parse peach prd rand rank ratios raze reciprocal reverse rload rotate save scan set setenv show signum ss ssr like string sublist sv system tables til type ungroup union upsert value var view views vs where within wj wsum xasc xbar xcol xcols xexp xgroup xkey xprev xrank 0: 1: 2: 1 2 lj pj ij ej uj aj select update delete lower upper trim rtrim ltrim cols sin asin cos acos tan atan log sqrt abs min sum last wavg hdel enlist ceiling floor any";
const Qns = ".Q.addmonths .Q.addr .Q.host .Q.chk .Q.cn .Q.pn .Q.D .Q.dd .Q.dpft .Q.dsftg .Q.en .Q.fc .Q.fk .Q.fmt .Q.fs .Q.ft .Q.gc .Q.hdpf .Q.ind .Q.P .Q.par .Q.PD .Q.pd .Q.pf .Q.PV .Q.pv .Q.qp .Q.qt .Q.s .Q.ty .Q.u .Q.v .Q.V .Q.view .Q.def .Q.ff .Q.fsn .Q.fu .Q.id .Q.j10 .Q.x10 .Q.j12 .Q.x12 .Q.k .Q.MAP .Q.opt .Q.w .Q.pt .Q.bv .Q.vp .Q.U";
const Zns = ".z.c .z.exit .z.pd .z.q .z.W .z.zd .z.ws .z.bm .z.a .z.ac .z.b .z.d .z.D .z.f .z.h .z.i .z.k .z.K .z.l .z.o .z.pc .z.pg .z.ph .z.pi .z.po .z.pp .z.ps .z.pw .z.1 .z.s .z.t .z.T .z.ts .z.u .z.vs .z.w .z.x .z.z .z.Z .z.n .z.N .z.p .z.P";

const dialect:SQLDialect = SQLDialect.define({
	/// A space-separated list of keywords for the dialect.
	keywords:SQLKeywords + qKeyWords,
	/// A space-separated string of built-in identifiers for the dialect.
	builtin: Qns + Zns,
	/// A space-separated string of type names for the dialect.
	types:SQLTypes,
	/// Controls whether regular strings allow backslash escapes.
	backslashEscapes: true,
	/// Controls whether # creates a line comment.
	hashComments: false,
	/// Controls whether `//` creates a line comment.
	slashComments: true,
	/// When enabled `--` comments are only recognized when there's a
	/// space after the dashes.
	spaceAfterDashes: true,
	/// When enabled, things quoted with "$$" are treated as
	/// strings, rather than identifiers.
	// doubleDollarQuotedStrings?: boolean,
	/// When enabled, things quoted with double quotes are treated as
	/// strings, rather than identifiers.
	// doubleQuotedStrings?: boolean,
	/// Enables strings like `_utf8'str'` or `N'str'`.
	// charSetCasts?: boolean,
	/// The set of characters that make up operators. Defaults to
	/// `"*+\-%<>!=&|~^/"`.
	operatorChars: "*+\\-%<>!=&|~^/;,.=><~?:<=>=!=&|+/::-*/\\&|^%+:-:*:%:!:",
	/// The set of characters that start a special variable name.
	/// Defaults to `"?"`.
	specialVar: "",
	/// The characters that can be used to quote identifiers. Defaults
	/// to `"\""`.
	identifierQuotes: "\"",
	/// Controls whether bit values can be defined as 0b1010. Defaults
	/// to false.
	unquotedBitLiterals: true,
	// Controls whether bit values can contain other characters than 0 and 1.
	// Defaults to false.
	// treatBitsAsBytes: boolean,
});

export const QSQLConfig:SQLConfig = {
	dialect: dialect
};


export {EditorView} from "@codemirror/view"