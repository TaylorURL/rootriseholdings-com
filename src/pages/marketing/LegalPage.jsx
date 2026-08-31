import { Link } from 'react-router-dom'
import { Section } from '../../components/marketing/Section'
import PageMasthead from '../../components/marketing/PageMasthead'
import { PRODUCT, COMPLIANCE } from '../../lib/brand'
import { BREADCRUMB_TRAILS } from '../../lib/routeMeta.js'

/**
 * The privacy and terms pages, rendered from one shape inside the marketing
 * shell so both carry the site's nav and footer. Each section states what the
 * platform actually does with data and accounts, so a change to how the app
 * stores or reports anything has to be answered here as well.
 */
const PAGES = {
  privacy: {
    title: 'Privacy',
    siblingTo: '/terms',
    siblingLabel: 'the terms',
    intro:
      'The account is an email address and a password, the journal lives in your own browser, and nothing the platform holds is sold or shared.',
    sections: [
      {
        heading: 'What the account holds',
        body: 'Signing up stores an email address and a hashed password with the authentication provider the platform runs on. No profile beyond that exists, no confirmation mail is sent, and the address is used only to sign you in.',
      },
      {
        heading: 'Where journal data lives',
        body: 'Trades, settings, prop-firm parameters, and day plans persist in your own browser’s local storage. They never leave the device they were entered on, and clearing the browser’s site data removes them entirely.',
      },
      {
        heading: 'Market data requests',
        body: 'Quotes, candles, and the economic calendar are read through this site’s own origin. Those requests carry no account information and no personal data.',
      },
      {
        heading: 'Error and traffic reporting',
        body: 'When a page throws an error in the browser, the message, stack trace, page URL, and browser user agent are reported so the fault can be fixed. A traffic counter records page visits. Neither stream carries your journal or your email.',
      },
      {
        heading: 'What is not collected',
        body: 'No advertising identifiers, no cross-site tracking, no sale or sharing of any data with third parties.',
      },
    ],
  },
  terms: {
    title: 'Terms',
    siblingTo: '/privacy',
    siblingLabel: 'the privacy page',
    intro: COMPLIANCE.long,
    sections: [
      {
        heading: 'What this platform is',
        body: `${PRODUCT.name} is the software one private trading desk runs on: a rule-gated trade journal and a daily briefing composed from market data. Access to the terminal requires an account.`,
      },
      {
        heading: 'Not investment advice',
        body: 'Nothing on this site is investment advice, a trade signal, a solicitation, or an offer to manage money. Structure reads, briefings, and every computed figure are decision support for the person reading them, who alone decides what to trade.',
      },
      {
        heading: 'Risk',
        body: 'Trading leveraged instruments carries substantial risk of loss. Past figures shown anywhere on the platform do not predict future results.',
      },
      {
        heading: 'Your data and your account',
        body: 'Journal data stays in your browser and can be removed by clearing the browser’s site data. The account exists only to gate the terminal and can be abandoned at any time.',
      },
      {
        heading: 'Warranty',
        body: 'The platform is provided as is, without warranty of any kind. Market data comes from third-party feeds and can be delayed, incomplete, or unavailable; an instrument the feed cannot price renders as unavailable rather than as a number.',
      },
    ],
  },
}

function Breadcrumb({ trail }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-label text-text-faint">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1
          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {last ? (
                <span aria-current="page">{crumb.name}</span>
              ) : (
                <Link
                  to={crumb.path}
                  className="focus-ring rounded-sm transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-text"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

const INLINE_LINK =
  'focus-ring rounded-sm font-medium text-accent underline decoration-from-font underline-offset-2 transition-colors duration-200 ease-out [@media(hover:hover)]:hover:text-accent-bright'

/**
 * Both legal routes render from one shape: the navy masthead the bar rides
 * over, then the sections as a numbered ruled index, set to the reading measure
 * rather than the page rail.
 */
function LegalPage({ kind }) {
  const page = PAGES[kind]
  const trail = BREADCRUMB_TRAILS[`/${kind}`] ?? []

  return (
    <>
      <PageMasthead
        eyebrow={PRODUCT.name}
        title={page.title}
        description={page.intro}
        breadcrumb={<Breadcrumb trail={trail} />}
      />

      <Section ground="page">
        <div className="max-w-reading">
          <ol className="border-t border-border">
            {page.sections.map((section, index) => (
              <li
                key={section.heading}
                className="grid gap-3 border-b border-border py-8 lg:grid-cols-[3rem_minmax(0,1fr)] lg:gap-8"
              >
                <span className="font-mono text-sm font-semibold tabular-nums text-text-ghost">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="t-h4 text-text">{section.heading}</h2>
                  <p className="t-body mt-3 text-text-muted">{section.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="t-meta mt-10 text-text-faint">{COMPLIANCE.long}</p>

          <p className="t-body mt-6 text-text-muted">
            See also{' '}
            <Link to={page.siblingTo} className={INLINE_LINK}>
              {page.siblingLabel}
            </Link>{' '}
            and the{' '}
            <Link to="/" className={INLINE_LINK}>
              desk&rsquo;s public page
            </Link>
            .
          </p>
        </div>
      </Section>
    </>
  )
}

export function PrivacyPage() {
  return <LegalPage kind="privacy" />
}

export function TermsPage() {
  return <LegalPage kind="terms" />
}
