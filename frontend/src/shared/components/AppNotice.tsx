import { Notification } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { usePlatformState } from '../../features/platform/usePlatformState'

export function AppNotice() {
  const { notice, dismissNotice } = usePlatformState()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(dismissNotice, 3200)
    return () => window.clearTimeout(timeout)
  }, [dismissNotice, notice])

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          className="app-notice"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.32 }}
        >
          <Notification icon={<IconCheck size={18} />} color="teal" title="Готово" onClose={dismissNotice} withBorder>
            {notice}
          </Notification>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
