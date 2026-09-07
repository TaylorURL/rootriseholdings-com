/**
 * The questions the desk is actually asked, answered from the same facts the
 * rest of the page states. The answers are the source of the FAQPage markup in
 * the document, so the two cannot drift.
 */
export const FAQ = [
  {
    question: 'What is Root & Rise?',
    answer:
      'A private Smart Money Concepts trading desk and the software it runs on. It does not manage outside money and it does not sell trade signals.',
  },
  {
    question: 'Which markets does the desk trade?',
    answer:
      'Gold on the 1H, NAS100 and SP500 on the 15m, and US30 on the 1H. An FX watch list is read for context and never traded.',
  },
  {
    question: 'How is an entry decided?',
    answer:
      'Bias is set on the Daily and 4H from market structure. On the 1H and 15m the desk waits for a Break of Structure or a Change of Character, then for the pullback into the 62 to 79 percent Optimal Trade Entry zone before a ticket is written.',
  },
  {
    question: 'What are the risk rules?',
    answer:
      'Every trade risks at most 1 percent of equity and targets at least 2R. A 0.5 percent down day or two consecutive losses closes the desk for the session. The journal refuses a ticket over the 1 percent cap, a third A+ setup, or any ticket written on a locked day rather than flagging it, and a ticket below the 2R minimum logs with the departure marked against it.',
  },
]
