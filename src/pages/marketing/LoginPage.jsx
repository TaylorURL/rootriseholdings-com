import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, OctagonAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/marketing/layout/AuthShell'
import AuthField from '../../components/marketing/AuthField'
import MarketingButton from '../../components/marketing/MarketingButton'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The desk's floor, held above the provider's own so the weaker one never binds. */
const MIN_PASSWORD = 8

/** Field-level checks, run before anything is sent. Returns field to message. */
function validate({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Enter your email address.'
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Enter your password.'
  else if (password.length < MIN_PASSWORD) {
    errors.password = `Password must be at least ${MIN_PASSWORD} characters.`
  }
  return errors
}

const COPY = {
  signin: {
    eyebrow: 'Desk Access',
    title: 'Sign in to the terminal',
    subtitle: 'The briefing, the journal, and the rule book pick up where the last session ended.',
    submit: 'Sign In',
    pending: 'Signing in…',
    switchPrompt: 'No account yet?',
    switchAction: 'Create Account',
    autoComplete: 'current-password',
  },
  signup: {
    eyebrow: 'Desk Access',
    title: 'Create your desk account',
    subtitle: 'One account holds the journal, the rule book, and every briefing edition.',
    submit: 'Create Account',
    pending: 'Creating…',
    /** The floor is stated where it binds; an existing account already clears it. */
    passwordPlaceholder: `At least ${MIN_PASSWORD} characters`,
    switchPrompt: 'Already have an account?',
    switchAction: 'Sign In',
    autoComplete: 'new-password',
  },
}

/**
 * Sign-in and sign-up for the terminal, against the project's identity
 * provider. One form serves both: the fields are identical, so the mode changes
 * the copy and which call it makes rather than the layout under it.
 */
export default function LoginPage() {
  const { signIn, signUp, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState('signin')
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  if (isAuthenticated) return <Navigate to="/app" replace />

  const copy = COPY[mode]

  const update = (field) => (event) => {
    const next = { ...values, [field]: event.target.value }
    setValues(next)
    setFormError(null)
    if (touched[field]) setErrors(validate(next))
  }

  const handleBlur = (field) => () => {
    setTouched((previous) => ({ ...previous, [field]: true }))
    setErrors(validate(values))
  }

  const switchMode = () => {
    setMode((current) => (current === 'signin' ? 'signup' : 'signin'))
    setFormError(null)
    setErrors({})
    setTouched({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    setTouched({ email: true, password: true })
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) {
      const form = event.currentTarget
      requestAnimationFrame(() => form.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    setSubmitting(true)
    const action = mode === 'signup' ? signUp : signIn
    const result = await action(values.email.trim(), values.password)
    if (result.error) {
      setSubmitting(false)
      setFormError(result.error)
      return
    }
    navigate(location.state?.from ?? '/app', { replace: true })
  }

  return (
    <AuthShell eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
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
          placeholder={copy.passwordPlaceholder}
          autoComplete={copy.autoComplete}
          value={values.password}
          onChange={update('password')}
          onBlur={handleBlur('password')}
          error={touched.password ? errors.password : undefined}
          disabled={submitting}
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="press focus-ring flex h-8 w-8 items-center justify-center rounded-control text-text-faint transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          }
        />

        {/* The provider's refusal, in the desk's own words, above the control
            that would repeat it. */}
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-control bg-[var(--ds-danger-soft)] px-3 py-2.5 text-sm text-danger"
          >
            <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {formError}
          </p>
        )}

        <MarketingButton type="submit" size="lg" disabled={submitting} className="mt-1 w-full">
          {submitting ? copy.pending : copy.submit}
          {!submitting && (
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </MarketingButton>
      </form>

      <p className="mt-7 text-center text-sm text-text-muted">
        {copy.switchPrompt}{' '}
        <button
          type="button"
          onClick={switchMode}
          className="press focus-ring rounded-sm font-medium text-accent-bright transition-colors hover:text-accent"
        >
          {copy.switchAction}
        </button>
      </p>
    </AuthShell>
  )
}
