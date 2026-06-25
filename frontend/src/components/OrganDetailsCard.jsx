import { useEffect, useState } from 'react'
import Sparkline from './Sparkline'

const ORGAN_PROFILES = {
  BRAIN: {
    name: 'Brain',
    system: 'Central Nervous System',
    description: 'The main control center of the body, processing sensory inputs, coordinating motor responses, and facilitating cognitive functions, emotions, and memory.',
    diseases: [
      { name: 'Stroke', desc: 'Blood flow to the brain is interrupted or reduced, depriving brain tissue of oxygen and nutrients, leading to rapid cell death.' },
      { name: 'Alzheimer\'s Disease', desc: 'A progressive neurodegenerative disorder that gradually destroys memory, thinking skills, and the ability to carry out simple tasks.' },
      { name: 'Migraines', desc: 'A neurological disorder characterized by recurring moderate-to-severe throbbing headaches, often accompanied by nausea and light sensitivity.' },
      { name: 'Meningitis', desc: 'An acute inflammation of the protective membranes (meninges) covering the brain and spinal cord, typically caused by a viral or bacterial infection.' }
    ],
    color: '#b280ff',
    icon: '🧠'
  },
  HEART: {
    name: 'Heart',
    system: 'Cardiovascular System',
    description: 'A vital muscular organ responsible for pumping oxygenated blood throughout the circulatory network to supply tissues and organs with oxygen and nutrients.',
    diseases: [
      { name: 'Coronary Artery Disease', desc: 'Plaque build-up in the coronary arteries limiting oxygen supply to the heart, potentially causing chest pain or heart attacks.' },
      { name: 'Heart Failure', desc: 'A chronic, progressive condition in which the heart muscle is unable to pump blood efficiently to meet the body\'s needs.' },
      { name: 'Arrhythmia', desc: 'Irregular heartbeats (tachycardia, bradycardia, or atrial fibrillation) caused by disruptions in the heart\'s electrical conduction system.' },
      { name: 'Myocardial Infarction', desc: 'Commonly known as a heart attack; occurs when blood flow is completely blocked to a part of the heart muscle, causing tissue damage.' }
    ],
    color: '#ff3355',
    icon: '❤️'
  },
  LUNGS: {
    name: 'Lungs',
    system: 'Respiratory System',
    description: 'The primary organs of respiration, enabling vital gas exchange by extracting oxygen from inhaled air and releasing carbon dioxide into the atmosphere.',
    diseases: [
      { name: 'Asthma', desc: 'A chronic condition characterized by inflammation and narrowing of the airways, causing wheezing, chest tightness, and shortness of breath.' },
      { name: 'Pneumonia', desc: 'An infection that inflames the air sacs (alveoli) in one or both lungs, which may fill with fluid or pus, causing fever and breathing difficulty.' },
      { name: 'COPD', desc: 'Chronic Obstructive Pulmonary Disease; a progressive group of lung diseases (including emphysema) that block airflow and make breathing difficult.' },
      { name: 'Pulmonary Embolism', desc: 'A blockage in one of the pulmonary arteries in your lungs, usually caused by blood clots that travel to the lungs from deep veins in the legs.' }
    ],
    color: '#33b2ff',
    icon: '🫁'
  },
  LIVER: {
    name: 'Liver',
    system: 'Digestive & Metabolic System',
    description: 'A major metabolic hub that processes nutrients, filters toxins from the blood, produces essential blood proteins, and synthesizes bile to assist fat digestion.',
    diseases: [
      { name: 'Viral Hepatitis', desc: 'Inflammation of liver tissue caused by hepatitis viruses (A, B, C), leading to liver damage and potential jaundice.' },
      { name: 'Fatty Liver Disease', desc: 'An accumulation of excess fat in liver cells, which can trigger chronic inflammation and lead to cirrhosis.' },
      { name: 'Cirrhosis', desc: 'Late-stage scarring (fibrosis) of the liver caused by long-term liver diseases, impairing its essential filtering functions.' },
      { name: 'Hepatocellular Carcinoma', desc: 'The most common form of primary liver cancer, frequently developing in patients with chronic hepatitis or cirrhosis.' }
    ],
    color: '#ff9933',
    icon: '🧼'
  },
  STOMACH: {
    name: 'Stomach',
    system: 'Gastrointestinal System',
    description: 'A hollow muscular organ that initiates chemical and mechanical breakdown of food using highly acidic gastric juices and digestive enzymes.',
    diseases: [
      { name: 'Gastritis', desc: 'Inflammation of the protective lining of the stomach, commonly triggered by H. pylori infection, stress, or medications.' },
      { name: 'Peptic Ulcer Disease', desc: 'Painful sores or ulcers that develop on the inner lining of the stomach or the upper part of the small intestine.' },
      { name: 'GERD', desc: 'Gastroesophageal Reflux Disease; a chronic condition where stomach acid flows back into the esophagus, causing irritation (heartburn).' },
      { name: 'Gastroenteritis', desc: 'Inflammation of the stomach and intestines, typically caused by viral/bacterial infections, resulting in vomiting and diarrhea.' }
    ],
    color: '#ff66b2',
    icon: '🧪'
  },
  KIDNEYS: {
    name: 'Kidneys',
    system: 'Urinary & Excretory System',
    description: 'Two bean-shaped organs that filter blood to extract waste products, manage fluid balance, regulate blood pressure, and maintain electrolyte stability.',
    diseases: [
      { name: 'Chronic Kidney Disease', desc: 'Gradual loss of kidney function over time, which can progress to end-stage renal failure, requiring dialysis or transplant.' },
      { name: 'Kidney Stones', desc: 'Hard deposits of minerals and acid salts that form inside the kidneys and cause intense, sharp pain when passing through the urinary tract.' },
      { name: 'Glomerulonephritis', desc: 'Acute or chronic inflammation of the tiny filters (glomeruli) in the kidneys, causing blood or protein leakage into urine.' },
      { name: 'Pyelonephritis', desc: 'A type of urinary tract infection (UTI) that has ascended to affect one or both kidneys, presenting with fever and flank pain.' }
    ],
    color: '#33ff99',
    icon: '🥜'
  },
  INTESTINES: {
    name: 'Intestines',
    system: 'Gastrointestinal System',
    description: 'The long digestive tract comprising the small intestine (nutrient absorption) and large intestine (water absorption and waste compaction).',
    diseases: [
      { name: 'Irritable Bowel Syndrome', desc: 'A common gastrointestinal disorder affecting the large intestine, causing cramping, abdominal pain, bloating, and gas.' },
      { name: 'Inflammatory Bowel Disease', desc: 'Chronic inflammation of the digestive tract, consisting of Crohn\'s disease and Ulcerative Colitis.' },
      { name: 'Appendicitis', desc: 'Acute, painful inflammation of the appendix that requires urgent surgical removal to prevent rupture.' },
      { name: 'Celiac Disease', desc: 'An autoimmune reaction to eating gluten that damages the small intestine\'s lining and prevents nutrient absorption.' }
    ],
    color: '#eeee33',
    icon: '🌀'
  },
  SKIN_LIMBS: {
    name: 'Skin & Limbs',
    system: 'Integumentary & Musculoskeletal System',
    description: 'The outer protective layer of the body along with limbs containing skeletal structures, muscles, joints, and blood vessels.',
    diseases: [
      { name: 'Eczema / Dermatitis', desc: 'An inflammatory skin condition causing dry, red, and extremely itchy patches on the skin\'s surface.' },
      { name: 'Osteoarthritis', desc: 'A degenerative joint disease caused by the breakdown of protective cartilage at the ends of bones, leading to stiffness.' },
      { name: 'Cellulitis', desc: 'A common, potentially serious bacterial infection of the deep skin layers and underlying tissues, causing swelling and heat.' },
      { name: 'Psoriasis', desc: 'An autoimmune skin condition that accelerates the life cycle of skin cells, leading to thick, scaly, itchy plaques.' }
    ],
    color: '#33d399',
    icon: '🦾'
  }
}

function generateMockTrend(currentValue, seed = 1) {
  const base = Number(currentValue)
  if (!currentValue || Number.isNaN(base)) return null
  const months = 6
  const points = []
  for (let i = 0; i < months; i++) {
    const wave = Math.sin((i + seed) * 1.4) * 0.035 * base
    const drift = (i - (months - 1)) * 0.012 * base
    points.push(Math.round((base + wave + drift) * 100) / 100)
  }
  points[months - 1] = base
  return points
}

export default function OrganDetailsCard({ activeRegion = null, onClear, profile = null }) {
  const isOrganSelected = activeRegion !== null && ORGAN_PROFILES[activeRegion] !== undefined
  const organProfile = isOrganSelected ? ORGAN_PROFILES[activeRegion] : null

  // Dynamic styling to transition between states
  const borderStyle = organProfile ? `${organProfile.color}40` : 'rgba(255, 255, 255, 0.18)'
  const shadowStyle = organProfile
    ? `0 8px 32px rgba(0, 0, 0, 0.25), 0 0 30px ${organProfile.color}15`
    : '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.06) inset, 0 0 48px rgba(52, 211, 153, 0.08)'

  return (
    <div 
      className="premium-glass rounded-3xl p-8 md:p-10 shadow-glass-glow-lg flex flex-col justify-between h-[680px] max-h-[680px] overflow-hidden transition-all duration-500 ease-out border"
      style={{
        boxShadow: shadowStyle,
        borderColor: borderStyle
      }}
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Wrap in key to animate on region change */}
        <div key={activeRegion || 'fallback'} className="animate-fade-in flex-1 flex flex-col min-h-0 overflow-hidden">
          {!isOrganSelected ? (
            <>
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-lg font-mono text-accent2 uppercase tracking-wider">
                  SYSTEM INSPECTOR
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono animate-pulse">
                  ONLINE
                </span>
              </div>

              <div className="overflow-y-auto overflow-x-hidden pr-1.5 space-y-5 flex-1 custom-scrollbar">
                <p className="text-sm opacity-70 leading-relaxed">
                  Holographic particle scanning module loaded. Hover or click on the 3D model regions to retrieve real-time anatomical classifications, descriptions, and common clinical pathologies.
                </p>

                {profile ? (
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-accent2 uppercase tracking-wider border-b border-white/10 pb-1.5">BIOMETRIC VITALS</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'GENDER', value: profile.gender || '—' },
                        { label: 'BLOOD TYPE', value: profile.bloodType || '—' },
                        { label: 'HEIGHT', value: profile.heightCm ? `${profile.heightCm} cm` : '—' },
                        {
                          label: 'WEIGHT',
                          value: profile.weightKg ? `${profile.weightKg} kg` : '—',
                          sparkline: generateMockTrend(profile.weightKg, 2),
                          sparkColor: '#5eead4',
                        },
                        {
                          label: 'BMI',
                          value: profile.bmi || '—',
                          sparkline: generateMockTrend(profile.bmi, 3),
                          sparkColor: '#22d3ee',
                        },
                        { label: 'EYESIGHT LEFT', value: profile.eyesightLeft || '—' },
                        { label: 'EYESIGHT RIGHT', value: profile.eyesightRight || '—' },
                      ].map((s) => (
                        <div key={s.label} className="border border-white/5 rounded-xl p-4 bg-white/5 text-center stat-card-hover">
                          <p className="text-[10px] font-mono text-white/40 tracking-wide mb-1">{s.label}</p>
                          <p className="font-extrabold text-lg tracking-tight text-white">{s.value}</p>
                          {s.sparkline && <Sparkline data={s.sparkline} color={s.sparkColor} height={24} />}
                        </div>
                      ))}
                    </div>

                    {profile.allergies?.length > 0 && (
                      <div className="border border-white/5 rounded-xl p-4 bg-white/5 text-left">
                        <p className="text-[10px] font-mono text-white/40 mb-2 tracking-wide">ALLERGIES</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.allergies.map((a) => (
                            <span key={a} className="text-xs bg-red-500/20 text-red-300 px-2.5 py-1 rounded-full allergy-alert">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.doctorVerified && (
                      <div className="border border-white/5 rounded-xl p-3.5 flex items-center gap-2 text-green-400 bg-white/5 text-xs font-mono">
                        <span className="text-sm">✓</span>
                        <span>DOCTOR VERIFIED PROFILE</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-white/5 rounded-xl p-4 bg-white/5">
                      <div className="text-[10px] font-mono text-white/40">BLOOD PRESSURE</div>
                      <div className="text-lg font-mono text-white/90 mt-1">120/80 <span className="text-xs text-white/50">mmHg</span></div>
                    </div>
                    <div className="border border-white/5 rounded-xl p-4 bg-white/5">
                      <div className="text-[10px] font-mono text-white/40">SPO2 CAPACITY</div>
                      <div className="text-lg font-mono text-white/90 mt-1">99% <span className="text-xs text-emerald-400">NOMINAL</span></div>
                    </div>
                    <div className="border border-white/5 rounded-xl p-4 bg-white/5">
                      <div className="text-[10px] font-mono text-white/40">CORE TEMPERATURE</div>
                      <div className="text-lg font-mono text-white/90 mt-1">98.6°F <span className="text-xs text-white/50">37.0°C</span></div>
                    </div>
                    <div className="border border-white/5 rounded-xl p-4 bg-white/5">
                      <div className="text-[10px] font-mono text-white/40">COGNITIVE INDEX</div>
                      <div className="text-lg font-mono text-white/90 mt-1">99.2% <span className="text-xs text-emerald-400">STABLE</span></div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label={organProfile.name}>{organProfile.icon}</span>
                    <h3 className="text-2xl font-bold tracking-tight text-white/90">
                      {organProfile.name}
                    </h3>
                  </div>
                  <span 
                    className="text-[10px] font-mono tracking-wider uppercase mt-1 inline-block"
                    style={{ color: organProfile.color }}
                  >
                    {organProfile.system}
                  </span>
                </div>
                <button 
                  onClick={onClear}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors uppercase font-mono tracking-wider bg-white/5 border border-white/10 px-2.5 py-1 rounded-md"
                >
                  Reset
                </button>
              </div>

              <div className="overflow-y-auto overflow-x-hidden pr-1.5 space-y-6 flex-1 custom-scrollbar">
                <div className="border-t border-white/10 pt-4 shrink-0">
                  <h4 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-2">DESCRIPTION</h4>
                  <p className="text-sm opacity-80 leading-relaxed">
                    {organProfile.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-4">COMMON PATHOLOGIES & DISEASES</h4>
                  <div className="space-y-3.5 pr-1">
                    {organProfile.diseases.map((d, index) => (
                      <div 
                        key={index} 
                        className="stat-card-hover border border-white/5 rounded-xl p-3.5 bg-[#0c1a14]/40 hover:bg-[#0c1a14]/65"
                      >
                        <p 
                          className="font-bold text-sm tracking-wide"
                          style={{ color: organProfile.color }}
                        >
                          {d.name}
                        </p>
                        <p className="text-xs text-white/70 mt-1 leading-relaxed">
                          {d.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-white/40 shrink-0">
        {!isOrganSelected ? (
          <span className="w-full text-center tracking-widest uppercase text-accent2/40 text-[9px]">
            Interact with the 3D hologram to scan specific organs
          </span>
        ) : (
          <>
            <span>BIOMETRIC SCANNER v2.0</span>
            <span style={{ color: organProfile.color }} className="animate-pulse font-bold transition-colors duration-500">
              TARGET MONITORED
            </span>
          </>
        )}
      </div>
    </div>
  )
}
