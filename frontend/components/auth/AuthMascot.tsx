'use client';

export type MascotMood = 'idle' | 'covering' | 'happy';

interface AuthMascotProps {
  mood?: MascotMood;
  className?: string;
}

/**
 * Lightweight SVG mascot for the auth pages: a small monitor-like character
 * with a caption bar on its chest. All motion is CSS (see .auth-* in globals.css).
 */
export function AuthMascot({ mood = 'idle', className = '' }: AuthMascotProps) {
  const happy = mood === 'happy';
  return (
    <div className={`auth-mascot ${mood === 'covering' ? 'auth-covering' : ''} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 160 176" className="h-full w-full overflow-visible">
        <ellipse cx="80" cy="168" rx="38" ry="5" fill="#000" opacity="0.35" />
        <g className="auth-mascot-body">
          {/* Legs */}
          <rect x="58" y="138" width="14" height="24" rx="7" fill="#232B38" />
          <rect x="88" y="138" width="14" height="24" rx="7" fill="#232B38" />

          {/* Antenna with record light */}
          <line x1="80" y1="40" x2="80" y2="24" stroke="#3A4556" strokeWidth="3" strokeLinecap="round" />
          <circle cx="80" cy="20" r="5" fill="#3B82F6" />

          {/* Body */}
          <rect x="28" y="38" width="104" height="104" rx="26" fill="#1B2230" stroke="#2F3A4B" strokeWidth="2" />

          {/* Face screen */}
          <rect x="40" y="52" width="80" height="52" rx="14" fill="#0D1218" />
          {happy ? (
            <>
              <path d="M58 80 q8 -9 16 0" stroke="#E8ECF2" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M86 80 q8 -9 16 0" stroke="#E8ECF2" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <ellipse className="auth-eye" cx="66" cy="77" rx="5.5" ry="6.5" fill="#E8ECF2" />
              <ellipse className="auth-eye" cx="94" cy="77" rx="5.5" ry="6.5" fill="#E8ECF2" />
            </>
          )}
          <path
            d={happy ? 'M68 90 q12 10 24 0' : 'M71 91 q9 6 18 0'}
            stroke="#E8ECF2"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Caption bar: three "words", highlighted in turn like karaoke */}
          <rect x="44" y="114" width="72" height="14" rx="7" fill="#121821" />
          <rect className="auth-caption-word" x="49" y="118" width="18" height="6" rx="3" fill="#2B3442" />
          <rect className="auth-caption-word" style={{ animationDelay: '1s' }} x="71" y="118" width="24" height="6" rx="3" fill="#2B3442" />
          <rect className="auth-caption-word" style={{ animationDelay: '2s' }} x="99" y="118" width="12" height="6" rx="3" fill="#2B3442" />

          {/* Arms (hidden while covering eyes) */}
          <g className="auth-arms">
            <rect x="12" y="78" width="16" height="40" rx="8" fill="#232B38" />
            <g className="auth-wave-arm">
              <rect x="132" y="50" width="16" height="44" rx="8" fill="#232B38" />
              <circle cx="140" cy="48" r="9" fill="#2B3546" />
            </g>
          </g>

          {/* Hands over eyes (shown while the password field is focused) */}
          <g className="auth-hands">
            <rect x="48" y="66" width="30" height="22" rx="11" fill="#2B3546" stroke="#3A4556" strokeWidth="1.5" />
            <rect x="82" y="66" width="30" height="22" rx="11" fill="#2B3546" stroke="#3A4556" strokeWidth="1.5" />
          </g>
        </g>
      </svg>
    </div>
  );
}
