import { createContext, useContext, useSyncExternalStore } from 'react'

export interface Gateway<T> {
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
}

export function createGatewayContext<T>() {
  const Context = createContext<Gateway<T> | null>(null)
  function useGateway() {
    const gateway = useContext(Context)
    if (!gateway) throw new Error('Gateway provider отсутствует')
    return useSyncExternalStore(gateway.subscribe, gateway.getSnapshot)
  }
  return { Context, useGateway }
}
