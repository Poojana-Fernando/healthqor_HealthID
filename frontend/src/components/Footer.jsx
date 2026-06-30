import { useState } from 'react'
import { Link } from 'react-router-dom'
import HealthIdLogoMark from './HealthIdLogoMark'

export default function Footer() {
  const [activeModal, setActiveModal] = useState(null) // 'terms' | 'privacy' | null

  const closeModal = () => setActiveModal(null)

  return (
    <footer className="relative mt-auto border-t border-white/10 bg-[#0c1a14]/60 backdrop-blur-md text-text">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          
          {/* Column 1: About Section (5 cols) */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <HealthIdLogoMark className="w-8 h-8 text-accent animate-shield-glow" />
              <span className="font-bold text-lg tracking-wide bg-gradient-health text-gradient-health">
                Health ID
              </span>
            </div>
            <p className="text-sm opacity-70 leading-relaxed max-w-md">
              Healthqor Health ID is Sri Lanka's leading digital health identity platform. We secure medical history with AES-256 encryption, offer AI-powered symptom triage, and support doctor e-channeling to make healthcare efficient, secure, and accessible.
            </p>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white/60">Emergency hotline:</span>
                <a href="tel:1990" className="text-red-400 font-semibold hover:underline">
                  Call 1990 (Suwa Seriya)
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links (3.5 cols) */}
          <div className="md:col-span-3 flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-accent2 uppercase tracking-wider font-mono">
              Quick Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-accent2 transition-colors duration-200">
                  Home / Dashboard
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-accent2 transition-colors duration-200">
                  Healthcare Profile
                </Link>
              </li>
              <li>
                <Link to="/echanneling" className="hover:text-accent2 transition-colors duration-200">
                  e-Channeling Services
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-accent2 transition-colors duration-200">
                  Support Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Security Info (3.5 cols) */}
          <div className="md:col-span-4 flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-accent2 uppercase tracking-wider font-mono">
              Legal & Verification
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => setActiveModal('terms')}
                  className="hover:text-accent2 text-left transition-colors duration-200 font-sans"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveModal('privacy')}
                  className="hover:text-accent2 text-left transition-colors duration-200 font-sans"
                >
                  Privacy Policy & Encryption
                </button>
              </li>
              <li>
                <a
                  href="/support"
                  className="hover:text-accent2 text-left transition-colors duration-200"
                >
                  Submit a Security Report
                </a>
              </li>
            </ul>
            <div className="pt-2 flex items-center gap-2 text-xs text-white/50">
              <svg
                className="w-4 h-4 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>AES-256 Encrypted Profile Storage</span>
            </div>
          </div>

        </div>

        {/* Bottom copyright row */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Healthqor Health ID. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="font-mono">HIPAA COMPLIANT DESIGN</span>
            <span>•</span>
            <span className="font-mono">SRI LANKA E-HEALTH REGISTRY</span>
          </div>
        </div>
      </div>

      {/* Modal Dialog Overlay */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/85 backdrop-blur-md transition-opacity duration-300"
          onClick={closeModal}
        >
          <div 
            className="premium-glass w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl overflow-hidden shadow-glass-glow-lg border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HealthIdLogoMark className="w-6 h-6 text-accent" />
                {activeModal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
              </h3>
              <button 
                onClick={closeModal}
                className="text-white/60 hover:text-white/90 p-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-sm text-white/80 leading-relaxed custom-scrollbar">
              {activeModal === 'terms' ? (
                <>
                  <div>
                    <h4 className="text-white font-semibold mb-2">1. Agreement to Terms</h4>
                    <p>
                      By accessing or using Healthqor Health ID, you agree to be bound by these Terms and Conditions. If you do not agree to all terms, do not access or use the application.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2 text-red-400">2. AI Symptom Checker & Medical Disclaimer</h4>
                    <p className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-red-200">
                      <strong>CRITICAL NOTICE:</strong> All health analyses, symptom checks, and guidance generated by our AI system are intended strictly for educational and informational triage purposes. They do not constitute formal medical diagnoses, professional consultations, or therapeutic advice. Always seek immediate clinical examination by a licensed medical practitioner for any health concerns. In case of an emergency, call the Sri Lankan Emergency Ambulance Hotline at <strong>1990</strong>.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">3. User Representation & Identity Verification</h4>
                    <p>
                      Users must provide truthful, accurate, and up-to-date information, including name, age, gender, mobile number, and medical records. Falsifying identities, claiming false medical associations, or uploading unauthorized records is strictly prohibited and will result in permanent account suspension.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">4. Data Ownership & Encryption Standards</h4>
                    <p>
                      Your health records and identifiers are encrypted using robust AES-256 encryption. While we maintain compliance with modern health data security guidelines, you are responsible for maintaining the confidentiality of your login credentials.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">5. Service Availability & Modification</h4>
                    <p>
                      We reserve the right to modify, suspend, or terminate services at any time. We are not liable to you or any third party for modifications or suspension of the platform.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="text-white font-semibold mb-2">1. Data Privacy Commitment</h4>
                    <p>
                      At Healthqor Health ID, we hold user privacy to the highest standard. This Privacy Policy details how we handle the collection, encryption, storage, and processing of your personal and medical information.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">2. Information Collection</h4>
                    <p>
                      We collect basic registration details (name, email, phone number) and optional health-specific parameters (allergies, blood type, vaccination records, height, weight, and general vitals) in order to construct your secure digital Health ID.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2 text-accent2">3. AES-256 Cryptographic Protection</h4>
                    <p>
                      All highly sensitive fields—including your National Identity Card (NIC) number, specific allergy registries, and uploaded records—are encrypted at-rest using AES-256 encryption. Decryption keys are managed securely in the backend, preventing unauthorized data inspection.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">4. Sharing With Healthcare Providers</h4>
                    <p>
                      No medical information stored in your Health ID profile is accessible by external doctors or hospitals without your explicit authorization. In case of e-Channeling, only the necessary scheduling details are communicated.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">5. Cookies and Authentication Security</h4>
                    <p>
                      We use secure, HttpOnly, SameSite cookies to manage sessions and authenticate JWT tokens. We do not place advertising cookies or track user behavior across other sites.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">6. Right to Deletion</h4>
                    <p>
                      You retain full control over your health data. You may request account deletion at any time, which will permanently scrub all associated medical records and identifiers from our databases.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-white/10 shrink-0 bg-navy/40">
              <button 
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent2 text-navy font-semibold transition-all duration-200"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
