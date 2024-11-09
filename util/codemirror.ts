import { clike } from '@codemirror/legacy-modes/mode/clike';
import { BLOCKS, MATH, KEYWORDS, TYPES } from './../constants/glsl-lang';
import { StreamLanguage } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, dropCursor, tooltips } from '@codemirror/view';
import { RAW_UTILS, INTERNAL_UNIFORMS, DEFAULT_UNIFORMS } from './../constants/glsl-defaults';
import * as themes from 'thememirror';

function toKeyObject(arr: any): any {
  return arr.reduce((acc: any, key: any) => ({ ...acc, [key]: true }), {} as any);
}

export function glsl(uniforms: any[]) {
  return StreamLanguage.define(
    clike({
      name: 'GLSL',
      blockKeywords: toKeyObject(BLOCKS),
      keywords: toKeyObject(KEYWORDS),
      builtin: toKeyObject(MATH),
      types: toKeyObject(TYPES),
      atoms: toKeyObject([...Object.keys(RAW_UTILS), ...[...INTERNAL_UNIFORMS(), ...DEFAULT_UNIFORMS(), ...uniforms].map(u => u[0])]),
    })
  );
}

export function getBaseExtensions({ parent }) {
  return [
    lineNumbers(),
    history(),
    bracketMatching(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    closeBrackets(),
    dropCursor(),
    indentOnInput(),
    autocompletion(),
    themes.dracula,
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    tooltips({
      position: 'absolute',
      parent: parent,
    }),
  ];
}
