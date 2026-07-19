import type { FlavorBank } from './index';

// Burn'em — King in t' North. Register rules (see spec §3): tag questions on
// most lines; "handbrake turn" lines pivot blokey→apocalyptic with no
// transition; northern grievance + boosterism; bus obsession. Hard exclusions:
// no Hillsborough, no religious markers, no "What Manchester does today…".
export const burnemBank: FlavorBank = {
  preRoundMood: [
    'We need to bring people with us, don\'t we?',
    'The North is back. Big time.',
    'It\'s not arrogance, it\'s just confidence.',
    'The buses run on time now. That\'s how civilisations survive, isn\'t it?',
    'On bended knee, begging for scraps. Well. Not anymore, are we?',
  ],
  preRoundMoodSnapBack:
    'I\'ve heard what he said. We rise above it up here, don\'t we? Anyway, he\'s barred from the tram.',
  launch: [
    'Let me be clear — they carried on, so I\'m using nuclear force. Anyway. How\'s the family?',
    'I\'ve been very patient, haven\'t I? Well. Patience is a renewable resource. This isn\'t.',
    'They didn\'t leave us a choice down in Whitehall— sorry, force of habit. THEY didn\'t leave us a choice.',
    'This one\'s for every town that ever lost its bus route. It\'s fair, that, isn\'t it?',
  ],
  hit: [
    'That\'s a kindness taken for weakness, that. Big mistake. Massive.',
    'We\'ve been hit. The handbrake\'s off now, isn\'t it?',
  ],
  woo: [
    'Come up north. We\'ll do the match, couple of pints, £2 bus home. That\'s diplomacy, that.',
    'I\'m offering you a franchise partnership. Not the buses. The buses are ours.',
  ],
  beingWooed: [
    'That\'s very warm, that. We take friendship seriously up here, don\'t we?',
  ],
  propagandaSend: [
    'We\'ve sent over some leaflets. Just facts about our transport network. Devastating, honest facts.',
  ],
  propagandaReceive: [
    'They\'re calling me a plastic Northerner. From a bunker. In London. You couldn\'t write it, could you?',
  ],
  buildFactory: [
    'New factory. Good growth in every postcode, hope in every heart. And a bus stop right outside.',
    'They didn\'t build this for us down in Whitehall. We built it ourselves, didn\'t we?',
    'To get on in life, I had to head South. Nobody should have to. So we\'re building here.',
  ],
  buildDefence: [
    'We\'re putting a shield up. It\'s not paranoia, it\'s just confidence, isn\'t it?',
  ],
  reaction: [
    'I\'m watching all this very calmly. Very calmly indeed. Aren\'t I?',
    'Everything\'s connected to the buses if you look closely enough, isn\'t it?',
  ],
  death: [
    'Tell them… the North remembers… and tell them the 135 to Bury still runs on ti—',
  ],
  finalRetaliation: [
    'Right. Last orders, everyone. Last orders. It didn\'t have to be like this, did it?',
  ],
};
