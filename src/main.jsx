import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as countryCodes from 'country-codes-list';
import { getEmailError } from '../supabase/functions/_shared/validation.js';
import {
  ArrowRight, ChevronLeft, ChevronRight, Menu, X, MessageCircle, Globe2, Clock3,
  Laptop, CheckCircle2, ChevronDown, Mail
} from 'lucide-react';
import './styles.css';

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
const countries = [...countryCodes.all()].sort((a, b) => a.countryNameEn.localeCompare(b.countryNameEn));

function Brand() {
  return <a className="brand" href="#home" aria-label="OPENCHAT home">
    <span className="brand-mark"><MessageCircle size={22}/><span/></span>
    <span className="brand-name"><b>OPENCHAT</b></span>
  </a>;
}

const trustedBrands = [
  { name: 'Cloudworkers', image: '/trusted-by/cloudworkers.png' },
  { name: 'Textings to Earn', image: '/trusted-by/textings-to-earn.jpg' },
  { name: 'Cloudworkers social', image: '/trusted-by/cloudworkers-social.jpg' },
  { name: 'ModSquad', image: '/trusted-by/modsquad.jpg' },
  { name: 'Texting Factory', image: '/trusted-by/texting-factory.jpg' },
  { name: 'LMS', image: '/trusted-by/lms.png' },
  { name: 'Remotely4u', image: '/trusted-by/remotely4u.png' },
  { name: 'Chat Moderators', image: '/trusted-by/chat-moderators.png' }
];

function TrustedByCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % trustedBrands.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const showSlide = (index) => setActiveIndex((index + trustedBrands.length) % trustedBrands.length);
  const brand = trustedBrands[activeIndex];

  return <section
    className="trusted-carousel"
    aria-label="Trusted by"
    aria-roledescription="carousel"
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
    }}
  >
    <h2>Trusted by:</h2>
    <div className="trusted-slide" aria-live="polite">
      <img key={brand.image} src={brand.image} alt={brand.name} />
    </div>
    <div className="trusted-controls">
      <button className="trusted-arrow" type="button" aria-label="Previous logo" onClick={() => showSlide(activeIndex - 1)}><ChevronLeft size={19}/></button>
      <div className="trusted-dots" aria-label="Choose a logo">
        {trustedBrands.map((item, index) => <button
          key={item.image}
          type="button"
          className={index === activeIndex ? 'trusted-dot active' : 'trusted-dot'}
          aria-label={`Show ${item.name}`}
          aria-pressed={index === activeIndex}
          onClick={() => showSlide(index)}
        />)}
      </div>
      <button className="trusted-arrow" type="button" aria-label="Next logo" onClick={() => showSlide(activeIndex + 1)}><ChevronRight size={19}/></button>
    </div>
  </section>;
}

function PolicyPage({ type }) {
  const isTerms = type === 'terms';
  useEffect(() => {
    document.title = `${isTerms ? 'Terms of Use' : 'Privacy Policy'} | OPENCHAT`;
  }, [isTerms]);

  return <div className="policy-page">
    <header className="header">
      <div className="nav container">
        <a className="brand" href="/" aria-label="OPENCHAT home">
          <span className="brand-mark"><MessageCircle size={22}/></span>
          <span className="brand-name"><b>OPENCHAT</b></span>
        </a>
        <a className="btn btn-primary" href="/">Back to OPENCHAT</a>
      </div>
    </header>
    <main>
      <section className="legal section">
        <div className="container legal-content">
          <h1>{isTerms ? 'Terms of Use' : 'Privacy Policy'}</h1>
          {isTerms ? <article className="legal-document">
            <p><b>Last updated: 10 November 2026</b></p>
            <h2>1. About these terms</h2>
            <p>These Terms of Use apply to your access to and use of the OpenChats website. “OpenChats”, “we”, “us” and “our” refer to the operator of this website. The operator’s full legal name and contact details must be published here before these terms are treated as final. By using the website, you agree to these terms. If you do not agree, please do not use it.</p>
            <h2>2. What OpenChats does</h2>
            <p>OpenChats provides information about a potential remote chat-operator opportunity and a way to express interest. OpenChats is an independent candidate-sourcing service. It is not Texting Factory, is not employed by or officially affiliated with Texting Factory, and is not authorised to represent it. We do not make hiring decisions on behalf of another company.</p>
            <h2>3. Eligibility and accurate information</h2>
            <p>You must be at least 18 years old to use the application form. You are responsible for providing information that is accurate and for updating it if it changes. Do not submit another person’s information without their permission. The form requests your own identity document solely to verify your age. Do not provide payment-card or banking details, passwords, health information or other unrelated sensitive information through this website.</p>
            <h2>4. Expressions of interest and third-party decisions</h2>
            <p>Submitting the website form is an expression of interest only. It is not an official application to Texting Factory or another company, an offer of work, an employment relationship, or a promise of acceptance, placement, hours or income. Any later application, assessment, contract and hiring decision is made by the relevant company under its own process and terms. You should review and agree to those terms directly with that company before proceeding.</p>
            <h2>5. Opportunity and earnings information</h2>
            <p>Role descriptions and eligibility information are general information and may change. The displayed estimate of R4,000–R6,000 per week is not a promise or guarantee; actual earnings may be lower or higher and depend on factors and terms set by the relevant company. Verify current rates, payment conditions, eligibility, availability and the nature of the work directly through the company’s official process. Do not make financial decisions based solely on this website.</p>
            <h2>6. Acceptable use</h2>
            <p>Use the website lawfully and do not attempt to disrupt, damage, gain unauthorised access to, or interfere with the website or another person’s use of it. Do not use the website to submit fraudulent, unlawful, abusive or misleading material, or to impersonate another person.</p>
            <h2>7. Website content and external services</h2>
            <p>Website text, branding and design are provided for general information. You may not reproduce or commercially exploit them without permission, except where applicable law allows. The website may refer to or link to third-party services. Those services are controlled by their respective providers; OpenChats does not control their content, terms or privacy practices, and a reference does not imply endorsement.</p>
            <h2>8. Availability, disclaimers and liability</h2>
            <p>We try to keep the website information current, but do not warrant that it is complete, uninterrupted or error-free. Nothing in these terms excludes or limits a right or liability that cannot lawfully be excluded or limited. To the extent permitted by law, OpenChats is not responsible for indirect loss arising from reliance on general website information or a third party’s recruitment, platform or hiring decisions.</p>
            <h2>9. Changes, law and contact</h2>
            <p>We may update the website or these terms. The current version and its update date will be posted here. The governing law and dispute process must be confirmed and completed by the operator before publication. For questions or complaints, contact <b>[insert the operator’s official email and postal address before launch]</b>.</p>
          </article> : <article className="legal-document">
            <p><b>Last updated: 10 November 2026</b></p>
            <h2>1. Who is responsible for personal information?</h2>
            <p>The website operator is responsible for deciding how personal information is handled. The operator’s legal name, address and privacy contact have not yet been provided and must be added before collecting applications. In South Africa, this policy is intended to support transparency under POPIA; other laws may also apply depending on where you live and how the service operates.</p>
            <h2>2. Application intake status</h2>
            <p>Application collection is currently disabled until the operator configures and verifies the secure intake service, private file storage, access controls and deletion schedule. Do not send personal information or documents unless the site clearly states that secure collection is active.</p>
            <p>When hosted, the hosting provider may process technical connection information in service or security logs. The site requests typefaces from Google Fonts. If application intake is enabled, Supabase will process application data and store documents in a private bucket in the project’s West EU (Ireland, eu-west-1) region, and Cloudflare Turnstile will process anti-abuse verification data. The intake service limits submissions to five per hour for a normalized email address using an HMAC-SHA256 digest; the rate-limit table does not store raw email addresses or client IP addresses. This is not IP-based protection and can be circumvented by using multiple email addresses. Rate-limit record retention has not yet been confirmed and must be specified before collection begins. The operator must publish the actual providers, privacy contact and applicable transfer safeguards before collection begins.</p>
            <h2>3. Information planned for a live application</h2>
            <p>If enabled, the application service collects your name, email address, country of residence, phone and WhatsApp numbers, an identity document (national ID, driver’s licence or passport) solely to verify age, age confirmation, an optional CV file, and required acknowledgements. An identity document contains sensitive personal information; a CV may include employment history, education and contact details. The retention period and deletion process must be confirmed, configured and tested before collection begins. Collection must remain disabled until the operator verifies necessity and lawful basis, provides clear notice, and tests secure upload, restricted access, region and deletion settings.</p>
            <h2>4. Purposes and lawful grounds</h2>
            <p>Once live, information should only be used for stated purposes such as reviewing an expression of interest, contacting you about it, preventing misuse, and meeting legal obligations. Before launch, the operator must document the lawful ground for each purpose (for example, your valid consent or steps taken at your request) and must not rely on consent that is unclear or bundled with unrelated purposes.</p>
            <h2>5. Sharing and international transfers</h2>
            <p>Personal information should be accessible only to authorised people and service providers who need it to operate the service, protect it or meet legal obligations. It must not be sent to Texting Factory or another potential employer unless the operator has established an appropriate lawful basis and given you clear notice; obtain consent where required. The operator must identify recipients, hosting locations and any cross-border transfers, and ensure the safeguards required by applicable law.</p>
            <h2>6. Retention and security</h2>
            <p>The operator must establish and publish a clear retention period for applicant records and documents before collection begins. Automatic deletion has not yet been configured or verified. Information must be retained only for as long as necessary for its stated purpose or a legal requirement. Appropriate safeguards should protect information against unauthorised access, loss, alteration or disclosure. No online transmission or storage method can be guaranteed completely secure.</p>
            <h2>7. Your choices and rights</h2>
            <p>Depending on applicable law, you may have the right to request access to or correction or deletion of your personal information, object to or restrict certain processing, withdraw consent where processing relies on consent, and complain to a privacy regulator. Withdrawal does not affect processing already lawfully carried out. To exercise a right, contact <b>[insert the operator’s privacy email and postal address before launch]</b>. We may need to verify your identity and explain if a legal exception applies.</p>
            <h2>8. Cookies, age and policy changes</h2>
            <p>The operator must confirm whether hosting or third-party services use cookies or similar technologies and disclose them before launch. This opportunity is intended for adults; the website is not intended for anyone under 18, and an underage person should not submit an application. We may update this policy when practices or legal requirements change; the revised policy will show its new update date.</p>
            <h2>9. Complaints and regulator</h2>
            <p>Please contact the operator first using the privacy contact details to be added above. Where applicable, people in South Africa may also raise a complaint with the Information Regulator; people elsewhere may contact their local data-protection authority.</p>
          </article>}
        </div>
      </section>
    </main>
  </div>;
}

function App() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const collectionEnabled = import.meta.env.VITE_APPLICATIONS_ENABLED === 'true'
    && Boolean(supabaseUrl && supabaseAnonKey && turnstileSiteKey);

  const turnstileTestMode = import.meta.env.VITE_TURNSTILE_TEST_MODE === 'true'
    && Boolean(turnstileSiteKey);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState('');
  const turnstileContainer = useRef(null);
  const turnstileWidgetId = useRef(null);
  const [cvFileName, setCvFileName] = useState('');
  const [cvError, setCvError] = useState('');
  const [idFileName, setIdFileName] = useState('');
  const [idError, setIdError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [faqOpen, setFaqOpen] = useState(0);
  const [form, setForm] = useState({ fullName: '', email: '', country: '', phone: '', whatsapp: '', age: '', consent: false, adult: false });
  const selectedCountry = countries.find(country => country.countryCode === form.country);
  const callingCode = selectedCountry ? `+${selectedCountry.countryCallingCode}` : '';

  useEffect(() => {
  if ((!collectionEnabled && !turnstileTestMode) || submitted) return undefined;

    let active = true;
    const renderWidget = () => {
      if (!active || !turnstileContainer.current || !window.turnstile || turnstileWidgetId.current !== null) return;
      turnstileWidgetId.current = window.turnstile.render(turnstileContainer.current, {
        sitekey: turnstileSiteKey,
        callback: token => {
          setTurnstileToken(token);
          setTurnstileError('');
        },
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => {
          setTurnstileToken('');
          setTurnstileError('Verification is unavailable. Please refresh the page and try again.');
        }
      });
    };

    let script = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const handleScriptError = () => setTurnstileError('Verification is unavailable. Please refresh the page and try again.');
    script.addEventListener('load', renderWidget);
    script.addEventListener('error', handleScriptError);
    renderWidget();

    return () => {
      active = false;
      script.removeEventListener('load', renderWidget);
      script.removeEventListener('error', handleScriptError);
      if (turnstileWidgetId.current !== null && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [collectionEnabled, submitted, turnstileSiteKey]);

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCountryChange = (e) => {
    update(e);
  };

  const handleEmailChange = (e) => {
    update(e);
    e.currentTarget.setCustomValidity('');
    setEmailError('');
  };

  const validateEmail = (input) => {
    const error = getEmailError(input.value);
    setEmailError(error);
    input.setCustomValidity(error);
    return error;
  };

  const handleCvChange = (e) => {
    const file = e.target.files?.[0];
    setCvError('');
    if (!file) {
      setCvFileName('');
      return;
    }

    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(extension)) {
      e.target.value = '';
      setCvFileName('');
      setCvError('Choose a PDF or Word document.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      e.target.value = '';
      setCvFileName('');
      setCvError('The CV must be 5 MB or smaller.');
      return;
    }

    setCvFileName(file.name);
  };

  const handleIdChange = (e) => {
    const file = e.target.files?.[0];
    setIdError('');
    if (!file) {
      setIdFileName('');
      return;
    }

    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(extension)) {
      e.target.value = '';
      setIdFileName('');
      setIdError('Choose a PDF, JPG or PNG document.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      e.target.value = '';
      setIdFileName('');
      setIdError('The ID document must be 5 MB or smaller.');
      return;
    }

    setIdFileName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailInput = e.currentTarget.querySelector('[name="email"]');
    const emailValidationError = validateEmail(emailInput);
    if (emailValidationError) {
      e.currentTarget.reportValidity();
      return;
    }
    setSubmissionError('');
    if (!collectionEnabled) {
      setSubmissionError('Applications are temporarily unavailable. Please check back soon.');
      return;
    }
    if (!turnstileToken) {
      setTurnstileError('Complete the verification before submitting.');
      return;
    }

    const payload = new FormData(e.currentTarget);
    payload.set('cf-turnstile-response', turnstileToken);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/submit-application`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        },
        body: payload
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || 'We could not submit your application securely. Please try again later.');
      }
      setSubmitted(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'We could not submit your application securely. Please try again later.');
      setTurnstileToken('');
      if (turnstileWidgetId.current !== null && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nav = [ ['Opportunity','opportunity'], ['Requirements','requirements'], ['Contact','contact'] ];
  const faqs = [
    ['Is this a conventional customer-service role?', 'No. The opportunity described here involves adult-oriented chat services. Please read the description carefully and only continue if you are comfortable with the nature of the work.'],
    ['Can people outside South Africa register?', 'The website is open to South African and international visitors. However, availability and eligibility may depend on the official company’s country restrictions and requirements.'],
    ['Do I need experience?', 'The company’s public information has indicated that previous experience may not be required. Final requirements are set by the company and can change, so they must be checked during its official application process.']
  ];

  const policy = new URLSearchParams(window.location.search).get('policy');
  if (policy === 'terms' || policy === 'privacy') return <PolicyPage type={policy}/>;

  return <>
    <header className="header">
      <div className="nav container">
        <Brand/>
        <nav id="site-navigation" className={menuOpen ? 'nav-links open' : 'nav-links'}>
          {nav.map(([label,id]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
        </nav>
        <button className="btn btn-primary nav-cta" onClick={() => { scrollTo('register'); setMenuOpen(false); }}>Apply <ArrowRight size={16}/></button>
        <button className="menu-btn" type="button" aria-label="Toggle menu" aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
      </div>
    </header>

    <main>
      <section className="hero" id="home">
        <div className="container hero-layout">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot"/> REMOTE COMMUNICATION OPPORTUNITIES</div>
            <h1>Your next opportunity<br/>could start with a <em>hello.</em></h1>
            <p className="hero-text">Explore remote chat-based work, understand what it involves, and take the first step by applying with OpenChats.</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-large" onClick={() => scrollTo('register')}>Apply <ArrowRight size={18}/></button>
              <button className="btn btn-light btn-large" onClick={() => scrollTo('opportunity')}>Explore the opportunity</button>
            </div>
          </div>
          <div className="hero-visual"><TrustedByCarousel/></div>
        </div>
      </section>

      <section className="opportunity section" id="opportunity">
        <div className="container">
          <div className="opportunity-card">
            <div className="opportunity-main">
              <div className="role-icon"><MessageCircle size={26}/></div>
              <div className="role-kicker">FEATURED OPPORTUNITY</div>
              <h3>Remote Chat Operator</h3>
              <p className="role-summary">A freelance, remote role involving written conversations on an online chat platform.</p>
              <div className="role-tags"><span><Globe2 size={15}/> Remote</span><span><Clock3 size={15}/> Flexible scheduling described</span><span><Laptop size={15}/> Internet-enabled device</span></div>
              <button className="btn btn-primary" onClick={() => scrollTo('register')}>Apply <ArrowRight size={16}/></button>
            </div>
            <div className="opportunity-side">
              <h4>What the work involves</h4>
              <p>Responding to messages on an online chat platform while following its rules and communication guidelines.</p>
              <div className="side-rule"/>
              <h4>Potential earnings</h4>
              <p><b>R4,000–R6,000 per week (estimated).</b> Actual earnings vary and are not guaranteed. Confirm current rates and conditions through the official application process.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="training-model section">
        <div className="container training-model-content">
          <div className="eyebrow blue-eyebrow">TRAINING-LED, REMOTE-READY</div>
          <h2>In-person training.<br/><em>A remote workforce.</em></h2>
          <p>Some opportunities combine comprehensive training at dedicated centres with the flexibility of working remotely from home. Training may be available in South Africa and internationally. Once trained, operators support live chat moderation and engagement for international platforms. This model brings structured preparation and quality standards together with a distributed workforce, helping provide consistent service and dependable coverage.</p>
          <p className="training-model-note">Training locations, availability and working arrangements vary by opportunity and provider. Confirm the current details through the relevant company’s official application process.</p>
        </div>
      </section>

      <section className="register section" id="register">
        <div className="container register-grid">
          <div className="register-copy"><div className="eyebrow">YOUR FIRST STEP</div><h2>Let’s start with<br/><em>your application.</em></h2></div>
          <div className="form-card">
            {! collectionEnabled && !turnstileTestMode ? <div className="success-state" role="status"><h3>Applications temporarily unavailable</h3><p>We’re preparing our secure application service. Please check back soon.</p></div> : submitted ? <div className="success-state"><span className="success-icon"><CheckCircle2 size={34}/></span><h3>Expression of interest received</h3><p>Your expression of interest has been submitted securely. This is not an official job application or a guarantee of work.</p><button className="btn btn-outline" onClick={() => { setSubmitted(false); setTurnstileToken(''); if (turnstileWidgetId.current !== null && window.turnstile) window.turnstile.reset(turnstileWidgetId.current); }}>Back to form</button></div> : <>
              <div className="form-title"><div><h3>Application details</h3><p>Fields marked with * are required.</p></div><span className="form-badge">CANDIDATE FORM</span></div>
              <form onSubmit={handleSubmit}>
                <label>Full name *<input name="fullName" value={form.fullName} onChange={update} placeholder="Your full name" autoComplete="name" required/></label>
                <div className="field-row"><label>Email address *<input name="email" type="email" value={form.email} onChange={handleEmailChange} onBlur={(e) => validateEmail(e.currentTarget)} placeholder="you@example.com" autoComplete="email" aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'email-error' : undefined} required/>{emailError && <span id="email-error" className="cv-upload-error" role="alert">{emailError}</span>}</label><label>Country of residence *<select name="country" value={form.country} onChange={handleCountryChange} required><option value="">Select a country</option>{countries.map(country => <option key={country.countryCode} value={country.countryCode}>{country.countryNameEn}</option>)}</select></label></div>
                <input type="hidden" name="phoneCountryCallingCode" value={callingCode}/>
                <label>Phone number<span className={callingCode ? 'phone-input-row has-country-code' : 'phone-input-row'}>{callingCode && <span className="phone-country-code" aria-label={`Calling code ${callingCode}`}>{callingCode}</span>}<input name="phone" type="tel" value={form.phone} onChange={update} placeholder="Enter phone number" autoComplete="tel-national"/></span></label>
                <label>WhatsApp number<span className={callingCode ? 'phone-input-row has-country-code' : 'phone-input-row'}>{callingCode && <span className="phone-country-code" aria-label={`Calling code ${callingCode}`}>{callingCode}</span>}<input name="whatsapp" type="tel" value={form.whatsapp} onChange={update} placeholder="Enter WhatsApp number" autoComplete="tel-national"/></span></label>
                <label>Are you 18 or older? *<select name="age" value={form.age} onChange={(e) => { update(e); e.currentTarget.setCustomValidity(e.target.value === 'yes' ? '' : 'You must be 18 or older to apply.'); }} required><option value="">Choose an answer</option><option value="yes">Yes</option><option value="no">No</option></select></label>
                <div className="cv-upload-field">
                  <label htmlFor="id-upload">Upload your ID *</label>
                  <input id="id-upload" name="idFile" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={handleIdChange} required/>
                  <p className="cv-upload-help">National ID, driver’s licence or passport. PDF, JPG or PNG, up to 5 MB.</p>
                  {idFileName && <p className="cv-file-name">Selected: {idFileName}</p>}
                  {idError && <p className="cv-upload-error" role="alert">{idError}</p>}
                </div>
                <div className="cv-upload-field">
                  <label htmlFor="cv-upload">Upload your CV</label>
                  <input id="cv-upload" name="cvFile" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleCvChange}/>
                  <p className="cv-upload-help">PDF or Word document, up to 5 MB.</p>
                  {cvFileName && <p className="cv-file-name">Selected: {cvFileName}</p>}
                  {cvError && <p className="cv-upload-error" role="alert">{cvError}</p>}
                </div>
                <div className="consents"><label className="checkbox-label"><input type="checkbox" name="adult" checked={form.adult} onChange={update} required/><span>I understand this opportunity involves adult-oriented chat services and confirm that I am 18 or older. *</span></label><label className="checkbox-label"><input type="checkbox" name="consent" checked={form.consent} onChange={update} required/><span>I agree that OpenChats may contact me about this expression of interest. I have read the <a href="/?policy=privacy" target="_blank" rel="noreferrer">Privacy Policy</a>. *</span></label></div>
                {(collectionEnabled || turnstileTestMode) && (
  <div className="turnstile-field">
    <div ref={turnstileContainer}/>
    {turnstileError && (
      <p className="cv-upload-error" role="alert">
        {turnstileError}
      </p>
    )}
  </div>
)}
                {submissionError && <p className="submission-error" role="alert">{submissionError}</p>}
                <button className="btn btn-primary submit-btn" type="submit" disabled={isSubmitting || !turnstileToken}>{isSubmitting ? 'Submitting securely…' : 'Submit application'} <ArrowRight size={17}/></button>
                <p className="form-footnote">Upload only your own ID document for age verification. Do not provide banking details, passwords, health information or unrelated sensitive information.</p>
              </form>
            </>}
          </div>
        </div>
      </section>

      <section className="requirements section" id="requirements">
        <div className="container requirements-grid">
          <div><div className="eyebrow blue-eyebrow">BEFORE YOU APPLY</div><h2>Is this opportunity<br/><em>right for you?</em></h2><p className="requirements-lead">Review the general points below before applying. The official company sets the final eligibility rules.</p><button className="btn btn-primary" onClick={() => scrollTo('register')}>Apply <ArrowRight size={16}/></button></div>
          <div className="requirements-list">
            {[
              ['18 years or older','The opportunity is intended for adults only.'],
              ['Confident written English','You should be comfortable reading and writing messages in English.'],
              ['Reliable internet access','A stable connection is important for online work.'],
              ['A suitable device','Access to a computer or another device accepted by the official platform.'],
              ['Comfort with the work type','Understand that this opportunity involves adult-oriented chat services.']
            ].map(([title,desc])=><div className="requirement" key={title}><span className="check-icon"><CheckCircle2 size={19}/></span><div><b>{title}</b><p>{desc}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="faq section">
        <div className="container faq-grid"><div><div className="eyebrow blue-eyebrow">GOOD TO KNOW</div><h2>Questions, <em>answered.</em></h2></div><div className="faq-list">{faqs.map(([q,a],i)=><div className={`faq-item ${faqOpen===i?'active':''}`} key={q}><button onClick={() => setFaqOpen(faqOpen===i?-1:i)}><span>{q}</span><ChevronDown size={18}/></button>{faqOpen===i&&<p>{a}</p>}</div>)}</div></div>
      </section>

      <section className="contact section" id="contact"><div className="container contact-inner"><div className="contact-icon"><Mail size={24}/></div><div><div className="eyebrow blue-eyebrow">WE’RE HERE TO HELP</div><h2>Have a question?</h2><p>For questions about OpenChats or this website, contact our team once the official business contact details have been added.</p></div><span className="contact-placeholder">Official business contact details will be added before launch.</span></div></section>

    </main>

    <footer className="footer"><div className="container"><div className="footer-main"><div><Brand/><p>Connecting Talent. Creating Opportunities.</p></div><div className="footer-links"><a href="#opportunity">Opportunity</a><a href="#requirements">Requirements</a><a href="/?policy=terms" target="_blank" rel="noreferrer">Terms of Use</a><a href="/?policy=privacy" target="_blank" rel="noreferrer">Privacy Policy</a></div><button className="footer-top" onClick={() => scrollTo('home')}>Back to top ↑</button></div>    <div className="footer-bottom"><span>© {new Date().getFullYear()} OPENCHAT. All rights reserved.</span><span>Independent candidate-sourcing service · Not an official Texting Factory representative.</span></div></div></footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
