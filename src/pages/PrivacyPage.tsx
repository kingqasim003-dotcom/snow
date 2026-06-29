export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 py-16 relative z-10 prose prose-slate prose-sm">
      <h1 className="text-3xl font-black text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-slate-500 text-sm mb-8">Last updated: June 28, 2026</p>

      <section className="space-y-4 text-slate-700 text-sm leading-relaxed">
        <h2 className="text-lg font-bold text-slate-900">1. Introduction</h2>
        <p>
          SnowBear ("we", "our", "us") operates the SnowBear AI Prompt Companion website and browser extension.
          This Privacy Policy explains how we collect, use, and protect your information.
        </p>

        <h2 className="text-lg font-bold text-slate-900">2. Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> Google account email and profile via Firebase Google Sign-In.</li>
          <li><strong>Usage data:</strong> Prompt optimization history stored locally in your browser.</li>
          <li><strong>Prompt content:</strong> Text you submit for enhancement, compression, grammar, or scoring is sent to our server for processing.</li>
        </ul>

        <h2 className="text-lg font-bold text-slate-900">3. How We Use Your Data</h2>
        <p>We use your data to provide prompt optimization services, authenticate your account, enforce usage limits, and improve service reliability. We do not sell your personal data.</p>

        <h2 className="text-lg font-bold text-slate-900">4. AI Processing</h2>
        <p>
          Prompts are processed server-side using the Groq API. API keys are never exposed to your browser.
          Do not submit sensitive personal information, passwords, or confidential data in prompts.
        </p>

        <h2 className="text-lg font-bold text-slate-900">5. Sign-In Policy</h2>
        <p>
          Authentication is Google-only. You must sign in with a real Google account. Temporary or disposable email addresses are not permitted.
        </p>

        <h2 className="text-lg font-bold text-slate-900">6. Data Storage</h2>
        <p>
          Authentication is handled by Firebase. Prompt history is stored in your browser's local storage unless you enable cloud sync (Pro).
        </p>

        <h2 className="text-lg font-bold text-slate-900">7. Cookies & Local Storage</h2>
        <p>We use browser local storage to save your preferences, usage counts, and prompt history on your device.</p>

        <h2 className="text-lg font-bold text-slate-900">8. Third-Party Services</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Firebase Authentication (Google)</li>
          <li>Groq API for AI inference</li>
        </ul>

        <h2 className="text-lg font-bold text-slate-900">9. Your Rights</h2>
        <p>You may request account deletion by contacting us. You can clear local history anytime from the extension panel.</p>

        <h2 className="text-lg font-bold text-slate-900">10. Contact</h2>
        <p>For privacy questions, contact: <a href="mailto:privacy@snowbear.online" className="text-[#6EC6FF] font-semibold">privacy@snowbear.online</a></p>
      </section>
    </article>
  );
}