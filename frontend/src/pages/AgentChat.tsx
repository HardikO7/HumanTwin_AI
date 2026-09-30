import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, Bot, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react'
import {
  clearAgentHistory,
  getAgentHistory,
  getPrivacyStatus,
  sendAgentMessage,
} from '../api/client'
import type { AgentMessage, PrivacyStatus } from '../types'

export default function AgentChat() {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [status, setStatus] = useState<PrivacyStatus | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const ready = status?.provider === 'gemini' && status.gemini_key_configured && status.ai_context_enabled

  const refresh = async () => {
    try {
      const [history, privacy] = await Promise.all([getAgentHistory(), getPrivacyStatus()])
      setMessages(history)
      setStatus(privacy)
      setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load the agent.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const message = text.trim()
    if (!message || sending) return
    setText('')
    setSending(true)
    setError('')
    try {
      const result = await sendAgentMessage(message)
      await refresh()
      setMessages(current => current.length ? current : [
        { id: `local-user-${Date.now()}`, role: 'user', content: message, created_at: new Date().toISOString() },
        { id: `local-assistant-${Date.now()}`, role: 'assistant', content: result.reply, created_at: new Date().toISOString() },
      ])
    } catch (reason) {
      setText(message)
      setError(reason instanceof Error ? reason.message : 'The twin could not answer.')
    } finally { setSending(false) }
  }

  const clear = async () => {
    try {
      await clearAgentHistory()
      setMessages([])
      const latest = await getPrivacyStatus()
      setStatus(latest)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not clear the conversation.') }
  }

  return (
    <div className="workspace-page agent-page">
      <header className="workspace-heading">
        <div><p className="workspace-eyebrow">GEMINI · PRIVATE TO THIS WORKSPACE</p><h1 className="workspace-title">Talk it <em>through.</em></h1><p className="workspace-subtitle">Your twin uses enabled memories and open tasks to give personal, grounded advice.</p></div>
        {messages.length > 0 && <button className="quiet-action" onClick={clear}><Trash2 size={14} /> Clear chat</button>}
      </header>

      <section className="agent-console" aria-label="Twin agent conversation">
        <div className="agent-console-head"><span className="agent-avatar"><Bot size={18} /></span><div><strong>Riya’s Twin</strong><small>{ready ? `Connected · ${status?.model}` : 'Not connected'}</small></div><MessageCircle size={16} /></div>
        <div className="agent-messages" aria-live="polite">
          {loading ? <p className="agent-empty">Opening your conversation…</p> : messages.length === 0 ? <div className="agent-welcome"><span className="agent-welcome-icon"><MessageCircle size={20} /></span><h2>What’s on your mind?</h2><p>Ask about a decision, your workload, or a pattern your twin has noticed.</p><div className="agent-prompts"><button onClick={() => setText('What should I focus on first today?')}>What should I focus on first?</button><button onClick={() => setText('What study patterns have you noticed about me?')}>What patterns have you noticed?</button></div></div> : messages.map(message => <article className={`agent-message ${message.role}`} key={message.id}><span className="agent-message-role">{message.role === 'user' ? 'YOU' : 'RIYA’S TWIN'}</span><p>{message.content}</p></article>)}
          {sending && <div className="agent-message assistant"><span className="agent-message-role">RIYA’S TWIN</span><p><Loader2 size={15} className="animate-spin" /> Thinking through your context…</p></div>}
          {error && <p className="workspace-error" role="alert">{error}</p>}
          <div ref={endRef} />
        </div>
        <form className="agent-composer" onSubmit={submit}>
          <textarea value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} disabled={!ready || sending} placeholder={ready ? 'Ask your twin something…' : 'Connect Gemini to start a conversation'} rows={2} />
          <button type="submit" className="agent-send" disabled={!ready || sending || !text.trim()} aria-label="Send message">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
        </form>
        <p className="agent-data-note"><ArrowDown size={12} /> Only enabled memory and open task details are included. Chats are stored locally and can be cleared.</p>
      </section>
      {!ready && <aside className="agent-setup"><strong>Gemini is not connected yet.</strong><span>Set <code>LLM_PROVIDER=gemini</code> and a valid key in the backend `.env`, then restart the backend. Key status is shown without exposing the key.</span></aside>}
    </div>
  )
}
