import React, { useState, useEffect } from 'react';
import { SiteSettings, getPackageImage } from '../types';
import { getSiteSettings } from '../store';
import { Leaf, ShieldCheck, TrendingUp, Users, Mail, Phone } from 'lucide-react';

const RECENT_INVESTMENTS = [
  { name: "Olamide J.", amount: "₦100,000", package: "Snail Investment", time: "2 mins ago" },
  { name: "Chinedu O.", amount: "₦250,000", package: "Poultry Investment", time: "5 mins ago" },
  { name: "Fatima A.", amount: "₦50,000", package: "Fish Investment", time: "12 mins ago" },
  { name: "Chukwudi E.", amount: "₦500,000", package: "Poultry Investment", time: "15 mins ago" },
  { name: "Grace B.", amount: "₦150,000", package: "Snail Investment", time: "22 mins ago" },
  { name: "Ibrahim M.", amount: "₦300,000", package: "Fish Investment", time: "28 mins ago" },
  { name: "Ngozi U.", amount: "₦1,000,000", package: "Poultry Investment", time: "35 mins ago" },
  { name: "Samuel T.", amount: "₦200,000", package: "Fish Investment", time: "42 mins ago" },
];

interface Props {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export default function Landing({ onOpenAuth }: Props) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [settings, setSettings] = useState<SiteSettings>(getSiteSettings());

  useEffect(() => {
    // Optionally update settings if they change
    const updateSettings = () => setSettings(getSiteSettings());
    window.addEventListener('storage', updateSettings);
    return () => window.removeEventListener('storage', updateSettings);
  }, []);

  const scrollTo = (id: string) => {
    setIsNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white">
      
      {/* Navigation */}
      <nav className="fixed w-full z-40 bg-black/90 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              <div className="w-10 h-10 bg-red-600 flex items-center justify-center rounded">
                <Leaf className="text-white w-6 h-6" />
              </div>
              <div className="font-bold text-xl tracking-wider uppercase">
                <span className="text-white">ZARU</span>
                <span className="text-red-600">.</span>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo('home')} className="text-sm font-medium hover:text-red-600 transition-colors">HOME</button>
              <button onClick={() => scrollTo('about')} className="text-sm font-medium hover:text-red-600 transition-colors">ABOUT</button>
              <button onClick={() => scrollTo('vision')} className="text-sm font-medium hover:text-red-600 transition-colors">VISION</button>
              <button onClick={() => scrollTo('packages')} className="text-sm font-medium hover:text-red-600 transition-colors">PACKAGES</button>
              <button onClick={() => scrollTo('contact')} className="text-sm font-medium hover:text-red-600 transition-colors">CONTACT</button>
            </div>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => onOpenAuth('login')}
                className="text-sm font-bold text-gray-300 hover:text-white transition-colors"
              >
                LOGIN
              </button>
              <button 
                onClick={() => onOpenAuth('register')}
                className="px-5 py-2.5 bg-[#00A86B] text-white text-sm font-bold rounded hover:bg-green-600 transition-colors"
              >
                BUY A PLAN
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsNavOpen(!isNavOpen)} className="p-2 text-gray-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isNavOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isNavOpen && (
          <div className="md:hidden bg-neutral-900 border-b border-neutral-800">
            <div className="px-4 pt-2 pb-6 space-y-1">
              <button onClick={() => scrollTo('home')} className="block w-full text-left px-3 py-3 text-base font-medium">Home</button>
              <button onClick={() => scrollTo('about')} className="block w-full text-left px-3 py-3 text-base font-medium">About</button>
              <button onClick={() => scrollTo('packages')} className="block w-full text-left px-3 py-3 text-base font-medium">Packages</button>
              <div className="pt-4 flex flex-col gap-3 px-3">
                <button onClick={() => onOpenAuth('login')} className="w-full py-3 border border-neutral-700 font-bold rounded">LOGIN</button>
                <button onClick={() => onOpenAuth('register')} className="w-full py-3 bg-[#00A86B] font-bold rounded">BUY A PLAN</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 bg-red-700">
          <img 
            src={settings.heroImage} 
            alt="Agriculture Field" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-red-800/80 via-red-900/95 to-neutral-950"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium tracking-wide">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              {settings.heroTagline}
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight whitespace-pre-wrap">
              {settings.heroTitle1}<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A86B] to-green-400">{settings.heroTitleHighlight}</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto md:mx-0 leading-relaxed">
              {settings.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
              <button 
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto px-8 py-4 bg-[#00A86B] hover:bg-green-600 text-white font-bold rounded text-lg transition-transform hover:scale-105 active:scale-95"
              >
                PICK A PLANE
              </button>
              <button 
                onClick={() => scrollTo('packages')}
                className="w-full sm:w-auto px-8 py-4 border border-neutral-700 hover:border-white text-white font-bold rounded text-lg transition-colors"
              >
                VIEW PACKAGES
              </button>
            </div>
            
            {/* Trust Badges */}
            <div className="pt-8 flex items-center justify-center md:justify-start gap-6 text-sm text-gray-500 font-medium">
              <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-500" /> Secure Payouts</div>
              <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> High ROI</div>
              <div className="flex items-center gap-2"><Users className="w-5 h-5 text-green-500" /> 10k+ Investors</div>
            </div>
          </div>
          <div className="flex-1 hidden lg:block relative">
             <div className="absolute inset-0 bg-red-600/20 blur-[100px] rounded-full"></div>
             <img 
               src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=800" 
               alt="Investment Growth" 
               className="relative z-10 rounded-2xl border border-neutral-800 shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
             />
          </div>
        </div>
      </section>

      {/* Recent Plans Marquee */}
      <div className="bg-neutral-900 border-y border-neutral-800 py-4 overflow-hidden relative flex">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-neutral-900 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-neutral-900 to-transparent z-10 pointer-events-none"></div>
        <div className="flex animate-marquee w-max cursor-default">
          {[...RECENT_INVESTMENTS, ...RECENT_INVESTMENTS].map((inv, idx) => (
            <div key={idx} className="flex items-center gap-2 mx-6 text-sm font-medium">
              <span className="text-xl">🎉</span>
              <span className="text-white">{inv.name}</span>
              <span className="text-gray-400">just invested</span>
              <span className="text-[#00A86B] font-bold">{inv.amount}</span>
              <span className="text-gray-400">in</span>
              <span className="text-white">{inv.package}</span>
              <span className="text-gray-600 text-xs ml-2">{inv.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* About Section */}
      <section id="about" className="py-24 bg-neutral-950 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold">Who is <span className="text-red-600">ZARU?</span></h2>
              <div className="w-20 h-1 bg-red-600"></div>
              <p className="text-gray-400 text-lg leading-relaxed">
                ZARU ENTERPRISE is a premier agricultural planning firm operating at the heart of Nigeria's agrarian economy. We bridge the gap between everyday investors and high-scale farming operations.
              </p>
              <p className="text-gray-400 text-lg leading-relaxed">
                By investing with us, you are funding real, on-ground farming cycles. We handle the land acquisition, labor, risk management, and sales. You simply provide the capital and watch your returns grow.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-black p-6 rounded border border-neutral-800 flex flex-col justify-center items-center text-center">
                 <div className="text-4xl font-bold text-[#00A86B] mb-2">100%</div>
                 <div className="text-sm text-gray-400 font-medium uppercase tracking-wide">Insured Farms</div>
               </div>
               <div className="bg-black p-6 rounded border border-neutral-800 flex flex-col justify-center items-center text-center">
                 <div className="text-4xl font-bold text-[#00A86B] mb-2">24/7</div>
                 <div className="text-sm text-gray-400 font-medium uppercase tracking-wide">Monitoring</div>
               </div>
               <div className="bg-black p-6 rounded border border-neutral-800 flex flex-col justify-center items-center text-center">
                 <div className="text-4xl font-bold text-[#00A86B] mb-2">Zero</div>
                 <div className="text-sm text-gray-400 font-medium uppercase tracking-wide">Hidden Fees</div>
               </div>
               <div className="bg-black p-6 rounded border border-neutral-800 flex flex-col justify-center items-center text-center">
                 <div className="text-4xl font-bold text-[#00A86B] mb-2">Fast</div>
                 <div className="text-sm text-gray-400 font-medium uppercase tracking-wide">Payouts</div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="py-24 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-red-600/5"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-8">
          <Leaf className="w-16 h-16 text-red-600 mx-auto" />
          <h2 className="text-3xl md:text-5xl font-bold">Our Vision</h2>
          <p className="text-xl text-gray-300 leading-relaxed italic">
            "{settings.aboutText}"
          </p>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="py-24 bg-neutral-950 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold">Plan <span className="text-[#00A86B]">Packages</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Choose a plan that fits your financial goals. All plans are backed by physical agricultural assets.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {settings.packages.map(pkg => (
              <div key={pkg.id} className="bg-black border border-neutral-800 rounded-xl overflow-hidden hover:border-[#00A86B] transition-colors group flex flex-col">
                <div className="h-56 relative overflow-hidden">
                  <img 
                    src={getPackageImage(pkg.id, pkg.image)} 
                    alt={pkg.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur text-white px-3 py-1 text-sm font-bold rounded border border-neutral-700">
                    {pkg.durationDays} Days
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-1">
                  <h3 className="text-2xl font-bold mb-3">{pkg.name}</h3>
                  <p className="text-gray-400 text-sm mb-6 flex-1">{pkg.description}</p>
                  
                  <div className="space-y-4 mb-8 bg-neutral-900/50 p-4 rounded border border-neutral-800">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm uppercase tracking-wider">Min. Capital</span>
                      <span className="font-bold text-lg">₦{pkg.minInvestment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm uppercase tracking-wider">Fixed ROI</span>
                      <span className="font-bold text-2xl text-[#00A86B]">{pkg.roi}%</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => onOpenAuth('register')}
                    className="w-full py-4 border border-[#00A86B] text-[#00A86B] hover:bg-[#00A86B] hover:text-white font-bold rounded transition-colors tracking-wide"
                  >
                    BUY {pkg.name.toUpperCase()}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-black border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold mb-4">Get in Touch</h2>
                <p className="text-gray-400">Have questions about our plan packages? Our support team is available 24/7 to assist you.</p>
              </div>
              
              <div className="space-y-6">
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center flex-shrink-0">
                    <Phone className="text-[#00A86B] w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">WhatsApp & Call</h4>
                    <div className="flex flex-col gap-1">
                      <a 
                        href="https://wa.me/2349131376638" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-gray-300 hover:text-[#00A86B] transition-colors text-sm font-mono flex items-center gap-2"
                      >
                        <span>09131376638</span>
                        <span className="text-[11px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-sans">
                          Chat on WhatsApp
                        </span>
                      </a>
                      <a 
                        href="tel:09131376638" 
                        className="text-gray-500 hover:text-gray-300 transition-colors text-xs font-mono"
                      >
                        +234 913 137 6638 (Direct Line)
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center flex-shrink-0">
                    <Mail className="text-gray-300 w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Email</h4>
                    <p className="text-gray-400 text-sm">zaruenterprise@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-6">Send a Message</h3>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                setIsSending(true);
                setSendStatus('idle');
                
                try {
                  const res = await fetch('/api/send-contact-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMessage })
                  });
                  
                  if (res.ok) {
                    setSendStatus('success');
                    setContactName('');
                    setContactEmail('');
                    setContactMessage('');
                    // reset status after 5 seconds
                    setTimeout(() => setSendStatus('idle'), 5000);
                  } else {
                    setSendStatus('error');
                  }
                } catch (error) {
                  setSendStatus('error');
                } finally {
                  setIsSending(false);
                }
              }}>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                  <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} required disabled={isSending} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:outline-none focus:border-red-600 transition-colors disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required disabled={isSending} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:outline-none focus:border-red-600 transition-colors disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Message</label>
                  <textarea required value={contactMessage} onChange={e => setContactMessage(e.target.value)} rows={4} disabled={isSending} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:outline-none focus:border-red-600 transition-colors disabled:opacity-50"></textarea>
                </div>
                {sendStatus === 'success' && (
                  <div className="p-3 bg-green-900/50 border border-green-800 text-green-400 text-sm rounded">
                    Message sent successfully! We will get back to you soon.
                  </div>
                )}
                {sendStatus === 'error' && (
                  <div className="p-3 bg-red-900/50 border border-red-800 text-red-400 text-sm rounded">
                    Failed to send message. Please try again.
                  </div>
                )}
                <button type="submit" disabled={isSending} className="w-full py-4 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors disabled:opacity-50 flex justify-center items-center">
                  {isSending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                      SENDING...
                    </>
                  ) : (
                    'SEND MESSAGE'
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-950 border-t border-neutral-900 py-12 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 grayscale opacity-50">
            <Leaf className="w-6 h-6" />
            <div className="font-bold text-lg tracking-widest uppercase">ZARU</div>
          </div>
          <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
            Disclaimer: All plans involve risk, including the possible loss of principal. Past performance of agricultural cycles does not guarantee future returns. ZARU ENTERPRISE is registered under the Corporate Affairs Commission of Nigeria. By using this platform, you agree to our Terms of Service and Privacy Policy.
          </p>
          <p className="text-sm text-gray-500 font-medium">
            © {new Date().getFullYear()} ZARU ENTERPRISE. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp Quick Action */}
      <a
        href="https://wa.me/2349131376638"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#00A86B] hover:bg-[#008f5b] text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 font-medium text-sm transition-all transform hover:scale-105 group border border-emerald-400/40"
        title="Chat with ZARU Enterprise on WhatsApp (09131376638)"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
        <Phone className="w-4 h-4 fill-white" />
        <span className="font-semibold tracking-wide">WhatsApp Us (09131376638)</span>
      </a>

    </div>
  );
}
