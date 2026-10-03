import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type Editor,
  type NodeViewProps,
} from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { astrologerApi, type BlogDocument, type MediaAsset } from '../api/astrologer'

type Props = {
  initialContent: BlogDocument
  onChange: (document: BlogDocument) => void
  onError: (message: string) => void
  onImageUploaded?: (asset: MediaAsset) => void
}

function validLink(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) }
  catch { return false }
}

function CaptionedImageView({ node, updateAttributes }: NodeViewProps) {
  const caption = typeof node.attrs.title === 'string' ? node.attrs.title : ''
  return (
    <NodeViewWrapper as="figure" className="rich-blog-image" contentEditable={false}>
      <img alt={caption} src={String(node.attrs.src ?? '')} />
      <input
        aria-label="Image caption"
        className="rich-blog-image__caption"
        maxLength={300}
        onChange={(event) => updateAttributes({ alt: event.target.value, title: event.target.value })}
        placeholder="Add a caption"
        value={caption}
      />
    </NodeViewWrapper>
  )
}

const CaptionedImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CaptionedImageView)
  },
})

export function RichBlogEditor({ initialContent, onChange, onError, onImageUploaded }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const insertionPosition = useRef<number | null>(null)
  const linkSelection = useRef<{ from: number; to: number } | null>(null)
  const [addImageTop, setAddImageTop] = useState<number | null>(null)
  const [linkEditorOpen, setLinkEditorOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [uploading, setUploading] = useState(false)

  const updateImageButton = useCallback((current: Editor) => {
    const { $from } = current.state.selection
    const isEmptyParagraph = $from.parent.type.name === 'paragraph' && $from.parent.textContent.trim().length === 0
    if (!isEmptyParagraph || !current.isEditable) {
      setAddImageTop(null)
      return
    }
    insertionPosition.current = current.state.selection.from
    window.requestAnimationFrame(() => {
      const container = root.current
      if (!container) return
      try {
        const cursor = current.view.coordsAtPos(current.state.selection.from)
        setAddImageTop(Math.max(0, cursor.top - container.getBoundingClientRect().top))
      } catch {
        setAddImageTop(0)
      }
    })
  }, [])

  const openLinkEditor = useCallback((current: Editor) => {
    const { from, to } = current.state.selection
    if (from === to) return
    linkSelection.current = { from, to }
    setLinkValue(String(current.getAttributes('link').href ?? ''))
    setLinkEditorOpen(true)
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false, protocols: ['http', 'https'] }),
      CaptionedImage.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: 'Write your post…' }),
    ],
    editorProps: {
      attributes: { class: 'rich-blog-editor__content', 'aria-label': 'Post body' },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
          event.preventDefault()
          if (editor) openLinkEditor(editor)
          return true
        }
        return false
      },
    },
    onCreate: ({ editor: current }) => updateImageButton(current),
    onFocus: ({ editor: current }) => updateImageButton(current),
    onSelectionUpdate: ({ editor: current }) => updateImageButton(current),
    onUpdate: ({ editor: current }) => {
      updateImageButton(current)
      onChange(current.getJSON() as BlogDocument)
    },
  })

  useEffect(() => {
    if (!editor) return
    const container = root.current
    if (!container) return
    const refresh = () => updateImageButton(editor)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh)
    observer?.observe(container)
    container.addEventListener('load', refresh, true)
    return () => {
      observer?.disconnect()
      container.removeEventListener('load', refresh, true)
    }
  }, [editor, updateImageButton])

  if (!editor) return null

  const keepSelection = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault()
  const headingActive = (level: 2 | 3) => editor.isActive('heading') && editor.getAttributes('heading').level === level

  const applyLink = (event: FormEvent) => {
    event.preventDefault()
    const href = linkValue.trim()
    if (!validLink(href)) {
      onError('Links must start with http:// or https://.')
      return
    }
    const range = linkSelection.current
    const chain = editor.chain().focus()
    if (range) chain.setTextSelection(range)
    chain.extendMarkRange('link').setLink({ href }).run()
    setLinkEditorOpen(false)
  }

  const removeLink = () => {
    const range = linkSelection.current
    const chain = editor.chain().focus()
    if (range) chain.setTextSelection(range)
    chain.extendMarkRange('link').unsetLink().run()
    setLinkEditorOpen(false)
  }

  const uploadImage = async (file: File | undefined) => {
    if (!file || insertionPosition.current === null) return
    setUploading(true)
    try {
      const asset = await astrologerApi.uploadBlogImage(file)
      onImageUploaded?.(asset)
      editor.chain().focus().setTextSelection(insertionPosition.current).setImage({ src: asset.url, alt: '', title: '' }).createParagraphNear().run()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The image could not be uploaded.')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="rich-blog-editor" ref={root}>
      <BubbleMenu
        appendTo={() => root.current ?? document.body}
        className="rich-blog-editor__toolbar"
        editor={editor}
        options={{ flip: true, placement: 'top', shift: { padding: 8 } }}
      >
        <div className="rich-blog-editor__toolbar-actions">
          <button aria-label="Bold" aria-pressed={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} onMouseDown={keepSelection} type="button"><strong>B</strong></button>
          <button aria-label="Italic" aria-pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} onMouseDown={keepSelection} type="button"><em>I</em></button>
          <button aria-label="Underline" aria-pressed={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} onMouseDown={keepSelection} type="button"><u>U</u></button>
          <button aria-label="Heading" aria-pressed={headingActive(2)} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} onMouseDown={keepSelection} type="button">H2</button>
          <button aria-label="Subheading" aria-pressed={headingActive(3)} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} onMouseDown={keepSelection} type="button">H3</button>
          <button aria-label="Quote" aria-pressed={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} onMouseDown={keepSelection} type="button">Quote</button>
          <button aria-label="Bulleted list" aria-pressed={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} onMouseDown={keepSelection} type="button">Bullets</button>
          <button aria-label="Numbered list" aria-pressed={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} onMouseDown={keepSelection} type="button">Numbers</button>
          <button aria-label="Link" aria-pressed={editor.isActive('link')} onClick={() => openLinkEditor(editor)} onMouseDown={keepSelection} type="button">Link</button>
        </div>
        {linkEditorOpen ? (
          <form className="rich-blog-editor__link" onSubmit={applyLink}>
            <label className="visually-hidden" htmlFor="blog-link-address">Link address</label>
            <input autoFocus id="blog-link-address" onChange={(event) => setLinkValue(event.target.value)} placeholder="https://example.com" type="url" value={linkValue} />
            <button aria-label="Apply link" type="submit">Apply</button>
            {editor.isActive('link') ? <button aria-label="Remove link" onClick={removeLink} type="button">Remove</button> : null}
          </form>
        ) : null}
      </BubbleMenu>
      <EditorContent editor={editor} />
      <input accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} ref={fileInput} type="file" />
      {addImageTop !== null ? (
        <button
          aria-label="Add image"
          className="rich-blog-editor__add-image"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          onMouseDown={keepSelection}
          style={{ top: addImageTop }}
          type="button"
        >
          {uploading ? '…' : '+'}
        </button>
      ) : null}
      {uploading ? <progress aria-label="Uploading image" className="rich-blog-editor__progress" /> : null}
    </div>
  )
}
