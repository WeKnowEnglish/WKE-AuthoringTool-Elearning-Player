"use client";

import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import "@liveblocks/react-tiptap/styles.css";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { countWords } from "@/lib/document-activity/snapshot";

export type DocumentEditorHandle = {
  getPayload: () => { contentJson: unknown; plainText: string; wordCount: number };
  getEditor: () => Editor | null;
};

type Props = {
  field: string;
  editable: boolean;
  className?: string;
};

export const DocumentCollaborativeEditor = forwardRef<DocumentEditorHandle, Props>(
  function DocumentCollaborativeEditor({ field, editable, className }, ref) {
    const liveblocks = useLiveblocksExtension({
      field,
      offlineSupport_experimental: false,
    });

    const editor = useEditor({
      immediatelyRender: false,
      editable,
      extensions: [
        liveblocks,
        StarterKit.configure({
          undoRedo: false,
          codeBlock: false,
          code: false,
          blockquote: false,
          horizontalRule: false,
          strike: false,
        }),
        Underline,
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-slate max-w-none min-h-[220px] px-3 py-2 focus:outline-none " +
            "[&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold " +
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        },
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getPayload: () => {
          if (!editor) return { contentJson: {}, plainText: "", wordCount: 0 };
          const plainText = editor.getText().trim();
          return {
            contentJson: editor.getJSON(),
            plainText,
            wordCount: countWords(plainText),
          };
        },
      }),
      [editor],
    );

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(editable);
    }, [editable, editor]);

    if (!editor) {
      return (
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
          Loading editor…
        </div>
      );
    }

    return (
      <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${className ?? ""}`}>
        {editable && (
          <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
            <ToolbarButton
              label="H"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
              label="P"
              active={editor.isActive("paragraph")}
              onClick={() => editor.chain().focus().setParagraph().run()}
            />
            <ToolbarButton
              label="B"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              label="U"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
              label="•"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              label="1."
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    );
  },
);

function ToolbarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-bold ${
        active ? "bg-sky-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
      }`}
    >
      {label}
    </button>
  );
}
