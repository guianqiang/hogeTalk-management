'use client'

import { useEffect, useState } from 'react'
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  Underline,
  Unlink,
} from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '请输入正文内容',
}: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          autolink: true,
          openOnClick: false,
          defaultProtocol: 'https',
          HTMLAttributes: {
            class: 'text-ember-700 underline decoration-ember-300 underline-offset-2',
            rel: 'noopener noreferrer nofollow',
          },
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'min-h-72 px-4 py-3 text-sm leading-7 outline-none',
          '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold',
          '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-ember-400',
          '[&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground',
          '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6',
          '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6',
          '[&_li]:my-1',
        ),
      },
    },
    onUpdate: ({ editor: nextEditor }) => onChange(nextEditor.getHTML()),
  })

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return
    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  if (!editor) {
    return <div className="min-h-72 animate-pulse rounded-md border bg-muted/25" />
  }

  const tools = [
    {
      label: '正文',
      icon: Pilcrow,
      active: editor.isActive('paragraph'),
      run: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: '二级标题',
      icon: Heading2,
      active: editor.isActive('heading', { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: '粗体',
      icon: Bold,
      active: editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: '斜体',
      icon: Italic,
      active: editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: '删除线',
      icon: Strikethrough,
      active: editor.isActive('strike'),
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: '下划线',
      icon: Underline,
      active: editor.isActive('underline'),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: '无序列表',
      icon: List,
      active: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: '有序列表',
      icon: ListOrdered,
      active: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '引用',
      icon: Quote,
      active: editor.isActive('blockquote'),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ]

  function applyLink() {
    if (!editor) return
    const href = linkValue.trim()
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkOpen(false)
  }

  return (
    <div className="overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/25 p-2">
        {tools.map((tool) => (
          <Button
            key={tool.label}
            type="button"
            size="icon"
            variant={tool.active ? 'secondary' : 'ghost'}
            className="h-8 w-8"
            onClick={tool.run}
            aria-label={tool.label}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <Popover open={linkOpen} onOpenChange={(open) => {
          setLinkOpen(open)
          if (open) setLinkValue(editor.getAttributes('link').href ?? '')
        }}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={editor.isActive('link') ? 'secondary' : 'ghost'}
              className="h-8 w-8"
              aria-label="添加链接"
              title="添加链接"
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
            <p className="text-sm font-medium">添加链接</p>
            <div className="mt-2 flex gap-2">
              <Input
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && applyLink()}
                placeholder="https://example.com"
              />
              <Button type="button" onClick={applyLink}>应用</Button>
            </div>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().unsetLink().run()}
          aria-label="移除链接"
          title="移除链接"
        >
          <Unlink className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
          aria-label="撤销"
          title="撤销"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
          aria-label="重做"
          title="重做"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative">
        {editor.isEmpty && (
          <span className="pointer-events-none absolute left-4 top-3 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} />
      </div>
      <div className="border-t bg-muted/15 px-3 py-2 text-right text-[11px] text-muted-foreground">
        {editor.getText().trim().length} 字
      </div>
    </div>
  )
}
