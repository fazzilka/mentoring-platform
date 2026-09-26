import { Text } from '@mantine/core'
import { motion, useReducedMotion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useUserGateway } from '../../entities/user/model'
import { useSwitchRole } from './model'

export function RoleSwitch({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { mode, roles } = useUserGateway()
  const { setMode } = useSwitchRole()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const options = [{ label: 'Ученик', value: 'student' }, { label: 'Наставник', value: 'mentor' }] as const
  return (
    <div className={`role-switch${compact ? ' compact' : ''}`}>
      {!compact && <Text size="xs" c="dimmed" fw={650} mb={7}>Режим</Text>}
      <div className="role-segments" role="group" aria-label="Режим приложения">
        {options.map((option) => (
          <motion.button
            type="button"
            key={option.value}
            className={`role-segment${mode === option.value ? ' selected' : ''}`}
            aria-pressed={mode === option.value}
            disabled={!roles.includes(option.value)}
            whileTap={reduceMotion ? undefined : { scale: 0.975 }}
            onClick={() => {
              setMode(option.value)
              navigate(`/${option.value}/dashboard`)
              onNavigate?.()
            }}
          >
            {mode === option.value && (
              <motion.span
                className="role-segment-indicator"
                layoutId={compact ? 'active-role-toolbar' : 'active-role-drawer'}
                transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', bounce: 0, duration: 0.34 }}
              />
            )}
            <span className="role-segment-label">{option.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
