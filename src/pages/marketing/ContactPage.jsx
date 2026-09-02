import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Section } from '../../components/marketing/Section'
import PageMasthead from '../../components/marketing/PageMasthead'
import MarketingButton from '../../components/marketing/MarketingButton'
import AuthField from '../../components/marketing/AuthField'
import ClosingCta from '../../components/marketing/ClosingCta'
import { COMPLIANCE } from '../../lib/brand'
import { loadSupabase } from '../../lib/supabase'

const EMPTY = { name: '', email: '', message: '' }

export default function ContactPage() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [failure, setFailure] = useState('')

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!values.name.trim()) next.name = 'Tell the desk who is writing.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      next.email = 'That address will not reach you.'
    if (!values.message.trim()) next.message = 'Say what the message is about.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (status === 'sending') return
    if (!validate()) {
      // The message sits beside its field; focus goes there too, so a reader
      // who pressed Send at the foot of the form is taken to what stopped it.
      const form = event.currentTarget
      requestAnimationFrame(() => form.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    setStatus('sending')
    setFailure('')
    const supabase = await loadSupabase()
    const { error } = await supabase.from('contact_messages').insert({
      name: values.name.trim(),
      email: values.email.trim(),
      message: values.message.trim(),
    })
    if (error) {
      setStatus('idle')
      setFailure('The message did not send. Try again in a moment.')
      return
    }
    setValues(EMPTY)
    setStatus('sent')
  }

  return (
    <>
      <PageMasthead
        eyebrow="Contact"
        title="Reach the desk."
        description="One inbox, read by the person who runs it. No form routing, no queue, no sales follow-up."
      />

      <Section ground="page">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <h2 className="t-h3 text-text">What the desk answers</h2>
            <ul className="mt-5 space-y-3 border-t border-border pt-5">
              {[
                'How a rule is enforced, or why a ticket was refused.',
                'What a figure on the briefing was computed from.',
                'Anything about the software itself.',
              ].map((line) => (
                <li key={line} className="t-body border-b border-border pb-3 text-text-muted">
                  {line}
                </li>
              ))}
            </ul>
            <p className="t-meta mt-6 text-text-faint">{COMPLIANCE.long}</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="panel-static p-6 sm:p-8">
            <div className="space-y-4">
              <AuthField
                label="Name"
                name="name"
                value={values.name}
                onChange={update('name')}
                autoComplete="name"
                error={errors.name}
                required
              />
              <AuthField
                label="Email"
                type="email"
                name="email"
                value={values.email}
                onChange={update('email')}
                autoComplete="email"
                error={errors.email}
                required
              />
              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-1.5 block text-[13px] font-medium text-text"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  value={values.message}
                  onChange={update('message')}
                  aria-invalid={errors.message ? 'true' : undefined}
                  className="field h-auto resize-y py-3"
                  required
                />
                <p className="min-h-4 pt-1 text-xs text-danger" role="alert">
                  {errors.message ?? ''}
                </p>
              </div>
            </div>

            {failure ? (
              <p
                role="alert"
                className="mt-4 rounded-control bg-[color:var(--ds-danger-soft)] px-3 py-2.5 text-sm text-danger"
              >
                {failure}
              </p>
            ) : null}
            {status === 'sent' ? (
              <p
                role="status"
                className="mt-4 rounded-control bg-[color:var(--ds-positive-soft)] px-3 py-2.5 text-sm text-positive"
              >
                Sent. The desk will read it.
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <MarketingButton type="submit" size="lg" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending' : 'Send Message'}
              </MarketingButton>
              <Link
                to="/"
                className="focus-ring rounded-sm text-[13px] text-text-muted transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text"
              >
                Back to Site
              </Link>
            </div>
          </form>
        </div>
      </Section>

      <ClosingCta />
    </>
  )
}
