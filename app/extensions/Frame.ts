import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    frame: {
      /** Wrap the current block(s) in a bordered frame, or unwrap if already framed. */
      toggleFrame: () => ReturnType;
    };
  }
}

/**
 * A bordered container that can hold any block content (paragraphs, lists,
 * images, etc.). Rendered as <div data-type="frame" class="editor-frame">.
 */
export const Frame = Node.create({
  name: "frame",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="frame"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "frame",
        class: "editor-frame",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleFrame:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});
