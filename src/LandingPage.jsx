import { useEffect, useRef, useState, useCallback } from 'react';
import './LandingPage.css';

/* ── Peeksta Logo Mark (white, for gradient bg) ── */
const PeekstaLogo = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="6.5" stroke="white" strokeWidth="1.8" fill="none"/>
    <circle cx="10" cy="10" r="2.5" fill="white"/>
  </svg>
);

/* ── Peeksta Logo (gradient-coloured, for light bg) ── */
const PeekstaLogoLight = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pklg" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F77737"/>
        <stop offset="40%" stopColor="#E1306C"/>
        <stop offset="75%" stopColor="#833AB4"/>
        <stop offset="100%" stopColor="#5851DB"/>
      </linearGradient>
    </defs>
    <circle cx="10" cy="10" r="6.5" stroke="url(#pklg)" strokeWidth="1.8" fill="none"/>
    <circle cx="10" cy="10" r="2.5" fill="url(#pklg)"/>
  </svg>
);

/* ── Icons ── */
const IcShield = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IcUsers = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcClock = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcBarChart = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);
const IcLock = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IcArrow = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IcUpload = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const IcCheck = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcStar = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IcGithub = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
  </svg>
);
const IcZap = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IcMessage = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

/* ── Feature card ── */
function FeatureCard({ icon, title, desc, badge, delay }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.12 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className={`lp-feature-card ${vis ? 'lp-visible' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="lp-feature-icon">{icon}</div>
      {badge && <span className="lp-feature-badge">{badge}</span>}
      <h3 className="lp-feature-title">{title}</h3>
      <p className="lp-feature-desc">{desc}</p>
    </div>
  );
}

/* ── Step card ── */
function StepCard({ num, title, desc, delay }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.12 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className={`lp-step-card ${vis ? 'lp-visible' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="lp-step-number">{num}</div>
      <h4 className="lp-step-title">{title}</h4>
      <p className="lp-step-desc">{desc}</p>
    </div>
  );
}

/* ── Main LandingPage ── */
export default function LandingPage({ onEnter, onDemo }) {
  const [scrolled, setScrolled] = useState(false);
  const [heroVis, setHeroVis] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHeroVis(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="lp-root">
      {/* NAV */}
      <nav className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <div className="lp-nav-gem"><PeekstaLogo size={18}/></div>
            <span className="lp-nav-name">Peeksta</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#how" className="lp-nav-link">How it works</a>
            <a href="https://github.com/abhijeetbafna/instalens" target="_blank" rel="noreferrer" className="lp-nav-link lp-nav-link-icon" aria-label="GitHub">
              <IcGithub size={16}/>
            </a>
          </div>
          <div className="lp-nav-ctas">
            <button className="lp-btn-ghost" onClick={onDemo}>Try Demo</button>
            <button className="lp-btn-primary" id="lp-nav-upload-btn" onClick={() => onEnter()}>
              Launch App <IcArrow size={12}/>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-layout">
          {/* Left: copy */}
          <div className={`lp-hero-copy ${heroVis ? 'lp-visible' : ''}`}>
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot"/>
              <span>100% Private & Local</span>
            </div>
            <h1 className="lp-hero-headline">
              Instagram DMs &<br/>
              <span className="lp-gradient-text">Unfollowers, Analyzed.</span>
            </h1>
            <p className="lp-hero-sub">
              Explore your chat history, voice notes, shared reels, and non-followers — 100% privately inside your browser.
            </p>
            <div className="lp-hero-ctas">
              <button className="lp-btn-hero-primary" id="lp-hero-upload-btn" onClick={() => onEnter()}>
                <IcArrow size={17}/>
                Launch App
              </button>
              <button className="lp-btn-hero-ghost" id="lp-hero-demo-btn" onClick={onDemo}>
                Try Demo Mode
              </button>
            </div>
            <div className="lp-hero-social">
              <div className="lp-stars">
                {[1,2,3,4,5].map(i => <IcStar key={i} size={13}/>)}
              </div>
              <span className="lp-social-text">No Login Required · Zero Server Uploads</span>
            </div>
          </div>

          {/* Right: mock dashboard preview */}
          <div className={`lp-hero-preview ${heroVis ? 'lp-visible' : ''}`} style={{ transitionDelay: '180ms' }}>
            <div className="lp-preview-window">
              <div className="lp-preview-titlebar">
                <span className="lp-tb-dot lp-tb-red"/>
                <span className="lp-tb-dot lp-tb-yellow"/>
                <span className="lp-tb-dot lp-tb-green"/>
                <span className="lp-tb-label">Peeksta · Instagram Data Analyzer</span>
              </div>
              <div className="lp-preview-body">
                <div className="lp-mock-sidebar">
                  <div className="lp-mock-brand-bar"/>
                  {['Dashboard','Non-Followers','Mutuals','DMs & Messages','Security'].map((l, i) => (
                    <div key={i} className={`lp-mock-nav-item ${i === 0 ? 'active' : ''}`}>
                      <div className="lp-mock-nav-dot"/>{l}
                    </div>
                  ))}
                </div>
                <div className="lp-mock-content">
                  <div className="lp-mock-cards-row">
                    {[
                      { label: 'Following', val: '842', c: '#C13584' },
                      { label: 'Followers', val: '619', c: '#3B82F6' },
                      { label: 'Non-Followers', val: '223', c: '#EF4444' },
                      { label: 'DM Messages', val: '1,420', c: '#833AB4' },
                    ].map((kpi, i) => (
                      <div key={i} className="lp-mock-kpi" style={{ borderTopColor: kpi.c }}>
                        <div className="lp-mock-kpi-val" style={{ color: kpi.c }}>{kpi.val}</div>
                        <div className="lp-mock-kpi-label">{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="lp-mock-chart-row">
                    <svg viewBox="0 0 80 80" width="68" height="68" style={{ flexShrink: 0 }}>
                      <circle cx="40" cy="40" r="28" fill="none" stroke="#F4F5F7" strokeWidth="13"/>
                      <circle cx="40" cy="40" r="28" fill="none" stroke="#C13584" strokeWidth="13" strokeDasharray="70 106" strokeDashoffset="0" strokeLinecap="round"/>
                      <circle cx="40" cy="40" r="28" fill="none" stroke="#3B82F6" strokeWidth="13" strokeDasharray="46 130" strokeDashoffset="-70" strokeLinecap="round"/>
                      <circle cx="40" cy="40" r="28" fill="none" stroke="#EF4444" strokeWidth="13" strokeDasharray="28 148" strokeDashoffset="-116" strokeLinecap="round"/>
                    </svg>
                    <div className="lp-mock-bars">
                      {[72,45,85,60,55,78,40].map((h, i) => (
                        <div key={i} className="lp-mock-bar-col">
                          <div className="lp-mock-bar" style={{ height: `${h}%`, background: `hsl(${325 + i * 6}, 65%, ${54 + i * 3}%)` }}/>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="lp-mock-list">
                    {[
                      { u: 'ghost_account_99', tag: 'Non-follower', c: '#EF4444', bg: '#FEF2F2' },
                      { u: 'alex_perez', tag: '1,420 msgs · DM Viewer', c: '#833AB4', bg: '#FDF0F8' },
                      { u: 'mutual_friend_01', tag: 'Mutual', c: '#C13584', bg: '#FDF0F8' },
                    ].map((row, i) => (
                      <div key={i} className="lp-mock-list-row">
                        <div className="lp-mock-avatar" style={{ background: `hsl(${320 + i * 30}, 60%, 50%)` }}>
                          {row.u[0].toUpperCase()}
                        </div>
                        <div className="lp-mock-username">@{row.u}</div>
                        <div className="lp-mock-tag" style={{ color: row.c, background: row.bg }}>{row.tag}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className={`lp-stats-bar ${heroVis ? 'lp-visible' : ''}`} style={{ transitionDelay: '300ms' }}>
          {[
            { v: '100%', l: 'Browser Privacy' },
            { v: 'DM Viewer', l: 'Chats, Audio & Reels' },
            { v: 'Non-Followers', l: 'Track Unfollowers' },
            { v: '0 Server Uploads', l: 'Runs Entirely Locally' },
          ].map((s, i) => (
            <div key={i} className="lp-stat-block">
              {i > 0 && <div className="lp-stat-divider"/>}
              <span className="lp-stat-value">{s.v}</span>
              <span className="lp-stat-label">{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section lp-section-alt" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <div className="lp-section-eyebrow">Features</div>
            <h2 className="lp-section-headline">
              Private Instagram <span className="lp-gradient-text">Insights.</span>
            </h2>
            <p className="lp-section-sub">
              Everything runs locally on your device without passwords or server uploads.
            </p>
          </div>
          <div className="lp-features-grid">
            <FeatureCard delay={0}   icon={<IcUsers size={19}/>}    title="Non-Followers"  desc="See who you follow that doesn't follow you back." badge="Popular"/>
            <FeatureCard delay={60}  icon={<IcMessage size={19}/>} title="DM Chat Viewer" desc="Read chat history, listen to voice notes & view shared reels." badge="New"/>
            <FeatureCard delay={120} icon={<IcBarChart size={19}/>} title="Chat Insights" desc="Track peak messaging hours, reply speeds, and top emojis."/>
            <FeatureCard delay={180} icon={<IcClock size={19}/>}    title="Unfollower Snapshots" desc="Save follower lists to track unfollowers over time." badge="Snapshot"/>
            <FeatureCard delay={240} icon={<IcShield size={19}/>}   title="Privacy Audit" desc="Review 2FA status and synced phonebook contacts."/>
            <FeatureCard delay={300} icon={<IcLock size={19}/>}     title="100% Private" desc="Your data is parsed locally and never leaves your browser."/>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section" id="how">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <div className="lp-section-eyebrow">How It Works</div>
            <h2 className="lp-section-headline">
              3 Simple <span className="lp-gradient-text">Steps.</span>
            </h2>
          </div>
          <div className="lp-steps-grid">
            <StepCard num="01" title="Download Data" desc="Request your JSON data export from Instagram Settings." delay={0}/>
            <StepCard num="02" title="Upload ZIP" desc="Drop your downloaded ZIP file directly into Peeksta." delay={100}/>
            <StepCard num="03" title="Explore Insights" desc="Browse chat history, voice notes, and non-followers." delay={200}/>
          </div>
          <div className="lp-how-cta">
            <button className="lp-btn-hero-primary" onClick={() => onEnter()}><IcArrow size={16}/> Launch App</button>
            <button className="lp-btn-hero-ghost" onClick={onDemo}>Explore Demo</button>
          </div>
        </div>
      </section>

      {/* PRIVACY BANNER */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <div className="lp-privacy-card">
            <div className="lp-privacy-icon"><IcLock size={24}/></div>
            <div className="lp-privacy-text">
              <h3>Your data never leaves your device</h3>
              <p>Peeksta processes your data 100% inside your browser. No logins, no passwords, and zero server uploads.</p>
            </div>
            <div className="lp-privacy-checks">
              {['No login required','No server uploads','100% client-side privacy','Free & open source'].map(c => (
                <div key={c} className="lp-privacy-check">
                  <span className="lp-check-icon"><IcCheck size={12}/></span>{c}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lp-final-cta">
        <div className="lp-final-orb lp-final-orb-l"/>
        <div className="lp-final-orb lp-final-orb-r"/>
        <div className="lp-section-inner" style={{ position: 'relative', zIndex: 1 }}>
          <div className="lp-hero-badge" style={{ justifyContent: 'center' }}>
            <span className="lp-hero-badge-dot"/><span>100% Free · No Sign-Up</span>
          </div>
          <h2 className="lp-final-headline">
            Ready to Explore Your Data?
          </h2>
          <div className="lp-hero-ctas" style={{ justifyContent: 'center' }}>
            <button className="lp-btn-hero-primary" onClick={() => onEnter()}><IcArrow size={17}/> Launch App</button>
            <button className="lp-btn-hero-ghost" onClick={onDemo}>Try Demo Mode</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-nav-brand">
            <div className="lp-nav-gem"><PeekstaLogo size={15}/></div>
            <span className="lp-nav-name" style={{ fontSize: '14px' }}>Peeksta</span>
          </div>
          <div className="lp-footer-links">
            <a href="https://github.com/abhijeetbafna/instalens" target="_blank" rel="noreferrer" className="lp-footer-link"><IcGithub size={14}/> GitHub</a>
            <button className="lp-footer-link-btn" onClick={onDemo}>Demo</button>
            <button className="lp-footer-link-btn" onClick={() => onEnter()}>Launch App</button>
          </div>
          <p className="lp-footer-copy">© 2024 Peeksta · Client-side only · No data collected</p>
        </div>
      </footer>
    </div>
  );
}

