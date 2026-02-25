import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const features = [
  { icon: '🛡️', title: '3-Tier Verification', desc: 'Auto, document, and portfolio checks ensure only trusted companies join the marketplace.', color: '#0d6efd', bg: '#e8f1ff' },
  { icon: '🤖', title: 'AI-Powered Matching', desc: 'Our ML ranking engine surfaces the best-fit companies by skill, trust, and delivery record.', color: '#7c3aed', bg: '#f3f0ff' },
  { icon: '📊', title: 'Transparent Ranking', desc: 'See exactly why a company ranks — match score, trust level, and past performance data.', color: '#059669', bg: '#ecfdf5' },
  { icon: '🔒', title: 'Secure Deal Lock', desc: 'Milestone-based contracts with payment protection and full commission transparency built in.', color: '#dc6c1a', bg: '#fff7ed' },
  { icon: '🤝', title: 'Two-Sided Trust', desc: 'Both clients and companies are rated, ensuring mutual accountability on every project.', color: '#db2777', bg: '#fdf2f8' },
  { icon: '✅', title: 'Quality Assurance', desc: 'Portfolio reviews, delivery scores, and trust badges drive consistent, repeatable quality.', color: '#0891b2', bg: '#ecfeff' },
];

const steps = [
  { num: '01', title: 'Post a Requirement', desc: 'Define your project scope, budget, timeline, and required expertise in minutes.' },
  { num: '02', title: 'Get AI Matches', desc: 'Our engine instantly ranks verified companies by fit score, trust, and past performance.' },
  { num: '03', title: 'Review & Connect', desc: 'Shortlist companies, chat in real-time, review portfolios, and negotiate terms easily.' },
  { num: '04', title: 'Lock & Deliver', desc: 'Lock the deal with milestone contracts, protected payments, and full delivery tracking.' },
];

const plans = [
  { name: 'Basic', price: 'Free', period: '', meta: '5 applications / month', perks: ['Basic company profile', '5 applications/month', 'Standard search listing', 'Email support'], primary: false },
  { name: 'Pro', price: '₹2,999', period: '/mo', meta: '50 applications / month', perks: ['Verified badge', '50 applications/month', 'Priority ranking boost', 'Advanced analytics', 'Chat support'], primary: true, badge: 'Most Popular' },
  { name: 'Premium', price: '₹7,999', period: '/mo', meta: 'Unlimited applications', perks: ['Premium trust badge', 'Unlimited applications', 'Top ranking placement', 'Dedicated account manager', 'API access'], primary: false },
];

const Landing = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp">
      {/* ── Navbar ── */}
      <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-nav-left">
            <div className="lp-logo-mark">M</div>
            <span className="lp-logo-text">MatchFlow</span>
          </div>
          <div className={`lp-nav-links${mobileOpen ? ' lp-nav-links--open' : ''}`}>
            <button onClick={() => scrollTo('features')}>Features</button>
            <button onClick={() => scrollTo('how-it-works')}>How It Works</button>
            <button onClick={() => scrollTo('pricing')}>Pricing</button>
          </div>
          <div className={`lp-nav-right${mobileOpen ? ' lp-nav-right--open' : ''}`}>
            <button className="lp-btn-signin" onClick={() => navigate('/login')}>Sign In</button>
            <button className="lp-btn-get-started" onClick={() => navigate('/get-started')}>Get Started Free</button>
          </div>
          <button className="lp-hamburger" onClick={() => setMobileOpen(o => !o)}>
            <span className={mobileOpen ? 'lp-ham-open' : ''} /><span className={mobileOpen ? 'lp-ham-open' : ''} /><span className={mobileOpen ? 'lp-ham-open' : ''} />
          </button>
        </div>
      </nav>


      {/* ── Hero ── */}
      <header className="lp-hero">
        <div className="lp-hero-bg-dots" />
        <div className="lp-hero-blob lp-hero-blob-1" />
        <div className="lp-hero-blob lp-hero-blob-2" />
        <div className="lp-hero-inner">
          <div className="lp-live-badge">
            <span className="lp-live-dot" />
            Trusted by 2,400+ verified companies
          </div>
          <h1>
            Find the perfect<br />
            <span className="lp-hero-hl">company</span> for every project
          </h1>
          <p className="lp-hero-sub">
            AI-powered B2B marketplace that matches your requirements with verified companies.
            Transparent ranking, secure deals, and trust built in from day one.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-hero-primary" onClick={() => navigate('/get-started')}>
              Post a Requirement
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button className="lp-btn-hero-outline" onClick={() => navigate('/get-started')}>Join as Company</button>
          </div>

          <div className="lp-stats-strip">
            <div className="lp-stat-item"><strong>2,400+</strong><span>Verified Companies</span></div>
            <div className="lp-stat-divider" />
            <div className="lp-stat-item"><strong>₹18Cr+</strong><span>Deals Closed</span></div>
            <div className="lp-stat-divider" />
            <div className="lp-stat-item"><strong>98%</strong><span>Client Satisfaction</span></div>
            <div className="lp-stat-divider" />
            <div className="lp-stat-item"><strong>4.8★</strong><span>Avg Trust Score</span></div>
          </div>
        </div>
      </header>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">Why MatchFlow</p>
          <h2 className="lp-section-title">Built for trust and efficiency</h2>
          <p className="lp-section-sub">Every feature is designed to reduce friction, increase transparency, and deliver quality outcomes.</p>
          <div className="lp-feat-grid">
            {features.map((f, i) => (
              <div className="lp-feat-card" key={i} style={{'--fc': f.color, '--fb': f.bg}}>
                <div className="lp-feat-icon"><span>{f.icon}</span></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="lp-section lp-section--alt" id="how-it-works">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">The Process</p>
          <h2 className="lp-section-title">How it works</h2>
          <p className="lp-section-sub">From requirement to delivery in four simple steps.</p>
          <div className="lp-steps">
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div className="lp-step">
                  <div className="lp-step-bubble">{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
                {i < steps.length - 1 && <div className="lp-step-connector" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="lp-section" id="pricing">
        <div className="lp-section-inner">
          <p className="lp-eyebrow">Pricing Plans</p>
          <h2 className="lp-section-title">Company Plans</h2>
          <p className="lp-section-sub">Start free. Scale as you grow. Only pay when you're ready.</p>
          <div className="lp-plans">
            {plans.map((plan, i) => (
              <div className={`lp-plan-card${plan.primary ? ' lp-plan-card--featured' : ''}`} key={i}>
                {plan.badge && <span className="lp-plan-badge">{plan.badge}</span>}
                <div className="lp-plan-name">{plan.name}</div>
                <div className="lp-plan-price">
                  {plan.price}<small>{plan.period}</small>
                </div>
                <div className="lp-plan-meta">{plan.meta}</div>
                <ul className="lp-plan-perks">
                  {plan.perks.map((perk, j) => (
                    <li key={j}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      {perk}
                    </li>
                  ))}
                </ul>
                <button
                  className={`lp-plan-btn${plan.primary ? ' lp-plan-btn--primary' : ''}`}
                  onClick={() => navigate('/get-started')}
                >
                  {plan.primary ? 'Get Started' : 'Choose Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section className="lp-cta-band">
        <div className="lp-cta-blob lp-cta-blob-1" />
        <div className="lp-cta-blob lp-cta-blob-2" />
        <div className="lp-section-inner lp-cta-inner">
          <h2>Ready to find your perfect match?</h2>
          <p>Join thousands of businesses using MatchFlow to connect, collaborate, and deliver.</p>
          <div className="lp-hero-actions">
            <button className="lp-btn-hero-primary" onClick={() => navigate('/get-started')}>
              Post a Requirement
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button className="lp-btn-cta-ghost" onClick={() => navigate('/get-started')}>Apply as Company</button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-logo-mark lp-logo-mark--sm">M</div>
            <span className="lp-footer-logo-text">MatchFlow</span>
          </div>
          <div className="lp-footer-links">
            <button onClick={() => scrollTo('features')}>About</button>
            <button>Privacy</button>
            <button>Terms</button>
            <button>Contact</button>
          </div>
          <p className="lp-footer-copy">© 2026 MatchFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
