import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export default function SignupProgress({ steps, currentStep, onStepClick }) {
  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between mb-2">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            className="flex flex-col items-center flex-1"
            whileHover={{ scale: 1.05 }}
          >
            <motion.button
              type="button"
              className={cn(
                'w-4 h-4 rounded-full transition-colors duration-300',
                index < currentStep
                  ? 'bg-accent'
                  : index === currentStep
                    ? 'bg-accent ring-4 ring-accent/20'
                    : 'bg-white/20',
              )}
              onClick={() => {
                if (index <= currentStep) onStepClick(index)
              }}
              whileTap={{ scale: 0.95 }}
              aria-label={step.title}
            />
            <span
              className={cn(
                'text-xs mt-1.5 hidden sm:block text-center px-1',
                index === currentStep ? 'text-accent font-medium' : 'text-white/50',
              )}
            >
              {step.title}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{
            width: `${steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  )
}
