import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export type SearchResult = { from: number; to: number };

interface SearchReplaceStorage {
  searchTerm: string;
  replaceTerm: string;
  results: SearchResult[];
  currentIndex: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchTerm: (term: string) => ReturnType;
      setReplaceTerm: (term: string) => ReturnType;
      nextSearchResult: () => ReturnType;
      previousSearchResult: () => ReturnType;
      replaceCurrent: () => ReturnType;
      replaceAll: () => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
  interface Storage {
    searchReplace: SearchReplaceStorage;
  }
}

const searchReplaceKey = new PluginKey("searchReplace");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find every occurrence of `searchTerm`, merging text across marks within a block. */
function processSearches(
  doc: PMNode,
  searchTerm: string,
  caseSensitive: boolean
): SearchResult[] {
  const results: SearchResult[] = [];
  if (!searchTerm) return results;

  const merged: { text: string; pos: number }[] = [];
  let index = 0;
  doc.descendants((node, pos) => {
    if (node.isText) {
      if (merged[index]) {
        merged[index].text += node.text ?? "";
      } else {
        merged[index] = { text: node.text ?? "", pos };
      }
    } else {
      index += 1;
    }
  });

  for (const { text, pos } of merged.filter(Boolean)) {
    const re = new RegExp(escapeRegExp(searchTerm), caseSensitive ? "g" : "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      results.push({ from: pos + m.index, to: pos + m.index + m[0].length });
      if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
    }
  }
  return results;
}

export const SearchReplace = Extension.create<{ caseSensitive: boolean }>({
  name: "searchReplace",

  addOptions() {
    return { caseSensitive: false };
  },

  addStorage(): SearchReplaceStorage {
    return { searchTerm: "", replaceTerm: "", results: [], currentIndex: -1 };
  },

  addCommands() {
    return {
      setSearchTerm:
        (term) =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.searchReplace as SearchReplaceStorage;
          s.searchTerm = term;
          s.results = processSearches(
            editor.state.doc,
            term,
            this.options.caseSensitive
          );
          s.currentIndex = s.results.length ? 0 : -1;
          if (dispatch) dispatch(tr.setMeta(searchReplaceKey, true));
          return true;
        },

      setReplaceTerm:
        (term) =>
        ({ editor }) => {
          (editor.storage.searchReplace as SearchReplaceStorage).replaceTerm =
            term;
          return true;
        },

      nextSearchResult:
        () =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.searchReplace as SearchReplaceStorage;
          if (!s.results.length) return false;
          s.currentIndex = (s.currentIndex + 1) % s.results.length;
          const r = s.results[s.currentIndex];
          if (dispatch) {
            dispatch(
              tr
                .setSelection(TextSelection.create(tr.doc, r.from, r.to))
                .scrollIntoView()
                .setMeta(searchReplaceKey, true)
            );
          }
          return true;
        },

      previousSearchResult:
        () =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.searchReplace as SearchReplaceStorage;
          if (!s.results.length) return false;
          s.currentIndex =
            (s.currentIndex - 1 + s.results.length) % s.results.length;
          const r = s.results[s.currentIndex];
          if (dispatch) {
            dispatch(
              tr
                .setSelection(TextSelection.create(tr.doc, r.from, r.to))
                .scrollIntoView()
                .setMeta(searchReplaceKey, true)
            );
          }
          return true;
        },

      replaceCurrent:
        () =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.searchReplace as SearchReplaceStorage;
          if (s.currentIndex < 0 || !s.results.length) return false;
          const r = s.results[s.currentIndex];
          if (dispatch) {
            tr.insertText(s.replaceTerm, r.from, r.to);
            s.results = processSearches(
              tr.doc,
              s.searchTerm,
              this.options.caseSensitive
            );
            s.currentIndex = s.results.length
              ? Math.min(s.currentIndex, s.results.length - 1)
              : -1;
            dispatch(tr.setMeta(searchReplaceKey, true));
          }
          return true;
        },

      replaceAll:
        () =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.searchReplace as SearchReplaceStorage;
          if (!s.results.length) return false;
          if (dispatch) {
            // Replace last → first so earlier positions stay valid.
            [...s.results]
              .sort((a, b) => b.from - a.from)
              .forEach((r) => tr.insertText(s.replaceTerm, r.from, r.to));
            s.results = [];
            s.currentIndex = -1;
            dispatch(tr.setMeta(searchReplaceKey, true));
          }
          return true;
        },

      clearSearch:
        () =>
        ({ editor, tr, dispatch }) => {
          const s = editor.storage.searchReplace as SearchReplaceStorage;
          s.searchTerm = "";
          s.results = [];
          s.currentIndex = -1;
          if (dispatch) dispatch(tr.setMeta(searchReplaceKey, true));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage as SearchReplaceStorage;
    return [
      new Plugin({
        key: searchReplaceKey,
        props: {
          decorations(state) {
            const max = state.doc.content.size;
            const decos = storage.results
              .filter((r) => r.from >= 0 && r.to <= max)
              .map((r, i) =>
                Decoration.inline(r.from, r.to, {
                  class:
                    i === storage.currentIndex
                      ? "search-result search-result-current"
                      : "search-result",
                })
              );
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
