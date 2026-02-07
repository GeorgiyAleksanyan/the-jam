'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react';

// Mention suggestion configuration
const createMentionSuggestion = (fetchUsers: (query: string) => Promise<MentionItem[]>) => ({
  items: async ({ query }: { query: string }) => {
    if (!query) return [];
    return await fetchUsers(query);
  },
  render: () => {
    const _component: HTMLDivElement | null = null;
    let popup: HTMLDivElement | null = null;
    let selectedIndex = 0;
    let items: MentionItem[] = [];
    let command: ((props: { id: string; label: string }) => void) | null = null;

    return {
      onStart: (props: any) => {
        items = props.items;
        command = props.command;
        selectedIndex = 0;

        popup = document.createElement('div');
        popup.className = 'mention-popup';
        document.body.appendChild(popup);
        
        updatePopup(props.clientRect);
      },
      onUpdate: (props: any) => {
        items = props.items;
        command = props.command;
        selectedIndex = 0;
        updatePopup(props.clientRect);
      },
      onKeyDown: (props: any) => {
        if (props.event.key === 'ArrowUp') {
          selectedIndex = (selectedIndex + items.length - 1) % items.length;
          updatePopup(props.clientRect);
          return true;
        }
        if (props.event.key === 'ArrowDown') {
          selectedIndex = (selectedIndex + 1) % items.length;
          updatePopup(props.clientRect);
          return true;
        }
        if (props.event.key === 'Enter') {
          if (items[selectedIndex] && command) {
            command({ id: items[selectedIndex].id, label: items[selectedIndex].label });
          }
          return true;
        }
        if (props.event.key === 'Escape') {
          popup?.remove();
          return true;
        }
        return false;
      },
      onExit: () => {
        popup?.remove();
      },
    };

    function updatePopup(clientRect: (() => DOMRect) | null) {
      if (!popup || !clientRect) return;
      const rect = clientRect();
      
      popup.style.position = 'fixed';
      popup.style.left = `${rect.left}px`;
      popup.style.top = `${rect.bottom + 4}px`;
      popup.style.zIndex = '9999';
      
      popup.innerHTML = items.length === 0 
        ? '<div class="mention-item text-zinc-500 px-3 py-2">No results</div>'
        : items.map((item, index) => `
          <div class="mention-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}">
            ${item.avatar ? `<img src="${item.avatar}" class="mention-avatar" />` : ''}
            <span>${item.label}</span>
          </div>
        `).join('');
      
      // Add click handlers
      popup.querySelectorAll('.mention-item').forEach((el, index) => {
        el.addEventListener('click', () => {
          if (items[index] && command) {
            command({ id: items[index].id, label: items[index].label });
          }
        });
      });
    }
  },
});

// Slash command configuration
const slashCommands = [
  { id: 'code', label: 'Code Block', icon: '💻', action: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run() },
  { id: 'quote', label: 'Quote', icon: '💬', action: (editor: Editor) => editor.chain().focus().toggleBlockquote().run() },
  { id: 'bullet', label: 'Bullet List', icon: '•', action: (editor: Editor) => editor.chain().focus().toggleBulletList().run() },
  { id: 'numbered', label: 'Numbered List', icon: '1.', action: (editor: Editor) => editor.chain().focus().toggleOrderedList().run() },
  { id: 'heading', label: 'Heading', icon: 'H', action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: 'divider', label: 'Divider', icon: '—', action: (editor: Editor) => editor.chain().focus().setHorizontalRule().run() },
];

export interface MentionItem {
  id: string;
  label: string;
  avatar?: string;
}

export interface RichEditorRef {
  getMarkdown: () => string;
  getHTML: () => string;
  clear: () => void;
  focus: () => void;
}

interface RichEditorProps {
  placeholder?: string;
  initialContent?: string;
  onSubmit?: (content: string) => void;
  fetchMentions?: (query: string) => Promise<MentionItem[]>;
  disabled?: boolean;
  className?: string;
}

const RichEditor = forwardRef<RichEditorRef, RichEditorProps>(({
  placeholder = 'Write a comment... Use @ to mention, / for commands',
  initialContent = '',
  onSubmit,
  fetchMentions,
  disabled = false,
  className = '',
}, ref) => {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ x: 0, y: 0 });
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      ...(fetchMentions ? [
        Mention.configure({
          HTMLAttributes: { class: 'mention' },
          suggestion: createMentionSuggestion(fetchMentions),
        }),
      ] : []),
    ],
    content: initialContent,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[80px] p-3',
      },
      handleKeyDown: (view, event) => {
        // Handle slash commands
        if (event.key === '/' && !showSlashMenu) {
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);
          setSlashMenuPos({ x: coords.left, y: coords.bottom + 4 });
          setShowSlashMenu(true);
          setSlashFilter('');
          setSlashIndex(0);
          return false;
        }
        
        if (showSlashMenu) {
          if (event.key === 'Escape') {
            setShowSlashMenu(false);
            return true;
          }
          if (event.key === 'ArrowUp') {
            setSlashIndex(i => (i + filteredCommands.length - 1) % filteredCommands.length);
            return true;
          }
          if (event.key === 'ArrowDown') {
            setSlashIndex(i => (i + 1) % filteredCommands.length);
            return true;
          }
          if (event.key === 'Enter') {
            const cmd = filteredCommands[slashIndex];
            if (cmd && editor) {
              // Delete the slash
              editor.commands.deleteRange({ from: view.state.selection.from - slashFilter.length - 1, to: view.state.selection.from });
              cmd.action(editor);
            }
            setShowSlashMenu(false);
            return true;
          }
          if (event.key === 'Backspace' && slashFilter === '') {
            setShowSlashMenu(false);
            return false;
          }
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            setSlashFilter(f => f + event.key);
            setSlashIndex(0);
          }
          if (event.key === 'Backspace') {
            setSlashFilter(f => f.slice(0, -1));
          }
        }

        // Cmd/Ctrl + Enter to submit
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          if (onSubmit && editor) {
            onSubmit(getMarkdown());
          }
          return true;
        }

        return false;
      },
    },
  });

  const filteredCommands = slashCommands.filter(cmd => 
    cmd.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
    cmd.id.toLowerCase().includes(slashFilter.toLowerCase())
  );

  // Convert HTML to Markdown (simplified)
  // Note: This converts trusted editor content to markdown, not security sanitization
  // lgtm[js/incomplete-multi-character-sanitization]
  const getMarkdown = useCallback(() => {
    if (!editor) return '';
    const html = editor.getHTML();
    
    // Basic HTML to Markdown conversion
    return html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n')
      .replace(/<li>(.*?)<\/li>/g, '- $1\n')
      .replace(/<ul>|<\/ul>|<ol>|<\/ol>/g, '')
      .replace(/<hr\s*\/?>/g, '---\n')
      .replace(/<span[^>]*class="mention"[^>]*data-id="([^"]*)"[^>]*>@([^<]*)<\/span>/g, '@$2')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, [editor]);

  useImperativeHandle(ref, () => ({
    getMarkdown,
    getHTML: () => editor?.getHTML() || '',
    clear: () => editor?.commands.clearContent(),
    focus: () => editor?.commands.focus(),
  }));

  // Close slash menu on click outside
  useEffect(() => {
    const handleClick = () => setShowSlashMenu(false);
    if (showSlashMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showSlashMenu]);

  if (!editor) return null;

  return (
    <div className={`rich-editor relative ${className}`}>
      <div className="border border-zinc-700 rounded-lg bg-zinc-900 focus-within:border-blue-500 transition-colors">
        <EditorContent editor={editor} />
        
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('bold') ? 'bg-zinc-700' : ''}`}
            title="Bold (Ctrl+B)"
          >
            <span className="font-bold text-sm">B</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('italic') ? 'bg-zinc-700' : ''}`}
            title="Italic (Ctrl+I)"
          >
            <span className="italic text-sm">I</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('code') ? 'bg-zinc-700' : ''}`}
            title="Code"
          >
            <span className="font-mono text-sm">{`<>`}</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('codeBlock') ? 'bg-zinc-700' : ''}`}
            title="Code Block"
          >
            <span className="font-mono text-xs">{'```'}</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('blockquote') ? 'bg-zinc-700' : ''}`}
            title="Quote"
          >
            <span className="text-sm">"</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-zinc-800 ${editor.isActive('bulletList') ? 'bg-zinc-700' : ''}`}
            title="Bullet List"
          >
            <span className="text-sm">•</span>
          </button>
          
          <div className="flex-1" />
          
          <span className="text-xs text-zinc-500">
            @ mention • / commands • ⌘↵ submit
          </span>
        </div>
      </div>

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <div 
          className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{ left: slashMenuPos.x, top: slashMenuPos.y }}
        >
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-2 text-zinc-500 text-sm">No commands found</div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-700 ${
                  index === slashIndex ? 'bg-zinc-700' : ''
                }`}
                onClick={() => {
                  if (editor) {
                    editor.commands.deleteRange({ 
                      from: editor.state.selection.from - slashFilter.length - 1, 
                      to: editor.state.selection.from 
                    });
                    cmd.action(editor);
                  }
                  setShowSlashMenu(false);
                }}
              >
                <span className="w-6 text-center">{cmd.icon}</span>
                <span className="text-sm">{cmd.label}</span>
              </button>
            ))
          )}
        </div>
      )}

      <style jsx global>{`
        .mention-popup {
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          padding: 4px 0;
          min-width: 180px;
        }
        .mention-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .mention-item:hover, .mention-item.selected {
          background: #3f3f46;
        }
        .mention-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .mention {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 2px 4px;
          border-radius: 4px;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #71717a;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
});

RichEditor.displayName = 'RichEditor';

export default RichEditor;
