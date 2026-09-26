import { Paper, type PaperProps } from '@mantine/core'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

export function Surface({ children, interactive = false, className = '', ...props }: PaperProps & {
  children: ReactNode
  interactive?: boolean
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      whileTap={interactive && !reduceMotion ? { scale: 0.992 } : undefined}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      className={className}
    >
      <Paper className="surface" {...props}>{children}</Paper>
    </motion.div>
  )
}
