import { JournalProvider } from '../../context/JournalContext'
import { SignalsProvider } from '../../context/SignalsContext'

/**
 * The journal and the signal sweep belong to the terminal alone. Both open on
 * mount - the sweep reads every instrument the desk follows and runs the
 * structure pass over each one, the journal re-reads its store on a timer - and
 * nothing on a public page reads a line of either, so they are opened by the
 * gated frame rather than by the tree above it.
 *
 * They are composed here rather than in the route tree so the pair travels as
 * the gated frame's own chunk. Named from the route tree they sat in the entry,
 * and the structure engine, the rule book and the journal store were parsed by
 * every reader of the brand page to serve a subtree that page never renders.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default function DeskProviders({ children }) {
  return (
    <JournalProvider>
      <SignalsProvider>{children}</SignalsProvider>
    </JournalProvider>
  )
}
