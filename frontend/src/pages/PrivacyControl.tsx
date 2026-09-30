import { useEffect, useState } from 'react'
import { Check, KeyRound, LockKeyhole, MessageSquareText, Pause, Play, ShieldCheck, Trash2 } from 'lucide-react'
import { clearAgentHistory, getPrivacyStatus, setAIContextEnabled } from '../api/client'
import type { PrivacyStatus } from '../types'
import ConsentVault from './ConsentVault'
import { Link } from 'react-router-dom'

export default function PrivacyControl() {
  const [status, setStatus] = useState<PrivacyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cleared, setCleared] = useState(false)

  const refresh = async () => {
    try { setStatus(await getPrivacyStatus()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load privacy status.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  const toggleAI = async () => {
    if (!status) return
    setSaving(true)
    setError('')
    try {
      const updated = await setAIContextEnabled(!status.ai_context_enabled)
      setStatus({ ...status, ai_context_enabled: updated.ai_context_enabled })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update AI access.') }
    finally { setSaving(false) }
  }

  const clearChat = async () => {
    setSaving(true)
    setError('')
    try {
      await clearAgentHistory()
      setStatus(current => current ? { ...current, stored_chat_messages: 0 } : current)
      setCleared(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not clear chat history.') }
    finally { setSaving(false) }
  }

  const ready = status?.provider === 'gemini' && status.gemini_key_configured

  return (
    <div className="workspace-page privacy-page">
      <header className="workspace-heading"><div><p className="workspace-eyebrow">YOUR DATA · YOUR RULES</p><h1 className="workspace-title">Privacy & <em>control.</em></h1><p className="workspace-subtitle">Choose what the twin can use and what Gemini receives.</p></div><ShieldCheck size={25} /></header>
      {error && <div className="workspace-error" role="alert">{error}</div>}

      <section className="privacy-status-grid">
        <article className="privacy-status"><span className={`status-mark${ready ? ' ready' : ''}`}><KeyRound size={17} /></span><div><small>AI provider</small><strong>{loading ? 'Checking…' : ready ? `Gemini · ${status?.model}` : 'Not connected'}</strong><p>{ready ? 'API key detected on the backend.' : 'AI features need a backend Gemini key.'}</p></div></article>
        <article className="privacy-status"><span className="status-mark"><LockKeyhole size={17} /></span><div><small>Persistent memory</small><strong>{status?.memory_items ?? '—'} items</strong><p>Stored in this workspace on this device.</p></div></article>
        <article className="privacy-status"><span className="status-mark"><MessageSquareText size={17} /></span><div><small>Agent history</small><strong>{status?.stored_chat_messages ?? '—'} messages</strong><p>{status?.stored_chat_messages ? 'Saved locally until you clear it.' : 'No saved chat messages.'}</p></div></article>
      </section>

      {!ready && <section className="gemini-setup"><p className="workspace-eyebrow">CONNECT GEMINI</p><h2>Keep the key on the backend.</h2><p>Add these settings to <code>HumanTwin/.env</code>, then restart the backend. Never paste the key into the browser or chat.</p><pre>LLM_PROVIDER=gemini{'\n'}GEMINI_API_KEY=your_rotated_key{'\n'}GEMINI_MODEL=gemini-3.8-flash</pre></section>}

      <section className="privacy-controls">
        <div><p className="workspace-eyebrow">PERSONALIZATION</p><h2>AI context access</h2><p>When enabled, Twin Agent Chat can use enabled Memory Bank entries and current open tasks. Gemini receives those details with each message.</p></div>
        <button className={`privacy-toggle${status?.ai_context_enabled ? ' enabled' : ''}`} role="switch" aria-checked={status?.ai_context_enabled ?? false} onClick={toggleAI} disabled={!status || saving}>
          {status?.ai_context_enabled ? <><Pause size={14} /> Pause context</> : <><Play size={14} /> Allow context</>}
        </button>
      </section>
      <p className="privacy-memory-link"><Link to="/twin">Manage which individual memories Gemini can use <span>→</span></Link></p>

      <section className="privacy-controls chat-retention">
        <div><p className="workspace-eyebrow">CONVERSATION STORAGE</p><h2>Chat history</h2><p>Chat is stored locally to preserve context between visits. Clearing it permanently removes the saved transcript.</p>{cleared && <small className="privacy-confirm"><Check size={13} /> Chat history cleared</small>}</div>
        <button className="quiet-action" onClick={clearChat} disabled={saving || !status?.stored_chat_messages}><Trash2 size={14} /> Clear history</button>
      </section>

      <div className="privacy-consent"><ConsentVault /></div>
    </div>
  )
}
