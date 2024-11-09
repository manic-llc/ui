import { EditorState, StateEffect, StateField, RangeSetBuilder } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { clike } from '@codemirror/legacy-modes/mode/clike';
import { StreamLanguage, bracketMatching, indentOnInput } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import {
  EditorView,
  Decoration,
  DecorationSet,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  dropCursor,
  tooltips,
} from '@codemirror/view';
import { RAW_UTILS, INTERNAL_UNIFORMS, DEFAULT_UNIFORMS } from './../constants/glsl-defaults';
import { BLOCKS, MATH, KEYWORDS, TYPES } from './../constants/glsl-lang';
import * as themes from 'thememirror';

function toKeyObject(arr: any): any {
  return arr.reduce((acc: any, key: any) => ({ ...acc, [key]: true }), {} as any);
}

function glsl(uniforms: any[]) {
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

function getBaseExtensions({ parent }: any) {
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

import { useDocument } from '@composables/useDocument';

const $doc = useDocument();

function blockCharacters(blockedChars: any) {
  return (EditorView as any).inputHandler.of((view: any, from: any, to: any, text: any) => {
    if (blockedChars.some((char: any) => text.includes(char))) return true;
    return false;
  });
}

// Effect to set new error lines
const setErrorLinesEffect = StateEffect.define<number[]>();

// Function to create decorations for error lines
function errorLineDecorator(lineNumbers: number[], state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  lineNumbers.forEach(lineNumber => {
    const line = state.doc.line(lineNumber);
    if (line) {
      builder.add(line.from, line.from, Decoration.line({ attributes: { class: 'cm-line-error' } }));
    }
  });
  return builder.finish();
}

// StateField to store error line decorations
const errorLinesField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // Map decorations through document changes
    decorations = decorations.map(tr.changes);
    for (let effect of tr.effects) {
      if (effect.is(setErrorLinesEffect)) {
        // Recreate decorations based on the new line numbers
        decorations = errorLineDecorator(effect.value, tr.state);
      }
    }
    return decorations;
  },
  provide: f => EditorView.decorations.from(f),
});

export default class Editor {
  private view: EditorView;
  public onUpdate: any;
  public onSelect: any;

  constructor(config = {}) {
    const parent: HTMLElement =
      typeof config.parent === 'string' ? $doc.querySelector(config.parent) : config.parent || ($doc.body as HTMLElement);

    const { doc, uniforms, onUpdate, onSelect, language } = {
      doc: '',
      uniforms: [],
      onUpdate: (e: any) => e,
      onSelect: (e: any) => {},
      language: 'GLSL',
      ...config,
    };

    this._value = (doc || '').trim();
    this.language = language;
    this.onUpdate = onUpdate.bind(this);
    this.onSelect = onSelect.bind(this);
    this.onSelectionChange = this.onSelectionChange.bind(this);
    this.parent = parent;
    this.doc = doc || '';
    this.uniforms = uniforms;
    this.state = this.createState();
    this.view = new EditorView({
      parent: this.parent,
      state: this.state,
    });
  }

  get selectedText() {
    return this.view.state.sliceDoc(this.view.state.selection.main.from, this.view.state.selection.main.to);
  }

  getLanguage(): any {
    switch (this.language) {
      case 'GLSL':
        return glsl(this.uniforms);
      case 'HTML':
        return html();
    }
  }

  createState() {
    return EditorState.create({
      doc: this.doc.trim(),
      extensions: [
        ...getBaseExtensions({ parent: this.parent }),
        this.getLanguage(),
        EditorView.updateListener.of(this.update.bind(this)),
        blockCharacters(['µ', '˙']),
        errorLinesField,
        EditorView.updateListener.of(this.onSelectionChange),
      ],
    });
  }

  update(e) {
    if (typeof this.onUpdate !== 'function') return;
    const { state, docChanged } = e;
    if (!docChanged) return;
    this._value = state.doc.toString();
    this.onUpdate(this._value);
  }

  onSelectionChange(update) {
    if (update.selectionSet) {
      const selectedText = update.state.sliceDoc(update.state.selection.main.from, update.state.selection.main.to);
      this.onSelect(selectedText);
    }
  }

  error(error) {
    if (!error) {
      this.view.dispatch({
        effects: setErrorLinesEffect.of([]),
      });

      return;
    }

    const { line, message } = error;

    this.view.dispatch({
      effects: setErrorLinesEffect.of([line]),
    });
  }

  destroy() {
    this.view?.destroy?.();
  }
}
