import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SITE_FEATURES = [
  {
    name: 'e-Channeling (Book Doctor Appointment)',
    description: 'Find verified doctors and schedule medical checkups.',
    path: '/echanneling',
    keywords: ['channeling', 'doctor', 'book', 'appointment', 'physician', 'hospital', 'schedule', 'booking'],
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    name: 'Healthcare Profile & Medical Records',
    description: 'Access your secure health profile, vaccination history, and body vitals.',
    path: '/profile',
    keywords: ['profile', 'records', 'medical', 'vaccination', 'tracker', 'vitals', 'bmi', 'blood', 'allergies'],
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    name: 'AI Medical Assistant Chat',
    description: 'Chat with our AI bot about symptoms or app guidance.',
    path: 'action:ai_chat',
    keywords: ['ai', 'chat', 'chatbot', 'assistant', 'symptoms', 'question', 'advice'],
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    name: 'Digital Health Identity Dashboard',
    description: 'View your unique QR health identity and check symptoms on a 3D avatar.',
    path: '/',
    keywords: ['home', 'dashboard', 'identity', 'symptom', 'checker', 'avatar', '3d'],
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    name: 'Emergency Ambulance Hotline (1990)',
    description: 'Instantly call Suwa Seriya 1990 free ambulance service in Sri Lanka.',
    path: 'tel:1990',
    keywords: ['emergency', 'ambulance', 'suwa', 'seriya', '1990', 'call', 'accident'],
    icon: (
      <svg className="w-5 h-5 text-red-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )
  },
  {
    name: 'Submit Support Ticket',
    description: 'File a technical support request or verification issue.',
    path: 'action:ticket_form',
    keywords: ['ticket', 'support', 'contact', 'form', 'help', 'report', 'issue', 'complaint'],
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    )
  },
  {
    name: 'Admin Control Center',
    description: 'Access admin panel to verify doctors, view audit logs and user stats.',
    path: '/admin',
    keywords: ['admin', 'audit', 'verify', 'doctors', 'users', 'logs', 'statistics'],
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    name: 'Login Account Portal',
    description: 'Sign in to access secure dashboard and personalization.',
    path: '/login',
    keywords: ['login', 'signin', 'auth', 'credentials'],
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    )
  },
  {
    name: 'Register Health ID Account',
    description: 'Sign up for a digital Health ID profile.',
    path: '/signup',
    keywords: ['signup', 'register', 'enroll', 'create'],
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    )
  }
]

const FAQ_CATEGORIES = ['All', 'General & Account', 'Health ID & Privacy', 'e-Channeling', 'Emergency Services']

const FAQS = [
  {
    id: 1,
    category: 'General & Account',
    question: 'What is a Health ID?',
    answer: 'Your Health ID is a unique digital identity that securely compiles your verified medical records, vaccination history, and lab reports into a single, encrypted profile.'
  },
  {
    id: 2,
    category: 'Health ID & Privacy',
    question: 'Is my medical data secure on this platform?',
    answer: 'Absolutely. Health ID utilizes end-to-end encryption and strict access controls. Your health records are only accessible to you and medical professionals you explicitly authorize in person or via your secure dashboard.'
  },
  {
    id: 3,
    category: 'General & Account',
    question: 'How do I update my profile details?',
    answer: 'Navigate to the "Healthcare" tab (Profile page) and click the Edit button. Note that any critical health fields verified by medical practitioners will require re-verification to ensure authenticity.'
  },
  {
    id: 4,
    category: 'e-Channeling',
    question: 'How does the e-Channeling system work?',
    answer: 'You can search for verified doctors by specialty, location, rating, or availability. Choose an available slot, add notes, and book instantly. You will receive a reference number to show at the hospital counter.'
  },
  {
    id: 5,
    category: 'e-Channeling',
    question: 'What if I need to cancel or reschedule my appointment?',
    answer: 'Currently, you can view your appointments in the e-Channeling tab. For cancellations or rescheduling, please contact the respective hospital directly using the reference number provided in your booking confirmation.'
  },
  {
    id: 6,
    category: 'Emergency Services',
    question: 'What is the 1990 Suwa Seriya integration?',
    answer: '1990 is Sri Lanka\'s free pre-hospital emergency care ambulance service. Health ID integrates with the hotline so first responders can securely scan or query your digital Health ID during emergency transfer to get immediate access to critical life-saving vitals, allergies, and blood type.'
  },
  {
    id: 7,
    category: 'Health ID & Privacy',
    question: 'How do I authorize a doctor to view my records?',
    answer: 'When visiting a verified healthcare facility, they will request access to your Health ID. You will receive a prompt or can showcase your unique QR code from your profile to grant temporary, audited access.'
  },
  {
    id: 8,
    category: 'Emergency Services',
    question: 'How do I set up my Emergency Medical Profile?',
    answer: 'Go to your Profile Page, and fill in the emergency contacts, blood group, allergies, and chronic illnesses. This critical data forms your digital emergency sheet, accessible by paramedics in critical scenarios.'
  }
]

export default function SupportPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // FAQ state
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  // Website features search state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef(null)

  // Form states
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('General Inquiry')
  const [priority, setPriority] = useState('Medium')
  const [message, setMessage] = useState('')
  const [customName, setCustomName] = useState('')
  const [customEmail, setCustomEmail] = useState('')
  const [attachment, setAttachment] = useState(null)
  
  // Submission & UI feedback states
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [tickets, setTickets] = useState([])
  const fileInputRef = useRef(null)

  // Load user tickets from localStorage on mount
  useEffect(() => {
    const savedTickets = localStorage.getItem('healthid_support_tickets')
    if (savedTickets) {
      try {
        setTickets(JSON.parse(savedTickets))
      } catch (e) {
        console.error('Error parsing saved tickets', e)
      }
    }
  }, [])

  // Auto-fill form fields when user auth state changes
  useEffect(() => {
    if (user) {
      setCustomName(user.name || '')
      setCustomEmail(user.email || '')
    } else {
      setCustomName('')
      setCustomEmail('')
    }
  }, [user])

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id)
  }

  // Handle mock file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds the 5MB limit.')
        return
      }
      setAttachment({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: file.type
      })
    }
  }

  const removeAttachment = () => {
    setAttachment(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim() || !customName.trim() || !customEmail.trim()) {
      alert('Please fill out all required fields.')
      return
    }

    setLoading(true)

    // Simulate server response delay
    setTimeout(() => {
      const ticketId = 'HQ-' + Math.floor(100000 + Math.random() * 900000)
      const newTicket = {
        id: ticketId,
        name: customName,
        email: customEmail,
        subject,
        category,
        priority,
        message,
        attachmentName: attachment ? attachment.name : null,
        status: 'Received',
        createdAt: new Date().toLocaleString(),
      }

      const updatedTickets = [newTicket, ...tickets]
      setTickets(updatedTickets)
      localStorage.setItem('healthid_support_tickets', JSON.stringify(updatedTickets))

      setSuccess({
        id: ticketId,
        subject,
        category,
        priority,
        createdAt: newTicket.createdAt
      })

      // Reset form
      setSubject('')
      setMessage('')
      setAttachment(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setLoading(false)
    }, 1500)
  }

  const clearTicketHistory = () => {
    if (window.confirm('Are you sure you want to clear your ticket submission history from this browser?')) {
      setTickets([])
      localStorage.removeItem('healthid_support_tickets')
    }
  }

  // Filter FAQs based on category and search query
  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Open chatbot FAB if it exists by querying and clicking the bubble
  const triggerChatbot = () => {
    // Check if the chat window is already open
    const isChatOpen = !!document.querySelector('.fixed.bottom-24.right-6')
    if (isChatOpen) {
      return // Chat is already open, no need to toggle
    }

    const chatBubble = document.querySelector('button[aria-label="Open medical assistant chat"]') || 
                       document.querySelector('button.fixed.bottom-6.right-6')
    if (chatBubble) {
      chatBubble.click()
    } else {
      // Fallback instruction if element is not found
      alert("Please click the floating AI Medical Assistant bubble (🩺) in the bottom right corner of your screen to start chatting!")
    }
  }

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSuggestionClick = (feature) => {
    setSearchQuery('')
    setShowSuggestions(false)
    if (feature.path.startsWith('/')) {
      navigate(feature.path)
    } else if (feature.path.startsWith('tel:')) {
      window.location.href = feature.path
    } else if (feature.path === 'action:ai_chat') {
      triggerChatbot()
    } else if (feature.path === 'action:ticket_form') {
      const el = document.getElementById('support-form')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Filter features based on searchQuery
  const suggestedFeatures = searchQuery.trim()
    ? SITE_FEATURES.filter((feat) =>
        feat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feat.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : []

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 text-[#ecfdf5]">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-[-1]">
        <div className="fluid-orb fluid-orb-1 opacity-20"></div>
        <div className="fluid-orb fluid-orb-3 opacity-15"></div>
      </div>

      {/* Hero Header */}
      <section className="text-center max-w-3xl mx-auto mb-16 text-text">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          Support &amp; <span className="text-gradient-health">Help Center</span>
        </h1>
        <p className="text-lg opacity-70 mb-10 leading-relaxed">
          Need help with your Health ID profile, medical records, or e-Channeling appointments? We are here to assist you 24/7.
        </p>

        {/* Search Bar */}
        <div ref={searchContainerRef} className="relative max-w-xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-emerald-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search FAQs, categories, or keywords..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full bg-[#0c1a14]/40 border border-white/15 focus:border-emerald-400 rounded-2xl pl-12 pr-4 py-4 text-base placeholder-white/40 focus:outline-none transition-colors backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.2)]"
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestedFeatures.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 premium-glass rounded-2xl border border-white/15 overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.4)] text-left">
              <div className="px-4 py-2 bg-[#0c1a14]/60 border-b border-white/10 text-[10px] font-mono text-accent2 uppercase tracking-wider">
                Suggested Features &amp; Pages
              </div>
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                {suggestedFeatures.map((feat) => (
                  <button
                    key={feat.name}
                    type="button"
                    onClick={() => handleSuggestionClick(feat)}
                    className="w-full px-4 py-3.5 flex gap-3.5 hover:bg-emerald-500/10 hover:text-accent2 transition text-left items-start border-b border-white/5 last:border-b-0"
                  >
                    <div className="shrink-0 mt-0.5">{feat.icon}</div>
                    <div>
                      <p className="font-semibold text-sm leading-tight text-white/90">{feat.name}</p>
                      <p className="text-[11px] opacity-60 mt-1 leading-normal text-white/70">{feat.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Support Channels Grid */}
      <section className="grid md:grid-cols-3 gap-8 mb-20 text-text">
        {/* Ambulance & Hotlines Card */}
        <div className="premium-glass rounded-3xl p-8 flex flex-col justify-between stat-card-hover border-emerald-400/25 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-colors"></div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-red-300 mb-3">Sri Lanka Emergency</h3>
            <p className="text-sm opacity-70 leading-relaxed mb-6">
              For immediate medical emergencies, contact Suwa Seriya 1990 ambulance dispatch. Health ID profiles are integrated for first responders.
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-auto">
            <a href="tel:1990" className="inline-flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl border border-red-500/40 bg-red-950/20 hover:bg-red-500/25 text-red-200 transition-all text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              Call 1990 Suwa Seriya
            </a>
            <a href="tel:1919" className="inline-flex items-center justify-center gap-2 font-medium px-6 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs opacity-80 text-center">
              Govt. Information: Call 1919
            </a>
          </div>
        </div>

        {/* AI Medical Assistant Card */}
        <div className="premium-glass rounded-3xl p-8 flex flex-col justify-between stat-card-hover border-emerald-400/25 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-accent2 mb-3">AI Support Assistant</h3>
            <p className="text-sm opacity-70 leading-relaxed mb-6">
              Chat with our automated Health ID agent for quick app navigation, health metrics advice, or immediate symptom troubleshooting.
            </p>
          </div>
          <button
            onClick={triggerChatbot}
            className="cta-premium w-full py-3.5 mt-auto text-sm"
          >
            Launch Health ID AI Chat
          </button>
        </div>

        {/* Live Ticket Card */}
        <div className="premium-glass rounded-3xl p-8 flex flex-col justify-between stat-card-hover border-emerald-400/25 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-colors"></div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-teal-300 mb-3">Submit a Request</h3>
            <p className="text-sm opacity-70 leading-relaxed mb-6">
              File a technical issue or request verified profile edits. Our dedicated support engineering team will review and reply within 12 hours.
            </p>
          </div>
          <a
            href="#support-form"
            className="inline-flex items-center justify-center font-bold px-6 py-3.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-accent2 transition-all mt-auto text-sm"
          >
            Scroll to Ticket Form
          </a>
        </div>
      </section>

      {/* Main Content Layout: FAQs and Form */}
      <div className="grid lg:grid-cols-12 gap-12 items-start text-text">
        {/* Left Side: FAQs Accordion */}
        <section className="lg:col-span-7 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
            <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 text-xs">
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border transition ${
                    selectedCategory === cat
                      ? 'border-emerald-400 bg-emerald-500/10 text-accent2'
                      : 'border-white/10 hover:border-white/30 text-white/70'
                  }`}
                >
                  {cat.split(' & ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id
                return (
                  <div
                    key={faq.id}
                    className="premium-glass rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-400/30 transition-all duration-300"
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 focus:outline-none"
                    >
                      <span className="font-semibold text-white/90 hover:text-emerald-300 transition-colors">
                        {faq.question}
                      </span>
                      <svg
                        className={`w-5 h-5 text-emerald-400 shrink-0 transform transition-transform duration-300 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* Collapsible Answer */}
                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isOpen ? 'max-h-96 border-t border-white/5' : 'max-h-0'
                      }`}
                    >
                      <div className="px-6 py-5 text-sm leading-relaxed text-white/70 bg-[#0c1a14]/20">
                        <p>{faq.answer}</p>
                        <div className="mt-4 flex items-center justify-between text-[11px] opacity-50">
                          <span>Category: {faq.category}</span>
                          <span className="flex items-center gap-1">
                            Was this helpful? 
                            <button className="text-emerald-400 hover:underline px-1">Yes</button> | 
                            <button className="text-red-400 hover:underline px-1">No</button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="premium-glass rounded-2xl p-8 text-center border border-white/10">
                <p className="opacity-60 mb-2">No matching FAQs found for "{searchQuery}"</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('All')
                  }}
                  className="text-xs text-accent2 hover:underline"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* Quick Informational Tip */}
          <div className="glass rounded-2xl p-6 border border-emerald-400/20 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-400/20">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-accent2">Need official medical records verification?</h4>
              <p className="opacity-70 leading-relaxed">
                General support can troubleshoot account or app issues, but they cannot verify medical records or vaccinations. Please present your physical documents to a certified healthcare professional to verify on your next visit.
              </p>
            </div>
          </div>
        </section>

        {/* Right Side: Contact Form & Submitted Tickets */}
        <section id="support-form" className="lg:col-span-5 space-y-8">
          <div className="premium-glass rounded-3xl p-8 border border-white/15 shadow-glass-glow">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Submit Support Ticket</h2>
            <p className="text-sm opacity-60 mb-6">
              {user ? "Logged in details will be filled automatically." : "Sign in to easily track and pre-populate your tickets."}
            </p>

            {success && (
              <div className="glass rounded-2xl p-6 mb-6 border border-emerald-500/30 bg-emerald-950/20 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl"></div>
                <div className="flex gap-3 items-start mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400/30">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-emerald-400 font-bold text-sm">Ticket Submitted Successfully!</h3>
                    <p className="text-xs opacity-75 mt-1">Ticket Reference: <span className="font-mono font-bold text-accent2">{success.id}</span></p>
                  </div>
                </div>
                <div className="text-xs opacity-70 space-y-1 bg-black/20 p-3 rounded-lg border border-white/5">
                  <p><strong>Subject:</strong> {success.subject}</p>
                  <p><strong>Category:</strong> {success.category}</p>
                  <p><strong>Estimated Response:</strong> Less than 12 hours</p>
                  <p><strong>Submitted:</strong> {success.createdAt}</p>
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  className="mt-4 text-xs font-semibold text-accent2 hover:text-emerald-300 transition-colors uppercase tracking-wider"
                >
                  Submit Another Ticket [x]
                </button>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-5">
              {/* Contact Info (if logged out, user enters it) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold opacity-70">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    disabled={!!user}
                    placeholder="Enter name"
                    className="bg-[#0c1a14]/60 border border-white/10 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors disabled:opacity-60"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold opacity-70">Your Email *</label>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    disabled={!!user}
                    placeholder="Enter email"
                    className="bg-[#0c1a14]/60 border border-white/10 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-70">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="Summarise your issue..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-[#0c1a14]/60 border border-white/10 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold opacity-70">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-[#0c1a14]/80 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none text-white transition-colors"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Profile Verification">Profile Verification</option>
                    <option value="e-Channeling Help">e-Channeling Help</option>
                    <option value="Data Privacy & Security">Data Privacy &amp; Security</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold opacity-70">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="bg-[#0c1a14]/80 border border-white/10 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none text-white transition-colors"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-70">Detailed Message *</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Provide details about the issue you are experiencing, including steps to reproduce if applicable..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-[#0c1a14]/60 border border-white/10 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors resize-none leading-relaxed"
                ></textarea>
              </div>

              {/* Attachment simulated input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-70">Supporting Documents / Screenshots (Max 5MB)</label>
                {!attachment ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-white/10 hover:border-emerald-400/40 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white/5 transition duration-300"
                  >
                    <svg className="w-6 h-6 text-emerald-400/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-xs text-white/60">Drag &amp; drop or click to choose file</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="glass rounded-xl p-3 border border-emerald-400/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-xs truncate">
                        <p className="font-semibold text-white/90 truncate">{attachment.name}</p>
                        <p className="opacity-50 text-[10px]">{attachment.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="text-red-400 hover:text-red-300 p-1.5 focus:outline-none"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="cta-premium w-full py-4 text-sm disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting Request...
                  </span>
                ) : (
                  'Submit Support Ticket'
                )}
              </button>
            </form>
          </div>

          {/* Ticket History / Status Board */}
          {tickets.length > 0 && (
            <div className="premium-glass rounded-3xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-400">My Support Tickets ({tickets.length})</h3>
                <button
                  onClick={clearTicketHistory}
                  className="text-[10px] text-red-400 hover:text-red-300 font-mono"
                >
                  Clear History
                </button>
              </div>

              <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1.5 custom-scrollbar">
                {tickets.map((t) => (
                  <div key={t.id} className="glass p-4 rounded-xl border border-white/5 space-y-1.5 hover:border-emerald-400/20 transition">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-xs text-white/90 truncate">{t.subject}</h4>
                      <span className="text-[10px] font-mono bg-emerald-500/10 text-accent2 border border-emerald-400/25 px-2 py-0.5 rounded-full shrink-0">
                        {t.id}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] opacity-60">
                      <span>Cat: {t.category}</span>
                      <span>•</span>
                      <span>Pri: <strong className={t.priority === 'Emergency' ? 'text-red-400' : t.priority === 'High' ? 'text-orange-400' : 'text-emerald-400'}>{t.priority}</strong></span>
                      <span>•</span>
                      <span>Submitted: {t.createdAt.split(',')[0]}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-white/5 mt-1.5">
                      <span className="text-white/50 truncate max-w-[70%]">Logged: {t.name}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <strong className="text-emerald-400 font-semibold">{t.status}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
