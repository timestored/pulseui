import { useContext, useEffect, useRef } from 'react';
import { sql } from '@codemirror/lang-sql';
import {EditorView, KeyBinding, keymap } from "@codemirror/view"
//import { abcdef } from '@uiw/codemirror-theme-abcdef';
import { sublime } from '@uiw/codemirror-theme-sublime';
//import { oneDarkTheme } from '@codemirror/theme-one-dark'

import { ThemeContext } from './../context';
import { EditorState } from "@codemirror/state";
import { basicSetup, QSQLConfig } from "./myCodemirrorBasic";
import { javascript } from '@codemirror/lang-javascript';

/*
 * Wrapping of CodeMIrror with common configuration.
 * No other classes should use CodeMirror directly. 
 */

export type EditorProps = { 
	value:string, 
	runLine: (line: string) => void, 
	runSelection: (selection: string) => void,
    onChange:(txt:string) => void
};


export const JsEditor = (props:EditorProps ) => {
	return MyEditor({lang:"js", ...props});
}
export const SqlEditor = (props:EditorProps ) => {
	return MyEditor({lang:"sql", ...props});
}



const MyEditor = (props:EditorProps & {lang:"sql"|"js"} ) => {
	const editor = useRef<HTMLDivElement>(null);
	const { value, onChange } = props;
    const context = useContext(ThemeContext);
	const runLineRef = useRef(props.runLine);
	const runSelectionRef = useRef(props.runSelection);

	// We don't want to keep redefining codemirror BUT we do want to call latest callback with new server etc.
	runLineRef.current = props.runLine;
	runSelectionRef.current = props.runSelection;

	useEffect(() => {
		let myKeyMap:KeyBinding[] = [{key:"Ctrl-s",   run:() => { runSelectionRef.current("s"); return true; }, preventDefault:true },
								 {key:"Ctrl-e",  preventDefault:true,
								 	run:(v: EditorView) => { 
											const m = v.state.selection.main;
											const txt = m['from']<m['to'] ? v.state.doc.sliceString(m['from'],m['to']) : v.state.doc.sliceString(0);
											runSelectionRef.current(txt); 
											return true; 
									}},
								{key:"Ctrl-Enter",run:(v: EditorView) => { runLineRef.current(v.state.doc.lineAt(v.state.selection.main.head).text); return true; }, preventDefault:true, mac:"Cmd-Enter", win:"Ctrl-Enter" }];
									
		
		let updateListenerExtension = EditorView.updateListener.of((update) => {
			if (update.docChanged) { onChange(view.state.doc.toString()); } 
		});
		let extensions = [(props.lang === "sql" ? sql(QSQLConfig) : javascript()),keymap.of(myKeyMap),updateListenerExtension,basicSetup];
		if(context.theme === "dark") {
			extensions.push(sublime); // abcdef   sublime    oneDarkTheme
		}
		const state = EditorState.create({ doc: value, extensions });
	  	const view = new EditorView({ state, parent: editor.current ?? undefined });
		return () => { view.destroy(); };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [context.theme]);
	// If I include those dependencies the editor doesn't work. Can't type.
  
	return (<div className="SqlEditor" ref={editor} ></div>);
  }
