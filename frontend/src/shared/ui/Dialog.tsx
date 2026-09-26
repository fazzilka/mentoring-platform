import { Modal, type ModalProps } from '@mantine/core'
import { useReducedMotion } from 'motion/react'

export function Dialog(props: ModalProps) {
  const reducedMotion = useReducedMotion()
  return <Modal {...props} transitionProps={{ transition: 'fade', duration: reducedMotion ? 0 : 140 }} />
}
