'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Sparkles,
  Send,
  SendHorizontal,
  RotateCcw,
  Check,
  ChevronRight,
  Zap,
  Heart,
  Pencil,
  Save,
  RotateCw,
  Trash2,
  PenLine
} from 'lucide-react'
import OpenAI from 'openai'
import {
  fetchAISummaryQuestions,
  addAISummary
} from '@/services/ai_summary.services'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useTheme } from '@/context/ThemeContext'
import ConfirmModal from '@/components/commonUI/ConfirmModal'
import { useAuthGate } from '@/app/hooks/useAuthGate'
import { isUnauthenticatedError } from '@/lib/authError'
import '@/moduleCss/ai_summary.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AISummaryQuestion {
  id: string
  question: string
  placeholder: string
  max_length: string
  question_type: 'strengths' | 'interests'
  description?: string
}

interface ApiSystemPrompts {
  strengths_generation: string
  interests_generation: string
}

interface ProfileData {
  name: string
  age?: string | number
  designation?: string
  location?: string
  education?: string[]
  existingSkills?: string[]
}

interface SummaryGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onSummaryGenerated: (data: { strength: string; interest: string }) => void
  userName?: string
  profileData?: ProfileData
  hasExistingSummary?: boolean
}

interface Message {
  id: string
  role: 'ai' | 'user'
  text: string
  type?: 'validation'
  description?: string
  questionIndex?: number
}

// ─── AI Provider Layer ────────────────────────────────────────────────────────

const OPENAI_MODELS = [
  'gpt-4o-mini',
  'gpt-3.5-turbo',
] as const

type OpenAIModel = typeof OPENAI_MODELS[number]

interface AIConfig {
  primary: OpenAIModel
  fallback: OpenAIModel | null
}

const AI_CONFIG: AIConfig = {
  primary: OPENAI_MODELS[0],
  fallback: OPENAI_MODELS[1]
}

let openaiClient: OpenAI | null = null
function getOpenAIClient (): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
      dangerouslyAllowBrowser: true
    })
  }
  return openaiClient
}

// ─── User Context Builder ─────────────────────────────────────────────────────

function buildProfileContext (profileData: ProfileData): string {
  const profileLines: string[] = [`- Name: ${profileData.name}`]
  if (profileData.age) profileLines.push(`- Age: ${profileData.age}`)
  if (profileData.designation)
    profileLines.push(`- Current Designation: ${profileData.designation}`)
  if (profileData.location)
    profileLines.push(`- Location: ${profileData.location}`)
  if (profileData.education?.length)
    profileLines.push(`- Education: ${profileData.education.join(', ')}`)
  if (profileData.existingSkills?.length)
    profileLines.push(
      `- Existing Skills: ${profileData.existingSkills.join(', ')}`
    )
  return profileLines.join('\n')
}

function buildUserContext (
  profileData: ProfileData,
  questions: AISummaryQuestion[],
  answers: Record<string, string>,
  filterType?: 'strengths' | 'interests'
): string {
  const filtered = filterType
    ? questions.filter(q => q.question_type === filterType)
    : questions

  const answerLines = filtered
    .map((q, i) => `${i + 1}. ${q.question}: ${answers[q.id] ?? ''}`)
    .join('\n')

  return `PROFILE:\n${buildProfileContext(profileData)}\n\nUSER ANSWERS:\n${answerLines}`
}

// ─── Parse Helpers ────────────────────────────────────────────────────────────

// Cleans AI output by stripping markdown code fences and trimming whitespace.
function parseAIResponse (raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json|markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
  return cleaned.trim()
}

// Strength-specific cleanup: the strength prompt sometimes leaks Interest-tab
// sections into the response (e.g. "Interest Summary", "What Excites Me"). Cut
// the strength content off the moment any interest heading is encountered so
// the Strength tab only renders strength material.
function parseStrengthResponse (raw: string): string {
  const cleaned = parseAIResponse(raw)
  // Common headings the interest prompt uses. Matched at line start with
  // optional markdown formatting (#, **, etc.).
  const interestHeadingRegex =
    /(^|\n)\s*(?:#{1,6}\s*|\*\*|__)?\s*(Interest Summary|What Excites Me|Interests?\s*&?\s*Passions|My Interests?|Why It Excites Me)\b/i
  const match = cleaned.match(interestHeadingRegex)
  if (match && typeof match.index === 'number') {
    return cleaned.slice(0, match.index).trimEnd()
  }
  return cleaned
}

// ─── Provider Caller ──────────────────────────────────────────────────────────

async function callProviderWithPrompt (
  modelName: OpenAIModel,
  system: string,
  prompt: string,
  parse: (text: string) => string
): Promise<string> {
  const client = getOpenAIClient()
  const completion = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ]
  })
  const text = completion.choices[0]?.message?.content ?? ''
  return parse(text)
}

// ─── Public generate() ────────────────────────────────────────────────────────

async function generate (
  profileData: ProfileData,
  questions: AISummaryQuestion[],
  answers: Record<string, string>,
  systemPrompts: ApiSystemPrompts
): Promise<{ strength: string; interest: string; usedFallback: boolean }> {
  const { primary, fallback } = AI_CONFIG
  const strengthsContext = buildUserContext(profileData, questions, answers, 'strengths')
  const interestsContext = buildUserContext(profileData, questions, answers, 'interests')

  async function callWithFallback (
    system: string,
    userContext: string,
    parse: (text: string) => string
  ): Promise<{ value: string; usedFallback: boolean }> {
    try {
      const value = await callProviderWithPrompt(
        primary,
        system,
        userContext,
        parse
      )
      return { value, usedFallback: false }
    } catch (err) {
      if (!fallback) throw err
      console.warn(`[AI] ${primary} failed, trying ${fallback}:`, err)
      const value = await callProviderWithPrompt(
        fallback,
        system,
        userContext,
        parse
      )
      return { value, usedFallback: true }
    }
  }

  const parseInterestJSON = (raw: string): string => {
    const cleaned = parseAIResponse(raw)
    // Try standard parse first (valid JSON with escaped newlines)
    try {
      const json = JSON.parse(cleaned)
      // Only trust `summary` when it's actually a string — the model
      // occasionally emits it as an object/array, which would crash the
      // downstream character-by-character streamer (.slice on a non-string).
      return typeof json.summary === 'string' ? json.summary : cleaned
    } catch {
      // AI often outputs literal newlines inside JSON strings, making it invalid.
      // Extract the "summary" value directly by slicing from the marker to end.
      const markerIdx = cleaned.indexOf('"summary"')
      if (markerIdx !== -1) {
        let slice = cleaned.slice(markerIdx + '"summary"'.length).trim()
        // Remove ": "
        if (slice.startsWith(':')) slice = slice.slice(1).trim()
        // Remove opening quote
        if (slice.startsWith('"')) slice = slice.slice(1)
        // Remove trailing quote + optional closing brace
        slice = slice.replace(/"\s*\}?\s*$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"')
        return slice.trim()
      }
      return cleaned
    }
  }

  const [strengthResult, interestResult] = await Promise.all([
    callWithFallback(systemPrompts.strengths_generation, strengthsContext, parseStrengthResponse),
    callWithFallback(systemPrompts.interests_generation, interestsContext, parseInterestJSON)
  ])

  return {
    strength: strengthResult.value,
    interest: interestResult.value,
    usedFallback: strengthResult.usedFallback || interestResult.usedFallback
  }
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingDots () {
  return (
    <div className='sgm-typing-dots'>
      <span />
      <span />
      <span />
    </div>
  )
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function renderInline (text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
  )
}

// Normalises inconsistently-formatted AI output before rendering.
// Handles: "## Heading — inline content", orphan bullets, title-case section names without "##".
function normalizeMarkdown (text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // "## Heading — inline content" → split into heading + content paragraph
    if (trimmed.startsWith('## ')) {
      const dashMatch = trimmed.match(/^(##\s+.+?)\s*[—–]\s*(.+)$/)
      if (dashMatch) {
        out.push(dashMatch[1].trim())
        if (dashMatch[2].trim()) out.push(dashMatch[2].trim())
        i++
        continue
      }
    }

    // Orphan bullet symbol alone on a line → combine with next line as a bullet
    if (/^[•·●]\s*$/.test(trimmed) && i + 1 < lines.length) {
      out.push(`- ${lines[i + 1].trim()}`)
      i += 2
      continue
    }

    // Title-case section heading without ## (2–5 capitalized words, no trailing punctuation)
    // e.g. "Key Skills", "What Excites Me", "Career Aspirations"
    if (/^([A-Z][a-z]+ ){1,4}[A-Z][a-z]+$/.test(trimmed)) {
      out.push(`## ${trimmed}`)
      i++
      continue
    }

    // "Section Name —" with trailing dash → also promote
    if (/^[A-Z][^#\n]+[—–]\s*$/.test(trimmed)) {
      out.push(`## ${trimmed.replace(/\s*[—–]\s*$/, '')}`)
      i++
      continue
    }

    out.push(line)
    i++
  }
  return out.join('\n')
}



function renderMarkdown (text: string) {
  return normalizeMarkdown(text).split('\n').map((line, i) => {
    // Section labels like "SKILLS:" or "SUMMARY:"
    if (/^(SKILLS|SUMMARY):?\s*$/.test(line.trim())) {
      return <div key={i} className='sgm-md-section-label'>{line.trim().replace(/:$/, '')}</div>
    }
    if (line.startsWith('## ')) {
      return (
        <div key={i} className='sgm-md-heading'>
          {renderInline(line.slice(3))}
        </div>
      )
    }
    // Dash bullets: "- text" or "* text"
    if (/^[-*]\s+/.test(line)) {
      return (
        <div key={i} className='sgm-md-bullet'>
          <span className='sgm-md-dot'>•</span>
          <span>{renderInline(line.replace(/^[-*]\s+/, ''))}</span>
        </div>
      )
    }
    // Unicode bullets with content
    if (/^[••]\s+/.test(line)) {
      return (
        <div key={i} className='sgm-md-bullet'>
          <span className='sgm-md-dot'>•</span>
          <span>{renderInline(line.replace(/^[••]\s+/, ''))}</span>
        </div>
      )
    }
    if (line.trim() === '') return <div key={i} className='sgm-md-gap' />
    return (
      <div key={i} className='sgm-md-text'>
        {renderInline(line)}
      </div>
    )
  })
}

// ─── Streaming Text Hook ──────────────────────────────────────────────────────
// Animates fullText character by character using requestAnimationFrame.
// Adaptive speed: longer text streams faster to avoid overly slow reveals.

function useStreamText () {
  const [displayedText, setDisplayedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const rafRef = useRef<number | null>(null)
  const indexRef = useRef(0)

  const startStream = useCallback((rawText: string, onDone?: () => void) => {
    // Defensive: the streamer slices this char-by-char, so guarantee a string
    // even if an upstream parser hands us a non-string value.
    const fullText = typeof rawText === 'string' ? rawText : String(rawText ?? '')
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setDisplayedText('')
    setIsStreaming(true)
    indexRef.current = 0

    // Adaptive chars per frame: ~4–5 seconds total regardless of length
    const targetFrames = 1200 // ~4s at 60fps
    const charsPerFrame = Math.max(1, Math.ceil(fullText.length / targetFrames))

    function tick () {
      indexRef.current = Math.min(
        indexRef.current + charsPerFrame,
        fullText.length
      )
      setDisplayedText(fullText.slice(0, indexRef.current))
      if (indexRef.current < fullText.length) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setIsStreaming(false)
        onDone?.()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  return { displayedText, isStreaming, startStream }
}

// ─── Brain Circuit Loader ─────────────────────────────────────────────────────

function BrainCircuitLoader () {
  const loadingTexts = [
    'Analyzing your profile...',
    'Discovering your interests...',
    'Writing your summary...',
    'Polishing the details...',
    'Almost there...'
  ]
  const [textIndex, setTextIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex(prev => (prev + 1) % loadingTexts.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className='bcl-loading-container'>
      <div className='bcl-orb-wrapper'>
        <div className='bcl-orb' />
      </div>
      <div className='bcl-loading-text'>{loadingTexts[textIndex]}</div>
    </div>
  )
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton ({
  active,
  onClick,
  // icon,
  label,
  streaming,
  done,
  tabType
}: {
  active: boolean
  onClick: () => void
  // icon: React.ReactNode;
  label: string
  streaming?: boolean
  done?: boolean
  tabType: 'strength' | 'interest'
}) {
  return (
    <button
      className={`sgm-tab ${tabType}-tab${active ? ' active' : ''}${
        streaming ? ' streaming' : ''
      }`}
      onClick={onClick}
    >
      {/* <span className="sgm-tab-icon">{icon}</span> */}
      <span className='sgm-tab-label'>{label}</span>
      {streaming && <span className='sgm-tab-pulse' />}
      {done && !streaming && (
        <span className='sgm-tab-done'>
          <Check size={9} />
        </span>
      )}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SummaryGeneratorModal ({
  isOpen,
  onClose,
  onSummaryGenerated,
  userName,
  profileData,
  hasExistingSummary = false
}: SummaryGeneratorModalProps) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate()
  const resolvedProfile: ProfileData = profileData ?? { name: userName ?? '' }
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [inputValue, setInputValue] = useState('')
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [generatedSummary, setGeneratedSummary] = useState('')
  const [generatedInterest, setGeneratedInterest] = useState('')

  const [phase, setPhase] = useState<'chat' | 'generating' | 'result'>('chat')
  const [activeTab, setActiveTab] = useState<'strength' | 'interest'>(
    'strength'
  )
  const [isCopied, setIsCopied] = useState<'strength' | 'interest' | null>(null)
  const [isEditing, setIsEditing] = useState<'strength' | 'interest' | null>(
    null
  )
  const [hasError, setHasError] = useState(false)
  const [failedAnswers, setFailedAnswers] = useState<Record<
    string,
    string
  > | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const [greetingShown, setGreetingShown] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showEditAnswerConfirm, setShowEditAnswerConfirm] = useState(false)
  const [showDeleteAnswerConfirm, setShowDeleteAnswerConfirm] = useState(false)
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)
  const [pendingGenerateAnswers, setPendingGenerateAnswers] = useState<Record<string, string> | null>(null)
  const [pendingActionQuestionIndex, setPendingActionQuestionIndex] = useState<number | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  // Per-tab streaming
  const strengthStream = useStreamText()
  const interestStream = useStreamText()
  const [strengthDone, setStrengthDone] = useState(false)
  const [interestDone, setInterestDone] = useState(false)

  const {
    data: apiQuestions
  } = useQuery({
    queryKey: ['ai-summary-questions'],
    queryFn: fetchAISummaryQuestions
  })

  const questions: AISummaryQuestion[] = apiQuestions?.data?.questions ?? []
  const systemPrompts: ApiSystemPrompts | undefined =
    apiQuestions?.data?.system_prompts

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const msgIdRef = useRef(0)
  const nextMsgId = () => `msg-${++msgIdRef.current}`
  const sessionActiveRef = useRef(false)
  const firstQuestionAskedRef = useRef(false)

  const TOTAL = questions.length || 10

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      requestAnimationFrame(() => setAnimating(true))
    } else {
      setAnimating(false)
      const t = setTimeout(() => setVisible(false), 280)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const resetState = () => {
    setMessages([])
    setAnswers({})
    setInputValue('')
    setCurrentQuestionIndex(0)
    setGeneratedSummary('')
    setGeneratedInterest('')
    setPhase('chat')
    setActiveTab('strength')
    setIsAiTyping(false)
    setIsGenerating(false)
    setHasError(false)
    setFailedAnswers(null)
    setUsedFallback(false)
    setStrengthDone(false)
    setInterestDone(false)
    setIsEditing(null)
    setGreetingShown(false)
    setEditingMessageId(null)
    setEditingText('')
    setShowGenerateConfirm(false)
    setPendingGenerateAnswers(null)
    msgIdRef.current = 0
    sessionActiveRef.current = false
    firstQuestionAskedRef.current = false
  }

  useEffect(() => {
    if (!isOpen) return

    // If session is already active, resume without resetting
    if (sessionActiveRef.current) return

    resetState()
    sessionActiveRef.current = true

    const t = setTimeout(() => {
      const name = userName || 'there'
      const greeting = `Hi ${name}! ✨ I'm Dan AI, your personal profile summary builder.\n\nI'll ask you ${TOTAL} quick questions to craft your personalised profile summary. Let's get started!`;
      addAiMessage(greeting, () => setGreetingShown(true))
    }, 400)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Ask first question once greeting is shown AND API questions are available
  useEffect(() => {
    if (
      !isOpen ||
      !greetingShown ||
      questions.length === 0 ||
      firstQuestionAskedRef.current
    )
      return
    firstQuestionAskedRef.current = true
    const t = setTimeout(() => askQuestion(0), 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetingShown, questions, isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiTyping])

  useEffect(() => {
    if (!isAiTyping && phase === 'chat')
      setTimeout(() => inputRef.current?.focus(), 100)
  }, [isAiTyping, phase])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [isOpen, onClose])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const addAiMessage = (text: string, onDone?: () => void, type?: 'validation', description?: string) => {
    const id = nextMsgId()
    setIsAiTyping(true)
    setTimeout(() => {
      setIsAiTyping(false)
      setMessages(prev => [...prev, { id, role: 'ai', text, ...(type ? { type } : {}), ...(description ? { description } : {}) }])
      onDone?.()
    }, Math.min(800 + text.length * 8, 2000))
  }

  const questionTransitions = [
    '',
    'Love that! 🙌 Now, ',
    "You're on a roll! ✨ ",
    'That\'s gold — ',
    'Brilliant! Keep it coming — ',
    'This is shaping up beautifully! 🚀 ',
    "You're really standing out! Now, ",
    'Almost there — one more — ',
    'So close! Just, ',
    'Last one — make it count! 🎯 '
  ]

  const askQuestion = (index: number) => {
    if (index >= questions.length) return
    const transition = questionTransitions[index] ?? ''
    const q = questions[index]
    addAiMessage(`${transition}${q.question}`, undefined, undefined, q.description)
  }

  const getValidation = (questionType: string, maxLength: number) => {
    if (questionType === 'interests') {
      return { minLength: 2, errorMessage: "Could you share a little more detail?" }
    }
    if (maxLength <= 400) {
      return { minLength: 2, errorMessage: "Please elaborate a bit more — it helps create a better summary!" }
    }
    return { minLength: 2, errorMessage: "Tell me a bit more — the details will make your summary shine!" }
  }

  const handleSend = async () => {
    // If all questions answered and user previously cancelled, re-show confirm
    if (pendingGenerateAnswers) {
      setShowGenerateConfirm(true)
      return
    }

    const trimmed = inputValue.trim()
    if (!trimmed || isAiTyping || isGenerating) return

    const currentQ = questions[currentQuestionIndex]
    if (currentQ) {
      const maxLen = parseInt(currentQ.max_length, 10) || 300
      const { minLength, errorMessage } = getValidation(currentQ.question_type, maxLen)
      const wordCount = trimmed.split(/\s+/).length
      if (wordCount < minLength) {
        setMessages(prev => [
          ...prev,
          { id: nextMsgId(), role: 'user', text: trimmed, questionIndex: currentQuestionIndex }
        ])
        setInputValue('')
        addAiMessage(errorMessage, undefined, 'validation')
        return
      }
    }

    setMessages(prev => [
      ...prev,
      { id: nextMsgId(), role: 'user', text: trimmed, questionIndex: currentQuestionIndex }
    ])
    setInputValue('')

    const activeQ = questions[currentQuestionIndex]
    if (!activeQ) return
    const newAnswers = { ...answers, [activeQ.id]: trimmed }
    setAnswers(newAnswers)

    const nextIndex = currentQuestionIndex + 1

    if (nextIndex < TOTAL) {
      setCurrentQuestionIndex(nextIndex)
      setTimeout(() => askQuestion(nextIndex), 400)
    } else {
      setCurrentQuestionIndex(nextIndex)
      setTimeout(() => {
        addAiMessage(
          'All set! 🎉 Ready to generate your personalized AI summary?',
          () => {
            setPendingGenerateAnswers(newAnswers)
            setShowGenerateConfirm(true)
          }
        )
      }, 400)
    }
  }

  const runGeneration = async (answersToUse: Record<string, string>) => {
    setIsGenerating(true)
    setIsAiTyping(false)
    setPhase('generating') // ← show brain loader
    setHasError(false)
    setFailedAnswers(null)
    setUsedFallback(false)
    setStrengthDone(false)
    setInterestDone(false)

    try {
      if (!systemPrompts)
        throw new Error('AI prompts not loaded yet — please try again.')
      const {
        strength,
        interest,
        usedFallback: fellback
      } = await generate(
        resolvedProfile,
        questions,
        answersToUse,
        systemPrompts
      )

      setIsGenerating(false)
      setUsedFallback(fellback)
      setGeneratedSummary(strength)
      setGeneratedInterest(interest)

      // Switch to result phase — tabs render immediately
      setPhase('result')
      setActiveTab('strength')

      // Begin streaming both summaries simultaneously
      setTimeout(() => {
        strengthStream.startStream(strength, () => setStrengthDone(true))
        interestStream.startStream(interest, () => setInterestDone(true))
      }, 350)
    } catch (err) {
      console.error('[AI] All providers failed:', err)
      setIsGenerating(false)
      setPhase('chat') // ← fall back to chat to show error
      setHasError(true)
      setFailedAnswers(answersToUse)
      setMessages(prev => [
        ...prev,
        {
          id: nextMsgId(),
          role: 'ai',
          text: 'Something went wrong while generating your profile. Hit Retry to try again.'
        }
      ])
    }
  }

  const handleRetry = () => {
    if (failedAnswers) runGeneration(failedAnswers)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleUse = async () => {
    // Auth gate (defense in depth): the save below calls the addAISummary
    // strict Server Action (add-summary).
    let authed = false
    ensureAuthed('generate your AI summary', () => {
      authed = true
    })
    if (!authed) return

    const qa_json = questions.map(q => ({
      question: q.question,
      answer: answers[q.id] ?? ''
    }))
    const ai_modal = usedFallback
      ? AI_CONFIG.fallback ?? AI_CONFIG.primary
      : AI_CONFIG.primary

    console.log('Generated Strength:', generatedSummary)
    console.log('Generated Interest:', generatedInterest)
    console.log('qa_json:', qa_json)

    try {
      await addAISummary({
        qa_json,
        strengths_summary: generatedSummary,
        interests_summary: generatedInterest,
        ai_modal
      })
      // toast.success("Profile summary saved successfully!");
    } catch (err) {
      if (isUnauthenticatedError(err)) openGate('generate your AI summary')
      console.error('[addAISummary] Failed to save summary:', err)
    }

    onSummaryGenerated({
      strength: generatedSummary,
      interest: generatedInterest
    })
    resetState()
    onClose()
  }

  const handleClose = () => {
    if (phase === 'result' || phase === 'generating') {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const handleCopy = (type: 'strength' | 'interest') => {
    navigator.clipboard.writeText(
      type === 'strength' ? generatedSummary : generatedInterest
    )
    setIsCopied(type)
    setTimeout(() => setIsCopied(null), 2000)
  }

  const handleRestart = () => {
    resetState()
    sessionActiveRef.current = true
    addAiMessage(
      `Let's try again! I'll ask you the same ${TOTAL} questions — take your time with each answer.`,
      () => setGreetingShown(true)
    )
  }

  // ─── Edit / Delete Answer Handlers ────────────────────────────────────────

  const handleAnswerEditRequest = (qIndex: number) => {
    setPendingActionQuestionIndex(qIndex)
    setShowEditAnswerConfirm(true)
  }

  const handleAnswerDeleteRequest = (qIndex: number) => {
    setPendingActionQuestionIndex(qIndex)
    setShowDeleteAnswerConfirm(true)
  }

  const rollbackToQuestion = (qIndex: number, prefillAnswer?: string) => {
    // Find the first user message for this question index
    const targetMsgIdx = messages.findIndex(
      m => m.role === 'user' && m.questionIndex === qIndex
    )
    if (targetMsgIdx === -1) return

    // Also remove the AI question message right before the user answer
    // Walk backwards from targetMsgIdx to find the preceding AI question message
    let sliceFrom = targetMsgIdx
    for (let i = targetMsgIdx - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'ai' && m.type !== 'validation') {
        sliceFrom = i
        break
      }
    }

    // Keep messages up to (but not including) the AI question for this index
    const keptMessages = messages.slice(0, sliceFrom)
    setMessages(keptMessages)

    // Remove answers from this question onward
    const newAnswers = { ...answers }
    for (let i = qIndex; i < questions.length; i++) {
      delete newAnswers[questions[i].id]
    }
    setAnswers(newAnswers)

    // Reset to this question
    setCurrentQuestionIndex(qIndex)
    setInputValue(prefillAnswer ?? '')

    // Re-ask the question after a brief delay
    setTimeout(() => askQuestion(qIndex), 300)
  }

  const confirmEditAnswer = () => {
    if (pendingActionQuestionIndex === null) return
    const qIndex = pendingActionQuestionIndex
    const q = questions[qIndex]
    const previousAnswer = q ? answers[q.id] ?? '' : ''
    // Find the user message for this question
    const targetMsg = messages.find(
      m => m.role === 'user' && m.questionIndex === qIndex
    )
    setShowEditAnswerConfirm(false)
    setPendingActionQuestionIndex(null)
    if (targetMsg) {
      setEditingMessageId(targetMsg.id)
      setEditingText(previousAnswer)
    }
  }

  const saveInlineEdit = () => {
    if (!editingMessageId) return
    const trimmed = editingText.trim()
    if (!trimmed) return

    // Find the message being edited
    const msg = messages.find(m => m.id === editingMessageId)
    if (!msg || msg.questionIndex === undefined) return

    const q = questions[msg.questionIndex]
    if (!q) return

    // Validate word count
    const maxLen = parseInt(q.max_length, 10) || 300
    const { minLength } = getValidation(q.question_type, maxLen)
    const wordCount = trimmed.split(/\s+/).length
    if (wordCount < minLength) return

    // Update the message text in place
    setMessages(prev =>
      prev.map(m => m.id === editingMessageId ? { ...m, text: trimmed } : m)
    )

    // Update the answer
    setAnswers(prev => ({ ...prev, [q.id]: trimmed }))

    // Clear editing state
    setEditingMessageId(null)
    setEditingText('')
  }

  const cancelInlineEdit = () => {
    setEditingMessageId(null)
    setEditingText('')
  }

  const confirmDeleteAnswer = () => {
    if (pendingActionQuestionIndex === null) return
    const qIndex = pendingActionQuestionIndex
    setShowDeleteAnswerConfirm(false)
    setPendingActionQuestionIndex(null)
    rollbackToQuestion(qIndex)
  }

  // ─── Derived display values ────────────────────────────────────────────────
  // While streaming: show the streamed slice.
  // After done: show the editable stored value.

  const strengthDisplayValue = strengthDone
    ? generatedSummary
    : strengthStream.displayedText
  const interestDisplayValue = interestDone
    ? generatedInterest
    : interestStream.displayedText

  const progress = Math.min((currentQuestionIndex / TOTAL) * 100, 100)
  const allDone = strengthDone && interestDone

  if (!mounted || !visible) return null

  return createPortal(
    <>
      {/* Styles moved to ai_summary.module.css */}


      <div
        className={`sgm-overlay${!animating ? ' closing' : ''}`}
        onClick={handleClose}
      >
        <div
          className={`sgm-modal${!animating ? ' closing' : ''}${isLight ? ' light' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className='sgm-header'>
            <div className='sgm-header-top'>
              <div className='sgm-header-identity'>
                <div>
                  <div className='sgm-title'>Profile Summary Builder</div>
                  <div className='sgm-subtitle'>Powered by Dan AI</div>
                </div>
              </div>
              <button className='sgm-close-btn' onClick={handleClose}>
                <X size={14} />
              </button>
            </div>
            <div className='sgm-progress-wrap'>
              <div className='sgm-progress-bar'>
                <div
                  className='sgm-progress-fill'
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className='sgm-progress-label'>
                {phase === 'result'
                  ? 'Complete ✓'
                  : phase === 'generating'
                  ? 'Generating…'
                  : <span style={{ color: '#1c98f7', fontWeight: 600 }}>({Math.min(currentQuestionIndex + 1, TOTAL)} / {TOTAL})</span>}
              </span>
            </div>
          </div>

          {/* ── Messages (hidden once result phase begins) ── */}
          {phase === 'chat' && (
            <div className='sgm-messages full'>
              {messages.map(msg => (
                <div key={msg.id} className={`sgm-msg ${msg.role}`}>
                  {msg.role === 'ai' && (
                    <div className='sgm-msg-avatar'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width={100}
                        height={100}
                        viewBox='0 0 100 100'
                        fill='none'
                      >
                        <circle
                          cx={50}
                          cy={50}
                          r={50}
                          fill='url(#paint0_linear_3499_465)'
                        />
                        <path
                          d='M48.0128 36.8143L50.8352 43.7693C52.0151 46.678 54.322 48.9849 57.2307 50.1648L64.1857 52.9872C65.4715 53.5096 65.4715 55.3304 64.1857 55.8518L57.2307 58.6742C54.322 59.8541 52.0151 62.161 50.8352 65.0696L48.0128 72.0247C47.4904 73.3105 45.6696 73.3105 45.1482 72.0247L42.3258 65.0696C41.1459 62.161 38.839 59.8541 35.9304 58.6742L28.9753 55.8518C27.6895 55.3294 27.6895 53.5086 28.9753 52.9872L35.9304 50.1648C38.839 48.9849 41.1459 46.678 42.3258 43.7693L45.1482 36.8143C45.6696 35.5285 47.4904 35.5285 48.0128 36.8143ZM65.1461 28.647L65.9713 31.0264C66.622 32.9031 68.0969 34.378 69.9736 35.0287L72.353 35.8539C73.2311 36.1587 73.2311 37.4003 72.353 37.7051L69.9736 38.5303C68.0969 39.181 66.622 40.6559 65.9713 42.5326L65.1461 44.912C64.8413 45.7901 63.5997 45.7901 63.2949 44.912L62.4697 42.5326C61.819 40.6559 60.3441 39.181 58.4674 38.5303L56.088 37.7051C55.2099 37.4003 55.2099 36.1587 56.088 35.8539L58.4674 35.0287C60.3441 34.378 61.819 32.9031 62.4697 31.0264L63.2949 28.647C63.5987 27.7689 64.8413 27.7689 65.1461 28.647Z'
                          fill='white'
                        />
                        <defs>
                          <linearGradient
                            id='paint0_linear_3499_465'
                            x1={21}
                            y1={35}
                            x2='81.5'
                            y2='66.5'
                            gradientUnits='userSpaceOnUse'
                          >
                            <stop stopColor='#356FEE' />
                            <stop offset={1} stopColor='#1C98F7' />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  )}
                  <div className='sgm-msg-content'>
                    {/* Inline edit mode for user messages */}
                    {msg.role === 'user' && editingMessageId === msg.id ? (
                      <div className='sgm-inline-edit-wrap'>
                        <textarea
                          className='sgm-inline-edit-textarea'
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              saveInlineEdit()
                            }
                            if (e.key === 'Escape') cancelInlineEdit()
                          }}
                          rows={2}
                          autoFocus
                        />
                        <div className='sgm-inline-edit-actions'>
                          <button className='sgm-inline-edit-save' onClick={saveInlineEdit}>
                            <Check size={12} />
                            Save
                          </button>
                          <button className='sgm-inline-edit-cancel' onClick={cancelInlineEdit}>
                            <X size={12} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`sgm-msg-bubble${msg.type === 'validation' ? ' sgm-msg-validation' : ''}`}>
                          {msg.text}
                          {msg.description && msg.role === 'ai' && !msg.type && (
                            <>
                              <div className='sgm-msg-divider' />
                              <div className='sgm-msg-description' style={{ whiteSpace: 'pre-line' }}>
                                {msg.description.replace(/\\n/g, '\n').split('\n').map((line: string, i: number) => {
                                  const trimmed = line.replace(/^•\s*/, '').trim()
                                  if (!trimmed) return null
                                  const isBullet = line.trim().startsWith('•')
                                  return isBullet
                                    ? <div key={i} style={{ display: 'flex', gap: '6px', marginTop: '2px' }}><span>•</span><span>{trimmed}</span></div>
                                    : <div key={i}>{trimmed}</div>
                                })}
                              </div>
                            </>
                          )}
                        </div>
                        {/* Edit / Delete actions on user answer messages */}
                        {msg.role === 'user' && msg.questionIndex !== undefined && !isAiTyping && !isGenerating && !editingMessageId && (
                          <div className='sgm-answer-actions'>
                            <button
                              className='sgm-answer-action-btn sgm-answer-edit-btn'
                              title='Edit answer'
                              onClick={() => handleAnswerEditRequest(msg.questionIndex!)}
                            >
                              <PenLine size={12} />
                            </button>
                            <button
                              className='sgm-answer-action-btn sgm-answer-delete-btn'
                              title='Delete answer'
                              onClick={() => handleAnswerDeleteRequest(msg.questionIndex!)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className='sgm-typing'>
                  <div className='sgm-msg-avatar'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width={100}
                      height={100}
                      viewBox='0 0 100 100'
                      fill='none'
                    >
                      <circle
                        cx={50}
                        cy={50}
                        r={50}
                        fill='url(#paint0_linear_3499_465)'
                      />
                      <path
                        d='M48.0128 36.8143L50.8352 43.7693C52.0151 46.678 54.322 48.9849 57.2307 50.1648L64.1857 52.9872C65.4715 53.5096 65.4715 55.3304 64.1857 55.8518L57.2307 58.6742C54.322 59.8541 52.0151 62.161 50.8352 65.0696L48.0128 72.0247C47.4904 73.3105 45.6696 73.3105 45.1482 72.0247L42.3258 65.0696C41.1459 62.161 38.839 59.8541 35.9304 58.6742L28.9753 55.8518C27.6895 55.3294 27.6895 53.5086 28.9753 52.9872L35.9304 50.1648C38.839 48.9849 41.1459 46.678 42.3258 43.7693L45.1482 36.8143C45.6696 35.5285 47.4904 35.5285 48.0128 36.8143ZM65.1461 28.647L65.9713 31.0264C66.622 32.9031 68.0969 34.378 69.9736 35.0287L72.353 35.8539C73.2311 36.1587 73.2311 37.4003 72.353 37.7051L69.9736 38.5303C68.0969 39.181 66.622 40.6559 65.9713 42.5326L65.1461 44.912C64.8413 45.7901 63.5997 45.7901 63.2949 44.912L62.4697 42.5326C61.819 40.6559 60.3441 39.181 58.4674 38.5303L56.088 37.7051C55.2099 37.4003 55.2099 36.1587 56.088 35.8539L58.4674 35.0287C60.3441 34.378 61.819 32.9031 62.4697 31.0264L63.2949 28.647C63.5987 27.7689 64.8413 27.7689 65.1461 28.647Z'
                        fill='white'
                      />
                      <defs>
                        <linearGradient
                          id='paint0_linear_3499_465'
                          x1={21}
                          y1={35}
                          x2='81.5'
                          y2='66.5'
                          gradientUnits='userSpaceOnUse'
                        >
                          <stop stopColor='#356FEE' />
                          <stop offset={1} stopColor='#1C98F7' />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className='sgm-typing-bubble'>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ── Brain Circuit Loader (generating phase) ── */}
          {phase === 'generating' && <BrainCircuitLoader />}

          {/* ── Fallback badge ── */}
          {/* {phase === 'result' && usedFallback && (
            <div className='sgm-fallback-badge'>
              <div className='sgm-fallback-dot' />
              Generated via backup AI ({AI_CONFIG.primary} unavailable)
            </div>
          )} */}

          {/* ══════════════════════════════════════════
               RESULT PHASE — Tabs + Streaming Content
              ══════════════════════════════════════════ */}
          {phase === 'result' && (
            <>
              {/* Tab bar */}
              <div className='sgm-tabs-wrapper'>
                <div className='sgm-tabs-bar'>
                  <TabButton
                    tabType='strength'
                    active={activeTab === 'strength'}
                    onClick={() => setActiveTab('strength')}
                    // icon={<Zap size={12} />}
                    label='Strength'
                    streaming={strengthStream.isStreaming}
                    done={strengthDone}
                  />
                  <TabButton
                    tabType='interest'
                    active={activeTab === 'interest'}
                    onClick={() => setActiveTab('interest')}
                    // icon={<Heart size={12} />}
                    label='Interest'
                    streaming={interestStream.isStreaming}
                    done={interestDone}
                  />
                </div>
              </div>

              {/* Tab content */}
              <div className='sgm-result-panel'>
                {/* ── Strength tab ── */}
                {activeTab === 'strength' && (
                  <div className='sgm-result-card'>
                    <div className='sgm-result-header'>
                      <div className='sgm-result-label-group'>
                        <div className='sgm-result-icon'>
                          <Zap size={13} />
                        </div>
                        <span className='sgm-result-title'>
                          Professional Strength
                        </span>
                      </div>
                      <div className='sgm-result-meta'>
                        {strengthStream.isStreaming && (
                          <span className='sgm-streaming-badge'>
                            <span
                              className='sgm-tab-pulse'
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                display: 'inline-block',
                                background: '#3b82f6',
                                flexShrink: 0,
                                animation:
                                  'sgm-tab-pulse 0.85s ease-in-out infinite'
                              }}
                            />
                            Writing…
                          </span>
                        )}
                        {strengthDone && (
                          <span className='sgm-result-word-count'>
                            {
                              generatedSummary.split(/\s+/).filter(Boolean)
                                .length
                            }{' '}
                            words
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Streaming view */}
                    {strengthStream.isStreaming && (
                      <div className='sgm-stream-text'>
                        <div className='sgm-md-content'>
                          {renderMarkdown(strengthStream.displayedText)}
                        </div>
                        <span className='sgm-stream-cursor' />
                      </div>
                    )}

                    {/* Read-only view (after done, not editing) */}
                    {!strengthStream.isStreaming &&
                      strengthDone &&
                      isEditing !== 'strength' && (
                        <div className='sgm-md-content'>
                          {renderMarkdown(generatedSummary)}
                        </div>
                      )}

                    {/* Editable view (editing mode) */}
                    {!strengthStream.isStreaming &&
                      strengthDone &&
                      isEditing === 'strength' && (
                        <textarea
                          className='sgm-result-textarea editing'
                          value={generatedSummary}
                          onChange={e => setGeneratedSummary(e.target.value)}
                          rows={8}
                        />
                      )}

                    {/* Not started yet (edge case) */}
                    {!strengthStream.isStreaming && !strengthDone && (
                      <div className='sgm-waiting-state'>
                        <TypingDots />
                        <span>Preparing…</span>
                      </div>
                    )}

                    <div className='sgm-result-card-footer'>
                      <button
                        className={`sgm-btn-edit${
                          isEditing === 'strength' ? ' active' : ''
                        }`}
                        disabled={!strengthDone}
                        onClick={() =>
                          setIsEditing(
                            isEditing === 'strength' ? null : 'strength'
                          )
                        }
                      >
                        {isEditing === 'strength' ? (
                          <>
                            <Save size={11} />
                            Save
                          </>
                        ) : (
                          <>
                            <Pencil size={11} />
                            Edit
                          </>
                        )}
                      </button>
                      {/* <button
                        className="sgm-btn-copy"
                        disabled={!strengthDone}
                        onClick={() => handleCopy("strength")}
                      >
                        {isCopied === "strength" ? (
                          <>
                            <Check size={11} />
                            Copied!
                          </>
                        ) : (
                          "Copy"
                        )}
                      </button> */}
                    </div>
                  </div>
                )}

                {/* ── Interest tab ── */}
                {activeTab === 'interest' && (
                  <div className='sgm-result-card interest'>
                    <div className='sgm-result-header'>
                      <div className='sgm-result-label-group'>
                        <div className='sgm-result-icon'>
                          <Heart size={13} />
                        </div>
                        <span className='sgm-result-title'>
                          Interests &amp; Passions
                        </span>
                      </div>
                      <div className='sgm-result-meta'>
                        {interestStream.isStreaming && (
                          <span className='sgm-streaming-badge'>
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                display: 'inline-block',
                                background: '#8b5cf6',
                                flexShrink: 0,
                                animation:
                                  'sgm-tab-pulse 0.85s ease-in-out infinite'
                              }}
                            />
                            Writing…
                          </span>
                        )}
                        {interestDone && (
                          <span className='sgm-result-word-count'>
                            {
                              generatedInterest.split(/\s+/).filter(Boolean)
                                .length
                            }{' '}
                            words
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Streaming */}
                    {interestStream.isStreaming && (
                      <div className='sgm-stream-text'>
                        <div className='sgm-md-content'>
                          {renderMarkdown(interestStream.displayedText)}
                        </div>
                        <span className='sgm-stream-cursor' />
                      </div>
                    )}

                    {/* Read-only view (after done, not editing) */}
                    {!interestStream.isStreaming &&
                      interestDone &&
                      isEditing !== 'interest' && (
                        <div className='sgm-md-content'>
                          {renderMarkdown(generatedInterest)}
                        </div>
                      )}

                    {/* Editable view (editing mode) */}
                    {!interestStream.isStreaming &&
                      interestDone &&
                      isEditing === 'interest' && (
                        <textarea
                          className='sgm-result-textarea editing'
                          value={generatedInterest}
                          onChange={e => setGeneratedInterest(e.target.value)}
                          rows={8}
                        />
                      )}

                    {/* Waiting (stream not yet started) */}
                    {!interestStream.isStreaming && !interestDone && (
                      <div className='sgm-waiting-state'>
                        <TypingDots />
                        <span>Starting…</span>
                      </div>
                    )}

                    <div className='sgm-result-card-footer'>
                      <button
                        className={`sgm-btn-edit${
                          isEditing === 'interest' ? ' active' : ''
                        }`}
                        disabled={!interestDone}
                        onClick={() =>
                          setIsEditing(
                            isEditing === 'interest' ? null : 'interest'
                          )
                        }
                      >
                        {isEditing === 'interest' ? (
                          <>
                            <Save size={11} />
                            Save
                          </>
                        ) : (
                          <>
                            <Pencil size={11} />
                            Edit
                          </>
                        )}
                      </button>
                      {/* <button
                        className="sgm-btn-copy"
                        disabled={!interestDone}
                        onClick={() => handleCopy("interest")}
                      >
                        {isCopied === "interest" ? (
                          <>
                            <Check size={11} />
                            Copied!
                          </>
                        ) : (
                          "Copy"
                        )}
                      </button> */}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className='sgm-result-footer'>
                <button
                  className='sgm-btn-use'
                  onClick={handleUse}
                  disabled={!allDone}
                >
                  <Check size={13} />
                  {allDone ? 'Use Strength & Interest' : 'Generating…'}
                </button>
                <button className='sgm-btn-restart' onClick={() => setShowRegenerateConfirm(true)}>
                  <RotateCw size={12} />
                  Regenerate
                </button>
              </div>
            </>
          )}

          {/* ── Error + Retry ── */}
          {phase === 'chat' && hasError && (
            <div className='sgm-error-area'>
              <div className='sgm-error-banner'>
                <div className='sgm-error-dot' />
                AI generation failed. Your answers are saved — no need to start
                over.
              </div>
              <button className='sgm-btn-retry' onClick={handleRetry}>
                <RotateCcw size={14} />
                Retry Generation
              </button>
            </div>
          )}

          {/* ── Chat input ── */}
          {phase === 'chat' && !hasError && (
            <div className='sgm-input-area'>
              {/* {currentQuestionIndex < TOTAL && !isAiTyping && (
                <div className="sgm-input-hint">
                  <ChevronRight size={10} />
                  {questions[currentQuestionIndex]?.placeholder}
                </div>
              )} */}
              <div className='sgm-input-row'>
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  className='sgm-input'
                  value={inputValue}
                  onChange={e => {
                    const maxLen = parseInt(questions[currentQuestionIndex]?.max_length, 10) || 300
                    const val = e.target.value.length > maxLen ? e.target.value.slice(0, maxLen) : e.target.value
                    setInputValue(val)
                    const el = e.target
                    el.style.height = 'auto'
                    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20
                    const maxHeight = lineHeight * 2
                    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
                    el.style.overflowY =
                      el.scrollHeight > maxHeight ? 'auto' : 'hidden'
                  }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={(() => {
                    if (isAiTyping || isGenerating) return 'AI is thinking...'
                    if (pendingGenerateAnswers) return 'Click send to generate summary...'
                    const raw = questions[currentQuestionIndex]?.placeholder || 'Type your answer...'
                    return raw.length > 50 ? raw.slice(0, 50) + '…' : raw
                  })()}
                  disabled={isAiTyping || isGenerating || !!pendingGenerateAnswers}
                />
              </div>
              <button
                className='sgm-send-btn'
                onClick={handleSend}
                disabled={(!inputValue.trim() && !pendingGenerateAnswers) || isAiTyping || isGenerating}
              >
                <SendHorizontal size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={() => {
          setShowCloseConfirm(false)
          resetState()
          onClose()
        }}
        title='Profile Summary Not Saved'
        message={`Your profile summary hasn't been saved to your profile. Close anyway?`}
        confirmText='Discard'
        cancelText='Close'
      />
      <ConfirmModal
        isOpen={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={() => {
          setShowRegenerateConfirm(false)
          handleRestart()
        }}
        title='Regenerate Profile Summary with Dan AI?'
        message={`This will restart all ${TOTAL} questions. Continue?`}
        confirmText='Continue'
        cancelText='Cancel'
      />
      <ConfirmModal
        isOpen={showEditAnswerConfirm}
        onClose={() => {
          setShowEditAnswerConfirm(false)
          setPendingActionQuestionIndex(null)
        }}
        onConfirm={confirmEditAnswer}
        title='Edit Answer?'
        message={
          pendingActionQuestionIndex !== null
            ? `Edit your answer for question ${pendingActionQuestionIndex + 1}?`
            : ''
        }
        confirmText='Edit'
        cancelText='Cancel'
      />
      <ConfirmModal
        isOpen={showDeleteAnswerConfirm}
        onClose={() => {
          setShowDeleteAnswerConfirm(false)
          setPendingActionQuestionIndex(null)
        }}
        onConfirm={confirmDeleteAnswer}
        title='Delete Answer?'
        message={
          pendingActionQuestionIndex !== null
            ? `This will delete your answer for question ${pendingActionQuestionIndex + 1} and all answers after it. You'll restart from that question.`
            : ''
        }
        confirmText='Delete'
        cancelText='Cancel'
      />
      <ConfirmModal
        isOpen={showGenerateConfirm}
        onClose={() => {
          setShowGenerateConfirm(false)
        }}
        onConfirm={() => {
          setShowGenerateConfirm(false)
          if (pendingGenerateAnswers) {
            addAiMessage(
              '🚀 Analyzing your responses and crafting your personalized profile summary...',
              () => runGeneration(pendingGenerateAnswers)
            )
            setPendingGenerateAnswers(null)
          }
        }}
        title='Generate Profile Summary with Dan AI?'
        message='Dan AI will analyse your answers and craft your personalised profile summary. Would you like to proceed?'
        confirmText='Generate'
        cancelText='Cancel'
      />
      {authGateModal}
    </>,
    document.body
  )
}