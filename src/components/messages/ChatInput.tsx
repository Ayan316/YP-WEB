'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Plus, X, SendHorizontal } from 'lucide-react'
import { sendMessage } from '@/services/messages.services'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import styles from '../../moduleCss/messages.module.css'
import { useTheme } from '@/context/ThemeContext'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { isUnauthenticatedError } from '@/lib/authError'
type Props = {
  chatUserId: string
}

export default function ChatInput ({ chatUserId }: Props) {
  const [message, setMessage] = useState('')
  const [media, setMedia] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const queryClient = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isSendingRef = useRef(false)
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20
    const maxHeight = lineHeight * 2
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [message])

  // Create preview URL
  useEffect(() => {
    if (!media) {
      setPreview(null)
      return
    }

    const objectUrl = URL.createObjectURL(media)
    setPreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [media])

  const handleSend = () => {
    if (!message.trim() && !media) return
    if (isSendingRef.current) return
    // Defense-in-depth: /messages is page-guarded, but gate the actual send
    // mutation too so an anonymous user is prompted to log in rather than
    // silently failing on a 401.
    ensureAuthed('send a message', () => {
      void sendChatMessage()
    })
  }

  const sendChatMessage = async () => {
    if (isSendingRef.current) return
    isSendingRef.current = true

    const tempId = `temp-${Date.now()}`
    const tempMessage = {
      id: tempId,
      text_body: message || '',
      media_urls: media ? URL.createObjectURL(media) : null,
      created_at: new Date().toISOString(),
      _sending: true,
      users: { id: 'me' }
    }

    // Optimistically add the message to the cache
    queryClient.setQueryData(['messages', chatUserId], (old: any) => {
      if (!old?.data?.result) return old
      return {
        ...old,
        data: {
          ...old.data,
          result: [...old.data.result, tempMessage]
        }
      }
    })

    const sentText = message
    const sentMedia = media

    setMessage('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMedia(null)
    setPreview(null)

    try {
      await sendMessage({
        peer_id: chatUserId,
        message_text: sentText || undefined,
        message_media: sentMedia || undefined
      })

      queryClient.invalidateQueries({
        queryKey: ['messages', chatUserId]
      })

      queryClient.invalidateQueries({
        queryKey: ['conversations']
      })
    } catch (error) {
      console.error('Send message failed', error)
      // Server-side backstop: if the gateway rejected as UNAUTHENTICATED (e.g.
      // the cookie expired mid-session), prompt login instead of a confusing
      // toast — never force-logout (REQUIREMENTS §5 R4).
      if (isUnauthenticatedError(error)) {
        openGate('send a message')
      } else {
        toast.error('Failed to send message')
      }

      // Remove the optimistic message on failure
      queryClient.setQueryData(['messages', chatUserId], (old: any) => {
        if (!old?.data?.result) return old
        return {
          ...old,
          data: {
            ...old.data,
            result: old.data.result.filter((m: any) => m.id !== tempId)
          }
        }
      })
    } finally {
      isSendingRef.current = false
    }
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      e.target.value = ''
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image size must be less than 5 MB')
      e.target.value = ''
      return
    }
    setMedia(file)
  }

  return (
    <div className='px-3 pt-2 pb-3'>
      {/* Image Preview */}
      {preview && (
        <div className='mb-3 relative inline-block'>
          <img
            src={preview}
            alt='Preview'
            className='h-20 w-20 rounded-lg border border-gray-700 object-cover'
          />
          <button
            onClick={() => setMedia(null)}
            className='absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors'
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Container */}
      <div
        className={` flex items-center gap-3 rounded-full px-3 py-2 border-[#a0aec080] border focus-within:border-[#20bdff]`}
      >
        {/* Add Image Button */}
        <label className='cursor-pointer text-blue-500 hover:text-blue-400 transition-colors shrink-0'>
          <div className='w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors'>
            <Plus size={20} className='text-white' />
          </div>
          <input
            type='file'
            accept='image/*'
            hidden
            onChange={handleMediaChange}
            
          />
        </label>

        {/* Message Input */}
        {/* <input
          type="text"
          placeholder="Write a message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-transparent text-gray-200 placeholder:text-gray-500 outline-none text-sm"
        /> */}
        <textarea
          ref={textareaRef}
          placeholder='Write a message'
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          rows={1}
          className='flex-1 bg-transparent text-gray-200 placeholder:text-gray-500 outline-none text-sm resize-none overflow-hidden'
          style={{ ...(isLight ? { color: '#040F1F' } : {}) }}

        />
        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() && !media}
          className='cursor-pointer shrink-0 w-9 h-9 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors'
        >
          {/* <Send size={16} className="text-white" /> */}
          <SendHorizontal size={16} className='text-white' />
        </button>
      </div>
      {authGateModal}
    </div>
  )
}
