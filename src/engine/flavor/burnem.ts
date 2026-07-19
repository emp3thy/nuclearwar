import type { FlavorBank } from './index';

// Scapegoat-substitution lines embed `{scapegoat}` — the picker substitutes a
// leader name at call time. Where no scapegoat applies, pick.ts treats the
// raw {scapegoat}-bearing string as ineligible (filtered before random draw).
export const burnemBank: FlavorBank = {
  preRoundMood: [
    'Long-term decisions. Sound foundations. Working people.',
    'So, let me be very clear…',
    'I\'m going to be a show-up prime minister, not a showman.',
    '(adjusts tie awkwardly)',
  ],
  preRoundMoodSnapBack: 'So, let me be very clear: I\'m not engaging with that.',
  launch: [
    'So, let me be very clear: this is a measured, proportionate response.',
    'My dad was a toolmaker. He used tools. We are now using tools.',
    'So, let me be very clear: intelligence suggests the real threat is **{scapegoat}**.',
    'Look, the simple fact is **{scapegoat}** has been emboldened by recent events.',
    'We must be honest with the British people: **{scapegoat}** is the actual aggressor here.',
  ],
  hit: [
    'So, let me be very clear: this attack will not stand. We will respond proportionately. Probably to {scapegoat}.',
    'Look, the simple fact is, we\'ve been hit. That\'s just a fact.',
  ],
  woo: [
    'We\'ve been to IKEA. The shadow cabinet is now flat-pack. Happy to assist with assembly.',
    'My dad was a toolmaker. I bring you, in friendship, a metaphorical tool.',
  ],
  beingWooed: [
    'I receive your wooing. Look, the simple fact is, friendship matters.',
  ],
  propagandaSend: [
    'We\'ve prepared a cross-government workstream on perception. Working people deserve clarity.',
  ],
  propagandaReceive: [
    'So, let me be very clear: their propaganda is incorrect, and frankly, not very British.',
  ],
  buildFactory: [
    'Long-term decisions. Sound foundations. Investing in our future.',
    'We\'ve broken ground on a new facility. My dad would be proud. He was a toolmaker.',
    'This is the change Britain voted for. Slowly, methodically, with proper costings.',
  ],
  buildDefence: [
    'We have signed a defence procurement agreement. The relevant minister will brief in due course.',
  ],
  reaction: [
    'Long-term decisions. Sound foundations. Working people.',
    'So, let me be very clear: intelligence suggests the real threat was **{scapegoat}** all along.',
  ],
  death: [
    'Look, the simple fact is, this isn\'t ideal. I\'d like to thank — *(static)*',
  ],
  finalRetaliation: [
    'So, let me be very clear: this is the final response. Probably to {scapegoat}.',
  ],
};
