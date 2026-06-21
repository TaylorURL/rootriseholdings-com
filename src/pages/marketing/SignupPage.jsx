import { useState } from 'react'
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { COMPLIANCE } from '../../lib/brand'
import { cn } from '../../lib/cn'
import AuthShell from '../../components/marketing/AuthShell'
import AuthField from '../../components/marketing/AuthField'
import MarketingButton from '../../components/marketing/MarketingButton'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Validate the signup form. Returns a map of field → error message. */
function validate({ name, email, password, accepted }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Enter your full name.'
  if (!email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Choose a password.'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!accepted) errors.accepted = 'You must acknowledge this before continuing.'
  return errors
}

/** DESIGN-ONLY account-creation page. Wired to the stubbed auth context. */
export default function SignupPage() {
  const { signUp, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    accepted: false,
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/app" replace />

  const update = (field) => (e) => {
    const raw = field === 'accepted' ? e.target.checked : e.target.value
    const next = { ...values, [field]: raw }
    setValues(next)
    if (touched[field]) setErrors(validate(next))
  }

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors(validate(values))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    setTouched({ name: true, email: true, password: true, accepted: true })
    if (Object.keys(nextErrors).length > 0) return

    // TODO(auth): wire real Supabase auth here
    setSubmitting(true)
    setTimeout(() => {
      signUp(values.email, values.name)
      navigate(location.state?.from ?? '/app', { replace: true })
    }, 400)
  }

  const handleOAuth = () => {
    // TODO(auth): wire OAuth provider
  }

  return (
    <AuthShell
      eyebrow="Get Access"
      title="Create your account"
      subtitle="Set up your desk in seconds. You hold the trigger on every signal."
    >
      <OAuthButtons onClick={handleOAuth} disabled={submitting} />

      <Divider />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <AuthField
          label="Full name"
          name="name"
          icon={User}
          placeholder="Jordan Avery"
          autoComplete="name"
          value={values.name}
          onChange={update('name')}
          onBlur={handleBlur('name')}
          error={touched.name ? errors.name : undefined}
          disabled={submitting}
          required
        />

        <AuthField
          label="Email"
          type="email"
          name="email"
          icon={Mail}
          placeholder="you@desk.com"
          autoComplete="email"
          value={values.email}
          onChange={update('email')}
          onBlur={handleBlur('email')}
          error={touched.email ? errors.email : undefined}
          disabled={submitting}
          required
        />

        <AuthField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          icon={Lock}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          onBlur={handleBlur('password')}
          error={touched.password ? errors.password : undefined}
          disabled={submitting}
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-faint transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          }
        />

        <ComplianceCheckbox
          checked={values.accepted}
          onChange={update('accepted')}
          onBlur={handleBlur('accepted')}
          error={touched.accepted ? errors.accepted : undefined}
          disabled={submitting}
        />

        <MarketingButton
          type="submit"
          size="lg"
          disabled={submitting}
          className="mt-1 w-full"
        >
          {submitting ? 'Creating account…' : 'Create account'}
          {!submitting && (
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </MarketingButton>
      </form>

      <p className="mt-7 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-accent-bright transition-colors hover:text-accent"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

/** Required compliance acknowledgement — a real checkbox with inline error. */
function ComplianceCheckbox({ checked, onChange, onBlur, error, disabled }) {
  const hasError = Boolean(error)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex cursor-pointer items-start gap-3">
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0">
          <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? 'accepted-error' : undefined}
            className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-border-input bg-surface-2 transition-colors checked:border-accent-bright checked:bg-[var(--ds-accent-face)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright aria-[invalid]:border-danger disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Check
            className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-on-accent opacity-0 peer-checked:opacity-100"
            aria-hidden="true"
          />
        </span>
        <span className={cn('text-sm leading-relaxed', hasError ? 'text-danger' : 'text-text-muted')}>
          I understand {COMPLIANCE.short.replace(/\.$/, '')} — it provides signals, not trades on my
          behalf.
        </span>
      </label>
      {hasError && (
        <p id="accepted-error" className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Provider sign-up placeholders. Visually complete; no-op handlers. */
function OAuthButtons({ onClick, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <OAuthButton onClick={onClick} disabled={disabled} label="Sign up with Google">
        <GoogleMark />
        Google
      </OAuthButton>
      <OAuthButton onClick={onClick} disabled={disabled} label="Sign up with Apple">
        <AppleMark />
        Apple
      </OAuthButton>
    </div>
  )
}

function OAuthButton({ onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface/40 text-sm font-medium text-text transition-colors hover:border-border-hover hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  )
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4">
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint">
        or continue with email
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  )
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-.96 2.6-2.05 3.4l3.3 2.56c1.93-1.78 3.05-4.4 3.05-7.5 0-.7-.06-1.37-.18-2.02H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.74.57-2.63 2.05C4.9 19.86 8.2 22 12 22c2.7 0 4.96-.9 6.6-2.43l-3.3-2.56c-.9.6-2.06.96-3.3.96-2.55 0-4.7-1.72-5.47-4.04z"
      />
      <path
        fill="#FBBC05"
        d="M3.23 7.08A9.96 9.96 0 0 0 2 12c0 1.78.43 3.46 1.18 4.92l3.37-2.62A5.96 5.96 0 0 1 6.23 12c0-.77.13-1.5.37-2.18L3.23 7.08z"
      />
      <path
        fill="#4285F4"
        d="M12 6.4c1.47 0 2.78.5 3.82 1.5l2.85-2.85C16.95 3.42 14.7 2.5 12 2.5 8.2 2.5 4.9 4.64 3.23 7.78l3.37 2.62C7.3 8.12 9.45 6.4 12 6.4z"
      />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg className="h-4 w-4 fill-current text-text" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.36 12.78c-.02-2.2 1.8-3.25 1.88-3.3-1.02-1.5-2.62-1.7-3.18-1.72-1.35-.14-2.64.8-3.32.8-.68 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.58 2.17-1.53 2.65-.39 6.57 1.1 8.72.73 1.05 1.6 2.23 2.74 2.19 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5zM14.2 6.1c.6-.73 1.01-1.74.9-2.75-.87.04-1.93.58-2.55 1.31-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.5 2.57-1.23z" />
    </svg>
  )
}
