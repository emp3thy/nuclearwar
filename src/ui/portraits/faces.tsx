/**
 * nuke — geometric caricature portraits (from the design handoff).
 * Each leader rendered as a flat geometric SVG composition.
 * Recognizable through silhouette + signature color + key prop, never literal likeness.
 * Deliberate placeholders: commissioned art can replace bodies with no API change.
 */

export function ChumpFace(): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* suit shoulders */}
      <path d="M 5 102 L 12 78 L 88 78 L 95 102 Z" fill="#2a3a52" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* white shirt */}
      <path d="M 38 78 L 50 96 L 62 78 Z" fill="#f1e6cc" stroke="#141214" strokeWidth="2.2" strokeLinejoin="round"/>
      {/* tie */}
      <path d="M 47 78 L 53 78 L 56 100 L 50 110 L 44 100 Z" fill="#d6293f" stroke="#141214" strokeWidth="2.2" strokeLinejoin="round"/>
      {/* neck */}
      <rect x="42" y="68" width="16" height="12" fill="#e2945a" stroke="#141214" strokeWidth="2.2"/>
      {/* head trapezoid */}
      <path d="M 22 35 Q 24 65 35 72 L 65 72 Q 76 65 78 35 Q 50 28 22 35 Z" fill="#e8a36a" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* hair sweep (yellow blob) */}
      <path d="M 18 32 Q 20 12 38 10 Q 50 6 64 11 Q 82 14 84 30 Q 82 36 70 32 Q 60 26 48 30 Q 32 38 24 38 Q 18 38 18 32 Z"
        fill="#f3c318" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* hair wisp curl */}
      <path d="M 70 28 Q 78 22 82 28" fill="none" stroke="#141214" strokeWidth="2" strokeLinecap="round"/>
      {/* squinty eyes */}
      <ellipse cx="38" cy="48" rx="4" ry="2" fill="#141214"/>
      <ellipse cx="62" cy="48" rx="4" ry="2" fill="#141214"/>
      {/* eye bag lines */}
      <path d="M 33 52 Q 38 54 43 52" fill="none" stroke="#141214" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M 57 52 Q 62 54 67 52" fill="none" stroke="#141214" strokeWidth="1.4" strokeLinecap="round"/>
      {/* pursed mouth */}
      <ellipse cx="50" cy="62" rx="7" ry="2.5" fill="#b04050" stroke="#141214" strokeWidth="2"/>
    </svg>
  );
}

export function NetanyahooFace(): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* suit */}
      <path d="M 5 102 L 12 78 L 88 78 L 95 102 Z" fill="#1c2a44" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M 38 78 L 50 96 L 62 78 Z" fill="#f1e6cc" stroke="#141214" strokeWidth="2.2" strokeLinejoin="round"/>
      {/* tie */}
      <path d="M 47 78 L 53 78 L 56 100 L 50 110 L 44 100 Z" fill="#1a4d8c" stroke="#141214" strokeWidth="2.2" strokeLinejoin="round"/>
      {/* neck */}
      <rect x="42" y="68" width="16" height="12" fill="#d8ad88" stroke="#141214" strokeWidth="2.2"/>
      {/* head — squarer */}
      <path d="M 24 32 L 24 62 Q 26 72 38 74 L 62 74 Q 74 72 76 62 L 76 32 Q 50 28 24 32 Z"
        fill="#dca884" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* white hair */}
      <path d="M 20 30 Q 22 14 50 12 Q 78 14 80 30 L 80 24 Q 50 18 20 24 Z"
        fill="#f6efde" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* furrowed brow */}
      <path d="M 30 38 L 44 36" stroke="#141214" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 56 36 L 70 38" stroke="#141214" strokeWidth="2" strokeLinecap="round"/>
      {/* eyes */}
      <circle cx="38" cy="46" r="2.5" fill="#141214"/>
      <circle cx="62" cy="46" r="2.5" fill="#141214"/>
      {/* serious mouth */}
      <path d="M 42 64 L 58 64" stroke="#141214" strokeWidth="2.5" strokeLinecap="round"/>
      {/* tiny red sharpie behind ear */}
      <rect x="76" y="48" width="2.5" height="14" fill="#d6293f" stroke="#141214" strokeWidth="1"/>
    </svg>
  );
}

export function KhameneverhereFace(): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* cardboard backdrop */}
      <rect x="0" y="0" width="100" height="100" fill="#c79857" opacity="0.0"/>
      {/* prop stick behind */}
      <rect x="46" y="60" width="8" height="48" fill="#a47a3e" stroke="#141214" strokeWidth="2"/>
      {/* cardboard silhouette of bust */}
      <path d="M 22 100 L 22 78 Q 22 72 30 70 Q 38 66 38 60 L 38 46 Q 30 42 30 32 Q 30 14 50 14 Q 70 14 70 32 Q 70 42 62 46 L 62 60 Q 62 66 70 70 Q 78 72 78 78 L 78 100 Z"
        fill="#c79857" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* cardboard corrugation lines */}
      <line x1="32" y1="80" x2="68" y2="80" stroke="#a47a3e" strokeWidth="1.2"/>
      <line x1="32" y1="86" x2="68" y2="86" stroke="#a47a3e" strokeWidth="1.2"/>
      <line x1="32" y1="92" x2="68" y2="92" stroke="#a47a3e" strokeWidth="1.2"/>
      {/* duct tape */}
      <rect x="38" y="50" width="24" height="6" fill="#5a5550" stroke="#141214" strokeWidth="1.5"/>
      {/* faded face outline */}
      <circle cx="50" cy="32" r="14" fill="none" stroke="#8c6633" strokeWidth="1.5" strokeDasharray="3 2"/>
      {/* tiny stamp */}
      <g transform="translate(60 70) rotate(-12)">
        <rect x="-14" y="-5" width="28" height="10" fill="#d6293f" stroke="#141214" strokeWidth="1.5"/>
        <text x="0" y="2.4" textAnchor="middle" fill="#f1e6cc" fontFamily="Anton, sans-serif" fontSize="7" letterSpacing="0.5">NOT HERE</text>
      </g>
    </svg>
  );
}

export function BurnemFace(): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* black zip-up crew-neck — only suit-less cast member besides Mileigh */}
      <path d="M 5 102 L 12 76 L 88 76 L 95 102 Z" fill="#1c1a1c" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* zip line + pull */}
      <line x1="50" y1="78" x2="50" y2="100" stroke="#5a5a5a" strokeWidth="2"/>
      <rect x="48.6" y="80" width="2.8" height="5" fill="#8a8a8a" stroke="#141214" strokeWidth="1"/>
      {/* crew-neck collar */}
      <path d="M 40 76 Q 50 84 60 76" fill="none" stroke="#141214" strokeWidth="2.2"/>
      {/* neck */}
      <rect x="42" y="66" width="16" height="12" fill="#ecd0b4" stroke="#141214" strokeWidth="2.2"/>
      {/* long pale face */}
      <path d="M 28 26 L 28 56 Q 30 70 40 73 L 60 73 Q 70 70 72 56 L 72 26 Q 50 22 28 26 Z"
        fill="#f2d8bc" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* flat dark hair, side sweep */}
      <path d="M 24 28 Q 25 12 50 10 Q 75 12 76 28 L 76 22 Q 62 14 40 17 Q 28 19 24 26 Z"
        fill="#241f1d" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* very thick rectangular brows */}
      <rect x="31" y="36" width="15" height="5" fill="#241f1d" stroke="#141214" strokeWidth="1.6"/>
      <rect x="54" y="36" width="15" height="5" fill="#241f1d" stroke="#141214" strokeWidth="1.6"/>
      {/* rectangular glasses */}
      <rect x="30" y="43" width="17" height="11" rx="1.5" fill="none" stroke="#141214" strokeWidth="2.4"/>
      <rect x="53" y="43" width="17" height="11" rx="1.5" fill="none" stroke="#141214" strokeWidth="2.4"/>
      <line x1="47" y1="48" x2="53" y2="48" stroke="#141214" strokeWidth="2.4"/>
      {/* eyes — famous lashes rendered as slightly heavy upper lids */}
      <path d="M 34 48 Q 38 46 42 48" fill="none" stroke="#141214" strokeWidth="2.6" strokeLinecap="round"/>
      <path d="M 58 48 Q 62 46 66 48" fill="none" stroke="#141214" strokeWidth="2.6" strokeLinecap="round"/>
      <circle cx="38" cy="49" r="1.6" fill="#141214"/>
      <circle cx="62" cy="49" r="1.6" fill="#141214"/>
      {/* stern flat mouth */}
      <line x1="42" y1="64" x2="58" y2="64" stroke="#141214" strokeWidth="2.4" strokeLinecap="round"/>
      {/* mini campaign placard prop, corner (cast-prop tradition) */}
      <g transform="translate(80 78) rotate(8)">
        <rect x="-1.2" y="0" width="2.4" height="22" fill="#a47a3e" stroke="#141214" strokeWidth="1.2"/>
        <rect x="-13" y="-16" width="26" height="18" fill="#c8283c" stroke="#141214" strokeWidth="1.8"/>
        <text x="0" y="-8.5" textAnchor="middle" fill="#f1e6cc" fontFamily="Anton, sans-serif" fontSize="6.5" letterSpacing="0.5">VOTE</text>
        <text x="0" y="-1.5" textAnchor="middle" fill="#f3c318" fontFamily="Anton, sans-serif" fontSize="6.5" letterSpacing="0.5">FOR US</text>
      </g>
    </svg>
  );
}

export function CarnageFace(): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* suit dark */}
      <path d="M 5 102 L 12 78 L 88 78 L 95 102 Z" fill="#1f1f24" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M 38 78 L 50 96 L 62 78 Z" fill="#f1e6cc" stroke="#141214" strokeWidth="2.2" strokeLinejoin="round"/>
      {/* tie */}
      <path d="M 47 78 L 53 78 L 56 100 L 50 110 L 44 100 Z" fill="#b22535" stroke="#141214" strokeWidth="2.2" strokeLinejoin="round"/>
      {/* maple leaf pin */}
      <path d="M 24 84 L 26 82 L 28 84 L 27 86 L 30 86 L 28 88 L 30 91 L 26 90 L 26 93 L 22 90 L 18 91 L 20 88 L 18 86 L 21 86 L 20 84 L 22 82 Z"
        fill="#b22535" stroke="#141214" strokeWidth="1.4" strokeLinejoin="round"/>
      {/* neck */}
      <rect x="42" y="68" width="16" height="12" fill="#dfbb96" stroke="#141214" strokeWidth="2.2"/>
      {/* rectangular head */}
      <path d="M 26 30 L 26 60 Q 28 72 38 74 L 62 74 Q 72 72 74 60 L 74 30 Q 50 24 26 30 Z"
        fill="#e7c8a4" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* salt-pepper hair */}
      <path d="M 22 28 Q 24 14 50 12 Q 76 14 78 28 Q 70 22 50 22 Q 30 22 22 28 Z"
        fill="#5a5a5a" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      <line x1="32" y1="20" x2="40" y2="16" stroke="#e7e7e7" strokeWidth="1.3"/>
      <line x1="60" y1="16" x2="68" y2="20" stroke="#e7e7e7" strokeWidth="1.3"/>
      {/* central-banker square glasses */}
      <rect x="28" y="40" width="18" height="12" fill="none" stroke="#141214" strokeWidth="2.2"/>
      <rect x="54" y="40" width="18" height="12" fill="none" stroke="#141214" strokeWidth="2.2"/>
      <line x1="46" y1="46" x2="54" y2="46" stroke="#141214" strokeWidth="2.2"/>
      {/* eyes */}
      <circle cx="37" cy="46" r="1.6" fill="#141214"/>
      <circle cx="63" cy="46" r="1.6" fill="#141214"/>
      {/* tidy small smile */}
      <path d="M 42 64 Q 50 68 58 64" stroke="#141214" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export function MileighFace(): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* leather jacket */}
      <path d="M 4 102 L 10 76 L 90 76 L 96 102 Z" fill="#1a1110" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* zipper */}
      <line x1="50" y1="78" x2="50" y2="100" stroke="#a8a8a8" strokeWidth="2" strokeDasharray="2 2"/>
      {/* neck */}
      <rect x="42" y="68" width="16" height="10" fill="#dfb993" stroke="#141214" strokeWidth="2.2"/>
      {/* head */}
      <ellipse cx="50" cy="48" rx="24" ry="26" fill="#ebc09a" stroke="#141214" strokeWidth="2.5"/>
      {/* wild spikey hair */}
      <path d="M 18 36 L 14 14 L 24 22 L 22 6 L 32 18 L 36 4 L 44 18 L 50 6 L 56 18 L 64 4 L 68 18 L 78 6 L 76 22 L 86 14 L 82 36 Q 78 22 50 20 Q 22 22 18 36 Z"
        fill="#3a2820" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* mutton chops */}
      <path d="M 26 52 L 22 70 L 30 62 L 32 56 Z" fill="#3a2820" stroke="#141214" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M 74 52 L 78 70 L 70 62 L 68 56 Z" fill="#3a2820" stroke="#141214" strokeWidth="2" strokeLinejoin="round"/>
      {/* wide eyes */}
      <circle cx="38" cy="46" r="3.5" fill="#f1e6cc" stroke="#141214" strokeWidth="1.8"/>
      <circle cx="62" cy="46" r="3.5" fill="#f1e6cc" stroke="#141214" strokeWidth="1.8"/>
      <circle cx="38" cy="46" r="1.6" fill="#141214"/>
      <circle cx="62" cy="46" r="1.6" fill="#141214"/>
      {/* screaming mouth */}
      <ellipse cx="50" cy="64" rx="7" ry="6" fill="#141214" stroke="#141214" strokeWidth="2"/>
      <path d="M 44 64 L 56 64" stroke="#d6293f" strokeWidth="2" />
      {/* chainsaw tooth glint corner */}
      <g transform="translate(82 84) rotate(-20)">
        <rect x="-6" y="-3" width="14" height="5" fill="#e6a517" stroke="#141214" strokeWidth="1.4"/>
        <path d="M 8 -3 L 14 -1 L 14 0 L 8 2 Z" fill="#a8a8a8" stroke="#141214" strokeWidth="1.2"/>
      </g>
    </svg>
  );
}

export function DisparageFace(): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M 5 102 L 12 78 L 88 78 L 95 102 Z" fill="#2a1f3e" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M 38 78 L 50 96 L 62 78 Z" fill="#f1e6cc" stroke="#141214" strokeWidth="2.2"/>
      <path d="M 47 78 L 53 78 L 56 100 L 50 110 L 44 100 Z" fill="#e6a517" stroke="#141214" strokeWidth="2.2"/>
      <rect x="42" y="68" width="16" height="12" fill="#e9b08a" stroke="#141214" strokeWidth="2.2"/>
      {/* round ruddy head */}
      <circle cx="50" cy="48" r="26" fill="#eebb95" stroke="#141214" strokeWidth="2.5"/>
      {/* flush cheeks */}
      <circle cx="32" cy="56" r="4" fill="#d6293f" opacity="0.5"/>
      <circle cx="68" cy="56" r="4" fill="#d6293f" opacity="0.5"/>
      {/* hair */}
      <path d="M 24 30 Q 30 14 50 14 Q 72 14 76 30 Q 60 22 50 24 Q 38 22 24 30 Z"
        fill="#7a5a40" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* squinty smug eyes */}
      <path d="M 32 46 Q 38 44 44 46" stroke="#141214" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
      <path d="M 56 46 Q 62 44 68 46" stroke="#141214" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
      {/* smirk */}
      <path d="M 42 62 Q 52 70 62 60" stroke="#141214" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      {/* pint glass */}
      <path d="M 70 60 L 92 60 L 88 96 L 74 96 Z" fill="#f3c318" stroke="#141214" strokeWidth="2" strokeLinejoin="round"/>
      <ellipse cx="81" cy="60" rx="11" ry="3" fill="#f6efde" stroke="#141214" strokeWidth="1.6"/>
    </svg>
  );
}

export function GrouchoFace(): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" data-face="groucho">
      {/* shirt collar - flat */}
      <path d="M 5 102 L 12 78 L 88 78 L 95 102 Z" fill="#1a3a52" stroke="#141214" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M 38 78 L 50 96 L 62 78 Z" fill="#f1e6cc" stroke="#141214" strokeWidth="2.2"/>
      {/* black bowtie */}
      <path d="M 42 76 L 50 80 L 58 76 L 58 84 L 50 80 L 42 84 Z" fill="#141214" stroke="#141214" strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="50" cy="80" r="2" fill="#f1e6cc"/>
      {/* head — Groucho-ish */}
      <ellipse cx="50" cy="46" rx="24" ry="26" fill="#e6c19e" stroke="#141214" strokeWidth="2.5"/>
      {/* dark hair */}
      <path d="M 26 28 Q 30 14 50 12 Q 70 14 74 28 Q 62 24 50 24 Q 38 24 26 28 Z"
        fill="#141214" stroke="#141214" strokeWidth="2.4" strokeLinejoin="round"/>
      {/* round glasses */}
      <circle cx="38" cy="46" r="7" fill="none" stroke="#141214" strokeWidth="2.4"/>
      <circle cx="62" cy="46" r="7" fill="none" stroke="#141214" strokeWidth="2.4"/>
      <line x1="45" y1="46" x2="55" y2="46" stroke="#141214" strokeWidth="2.4"/>
      <circle cx="38" cy="46" r="1.6" fill="#141214"/>
      <circle cx="62" cy="46" r="1.6" fill="#141214"/>
      {/* big moustache */}
      <path d="M 30 60 Q 40 70 50 64 Q 60 70 70 60 Q 64 68 50 70 Q 36 68 30 60 Z"
        fill="#141214" stroke="#141214" strokeWidth="2" strokeLinejoin="round"/>
      {/* cigar */}
      <rect x="68" y="64" width="12" height="3" fill="#8a5a3a" stroke="#141214" strokeWidth="1.2"/>
      <rect x="78" y="63.5" width="2" height="4" fill="#e6a517"/>
    </svg>
  );
}
