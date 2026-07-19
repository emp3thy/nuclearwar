export interface DisparageBank {
  cameo: string[];        // Action-screen one-liners (~15-20% per impact)
  columnLines: string[];  // RoundSummary column body lines (~1-in-3 per round)
  footerNotes: string[];  // Rotated absentee-MP footer notes
}

export const disparageBank: DisparageBank = {
  cameo: [
    'If I were in charge, this wouldn\'t be happening. Probably.',
    'Disgraceful. Anyway, off to America again.',
    'All the charisma of a damp rag and the diplomatic skills of a low-grade bank clerk.',
    'We want our country back. From all this.',
    'I told you. I told them all. Now look.',
    'Two-tier policing. No further comment. Yet.',
    'Frit. The lot of them.',
  ],
  columnLines: [
    'I\'d have done this much better if I were leader. Pint?',
    'We love war. We just hate the wars run by other people.',
    'I haven\'t had time for a constituent surgery — I\'ve been shouting about this on television. Priorities.',
    'Disgusting. Disgraceful. I\'d have got our country back. Faster. Without all this. Anyway, off to America.',
    'Make no mistake: this is what happens when you don\'t elect me. Pints.',
    'The Establishment did this. The Blob. The Quango. The Whoever. Not me.',
    'I told them. They didn\'t listen. They\'re paying for it now. So am I, in pints.',
    'King in t\' North? He\'s from MERSEYSIDE. I\'ve seen more of Manchester from the airport bar.',
  ],
  footerNotes: [
    'Mr Disparage was unavailable for follow-up; he was photographing himself at a pub.',
    'Mr Disparage\'s office referred us to GB News, where he was on air for the eighth time this week.',
    'Mr Disparage was scheduled for a constituent surgery, but is currently in Florida.',
    'Mr Disparage\'s voting record this Parliament is grade E. He could not be reached for comment.',
    'This column was filed from outside the House of Commons, where Mr Disparage has not been seen since Tuesday.',
  ],
};
