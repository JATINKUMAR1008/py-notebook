"use client";
// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import Editor, { OnMount, useMonaco } from "@monaco-editor/react";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Plus,
  Trash,
  Settings,
} from "lucide-react";
import { editor } from "monaco-editor";

interface CellOutput {
  type: "success" | "error";
  content: string;
}

interface CellData {
  id: string;
  content: string;
  output: CellOutput | null;
}

export default function Home() {
  const [cells, setCells] = useState<CellData[]>([
    { id: "1", content: "", output: null },
  ]);
  const [collapsedCells, setCollapsedCells] = useState<Set<string>>(new Set());
  const [cellHeights, setCellHeights] = useState<{ [key: string]: number }>({});
  const monaco = useMonaco();
  const editorRefs = useRef<{ [key: string]: editor.IStandaloneCodeEditor }>(
    {}
  );

  const addCell = () => {
    const newId = (cells.length + 1).toString();
    setCells([...cells, { id: newId, content: "", output: null }]);
  };

  const updateCell = (id: string, content: string) => {
    setCells(
      cells.map((cell) => (cell.id === id ? { ...cell, content } : cell))
    );
    updateEditorHeight(id);
  };

  const deleteCell = (id: string) => {
    setCells(cells.filter((cell) => cell.id !== id));
    setCellHeights((prevHeights) => {
      const newHeights = { ...prevHeights };
      delete newHeights[id];
      return newHeights;
    });
  };

  const toggleCellCollapse = (id: string) => {
    setCollapsedCells((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCellExecution = async (id: string) => {
    const cell = cells.find((c) => c.id === id);
    if (!cell) return;

    try {
      const response = await fetch("/api/execute-cell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cell: cell.content }),
      });

      const result = await response.json();
      setCells(
        cells.map((c) =>
          c.id === id
            ? { ...c, output: { type: "success", content: result.output } }
            : c
        )
      );
    } catch (error: unknown) {
      setCells(
        cells.map((c) =>
          c.id === id
            ? {
                ...c,
                output: {
                  type: "error",
                  content:
                    String(error) || "An error occurred during execution.",
                },
              }
            : c
        )
      );
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, id: string) => {
    if (event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      handleCellExecution(id);
    }
  };

  const updateEditorHeight = (id: string) => {
    const editor = editorRefs.current[id];
    if (editor) {
      const contentHeight = Math.min(
        Math.max(editor.getContentHeight(), 100),
        500
      );
      setCellHeights((prev) => ({ ...prev, [id]: contentHeight }));
    }
  };

  const handleEditorDidMount: OnMount = (editor) => {
    const id = editor.getModel()?.uri.toString().split("/").pop() || "";
    editorRefs.current[id] = editor;

    editor.onDidContentSizeChange(() => updateEditorHeight(id));
    updateEditorHeight(id);

    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: "on",
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      padding: { top: 8, bottom: 8 },
    });

    editor.onKeyDown((e: any) => handleKeyDown(e, id));
  };

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("customDarkTheme", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6A9955" },
          { token: "keyword", foreground: "C586C0" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "B5CEA8" },
          { token: "operator", foreground: "D4D4D4" },
        ],
        colors: {
          "editor.background": "#1E1E1E",
          "editor.foreground": "#D4D4D4",
          "editorCursor.foreground": "#FFFFFF",
          "editor.lineHighlightBackground": "#2A2A2A",
          "editorLineNumber.foreground": "#858585",
          "editor.selectionBackground": "#264F78",
          "editor.inactiveSelectionBackground": "#3A3D41",
        },
      });

      monaco.editor.setTheme("customDarkTheme");

      monaco.languages.register({ id: "python" });
      monaco.languages.setMonarchTokensProvider("python", {
        defaultToken: "",
        tokenPostfix: ".python",
        keywords: [
          "and",
          "as",
          "assert",
          "break",
          "class",
          "continue",
          "def",
          "del",
          "elif",
          "else",
          "except",
          "finally",
          "for",
          "from",
          "global",
          "if",
          "import",
          "in",
          "is",
          "lambda",
          "None",
          "not",
          "or",
          "pass",
          "raise",
          "return",
          "try",
          "while",
          "with",
          "yield",
          "print",
          "True",
          "False",
        ],
        brackets: [
          { open: "{", close: "}", token: "delimiter.curly" },
          { open: "[", close: "]", token: "delimiter.square" },
          { open: "(", close: ")", token: "delimiter.parenthesis" },
        ],
        tokenizer: {
          root: [
            { include: "@whitespace" },
            { include: "@numbers" },
            { include: "@strings" },
            [/[,:;]/, "delimiter"],
            [/[{}\[\]()]/, "@brackets"],
            [/@[a-zA-Z]\w*/, "tag"],
            [
              /[a-zA-Z]\w*/,
              {
                cases: {
                  "@keywords": "keyword",
                  "@default": "identifier",
                },
              },
            ],
          ],
          whitespace: [
            [/\s+/, "white"],
            [/(^#.*$)/, "comment"],
          ],
          numbers: [
            [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
            [/0[xX][0-9a-fA-F]+/, "number.hex"],
            [/\d+/, "number"],
          ],
          strings: [
            [
              /'/,
              {
                token: "string.quote",
                bracket: "@open",
                next: "@string_single",
              },
            ],
            [
              /"/,
              {
                token: "string.quote",
                bracket: "@open",
                next: "@string_double",
              },
            ],
          ],
          string_single: [
            [/[^']+/, "string"],
            [/''/, "string"],
            [/'/, { token: "string.quote", bracket: "@close", next: "@pop" }],
          ],
          string_double: [
            [/[^"]+/, "string"],
            [/""/, "string"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
          ],
        },
      });

      monaco.languages.registerCompletionItemProvider("python", {
        provideCompletionItems: () => {
          const suggestions = [
            {
              label: "print",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "print(${1:object})",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Print objects to the text stream file",
            },
            {
              label: "def",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText:
                "def ${1:function_name}(${2:parameters}):\n\t${3:pass}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Define a new function",
            },
            {
              label: "for",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "for ${1:item} in ${2:iterable}:\n\t${3:pass}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "For loop",
            },
            {
              label: "if",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "if ${1:condition}:\n\t${2:pass}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "If statement",
            },
          ];
          return { suggestions };
        },
      });
    }
  }, [monaco]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-blue-400">
          Modern Python Notebook
        </h1>
        <div className="flex space-x-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition duration-300 ease-in-out flex items-center"
            onClick={addCell}
          >
            <Plus size={18} className="mr-2" />
            Add Cell
          </button>
          <button className="text-gray-400 hover:text-white transition duration-300 ease-in-out">
            <Settings size={24} />
          </button>
        </div>
      </header>

      <main className="p-8 space-y-6 flex-grow overflow-auto">
        {cells.map((cell) => (
          <div
            key={cell.id}
            className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl"
          >
            <div className="flex items-center justify-between bg-gray-700 px-4 py-2 text-sm text-gray-300 rounded-t-lg">
              <div className="flex items-center">
                <button
                  onClick={() => toggleCellCollapse(cell.id)}
                  className="mr-2 focus:outline-none text-gray-400 hover:text-white transition duration-300 ease-in-out"
                >
                  {collapsedCells.has(cell.id) ? (
                    <ChevronRight size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>
                <span>In [{cell.id}]:</span>
              </div>
              <button
                onClick={() => deleteCell(cell.id)}
                className="text-red-400 hover:text-red-600 transition duration-300 ease-in-out"
              >
                <Trash size={18} />
              </button>
            </div>
            {!collapsedCells.has(cell.id) && (
              <div className="p-4">
                <Editor
                  height={cellHeights[cell.id] || "100px"}
                  defaultLanguage="python"
                  value={cell.content}
                  onChange={(value) => updateCell(cell.id, value || "")}
                  onMount={handleEditorDidMount}
                  options={{
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: "on",
                    glyphMargin: false,
                    folding: false,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3,
                    minimap: { enabled: false },
                    wordWrap: "on",
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    theme: "customDarkTheme",
                  }}
                />
              </div>
            )}
            <div className="flex justify-end p-2 bg-gray-700 rounded-b-lg">
              <button
                className="px-3 py-1 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 transition duration-300 ease-in-out flex items-center"
                onClick={() => handleCellExecution(cell.id)}
              >
                <Play size={14} className="mr-1" />
                Run
              </button>
            </div>

            {cell.output && !collapsedCells.has(cell.id) && (
              <div
                className={`mt-2 p-4 rounded-b-lg ${
                  cell.output.type === "error" ? "bg-red-900" : "bg-gray-700"
                }`}
              >
                <div className="text-sm font-semibold text-gray-400">
                  Out [{cell.id}]:
                </div>
                <pre
                  className={`whitespace-pre-wrap mt-2 p-3 rounded border ${
                    cell.output.type === "error"
                      ? "bg-red-800 border-red-700"
                      : "bg-gray-800 border-gray-600"
                  }`}
                >
                  {cell.output.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
