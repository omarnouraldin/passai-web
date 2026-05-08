export default function LandingPage({ onTryFree, onOpenAuth, isJapanese }) {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-badge">PassAI</div>
        <h1>Turn your class notes into summaries, flashcards, and quizzes.</h1>
        <p>
          {isJapanese
            ? 'ノート、PDF、DOCX、画像をすばやく学習素材に変換。留学生にもやさしい、シンプルな学習アプリです。'
            : 'Upload notes, PDFs, DOCX, or images and get simple study material in seconds.'}
        </p>
        <div className="landing-cta-row">
          <button className="btn btn-primary landing-cta" onClick={onTryFree}>
            Try PassAI Free
          </button>
          <button className="btn btn-ghost landing-secondary" onClick={onOpenAuth}>
            Sign in / Sign up
          </button>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <h2>Why students use PassAI</h2>
          <p>{isJapanese ? '日本の大学生や留学生向けに、わかりやすさを重視しています。' : 'Built for quick revision and mobile-first study sessions.'}</p>
        </div>
        <div className="benefits-grid">
          <article className="benefit-card">
            <span className="benefit-icon">1</span>
            <h3>Upload anything</h3>
            <p>Notes, PDFs, DOCX, or images all work in one flow.</p>
          </article>
          <article className="benefit-card">
            <span className="benefit-icon">2</span>
            <h3>Easy summaries</h3>
            <p>Simple explanations with furigana support for Japanese study.</p>
          </article>
          <article className="benefit-card">
            <span className="benefit-icon">3</span>
            <h3>Practice fast</h3>
            <p>Study with flashcards and quizzes without extra setup.</p>
          </article>
        </div>
      </section>

      <section className="landing-section mockup-section">
        <div className="section-heading">
          <h2>Preview the study flow</h2>
          <p>Clean, quick, and built for phone screens.</p>
        </div>
        <div className="mockup-card">
          <div className="mockup-header">
            <span className="mockup-dot" />
            <span className="mockup-dot" />
            <span className="mockup-dot" />
          </div>
          <div className="mockup-body">
            <div className="mockup-title">Weekly lecture notes</div>
            <div className="mockup-line long" />
            <div className="mockup-line" />
            <div className="mockup-line short" />
            <div className="mockup-pill-row">
              <span className="mockup-pill">Summary</span>
              <span className="mockup-pill">Flashcards</span>
              <span className="mockup-pill">Quiz</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <h2>Free vs Pro</h2>
          <p>Start free, upgrade later if you want more power.</p>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card">
            <div className="pricing-label">Free</div>
            <div className="pricing-value">5 generations/month</div>
            <ul>
              <li>Good for trying the app</li>
              <li>Study summaries and flashcards</li>
              <li>Mobile-friendly study sessions</li>
            </ul>
          </article>
          <article className="pricing-card featured">
            <div className="pricing-label">Pro</div>
            <div className="pricing-value">Higher limit</div>
            <ul>
              <li>Better model quality</li>
              <li>Exam mode</li>
              <li>More room for heavy study use</li>
            </ul>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <a href="#" onClick={e => e.preventDefault()}>Privacy</a>
        <a href="#" onClick={e => e.preventDefault()}>Terms</a>
        <a href="mailto:hello@passai.app">Contact</a>
      </footer>
    </div>
  );
}
