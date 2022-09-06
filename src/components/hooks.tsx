// File copy paste based on https://github.com/juliencrn/usehooks-ts for only the parts i need i.e. https://usehooks-ts.com/react-hook/use-local-storage
// With added flag listenToAllWindows
import { Dispatch, RefObject, SetStateAction, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;


function useEventCallback<Args extends unknown[], R>(
  fn: (...args: Args) => R,
) {
  const ref = useRef<typeof fn>(() => {
    throw new Error('Cannot call an event handler while rendering.')
  })

  useIsomorphicLayoutEffect(() => {
    ref.current = fn
  }, [fn])

  return useCallback((...args: Args) => ref.current(...args), [ref])
}
  
  declare global {
    interface WindowEventMap {
      'local-storage': CustomEvent
    }
  }
  

// Window Event based useEventListener interface
function useEventListener<K extends keyof WindowEventMap>(
    eventName: K,
    handler: (event: WindowEventMap[K]) => void,
    element?: undefined,
    options?: boolean | AddEventListenerOptions,
  ): void
  
  // Element Event based useEventListener interface
  function useEventListener<
    K extends keyof HTMLElementEventMap,
    T extends HTMLElement = HTMLDivElement,
  >(
    eventName: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    element: RefObject<T>,
    options?: boolean | AddEventListenerOptions,
  ): void
  
  // Document Event based useEventListener interface
  function useEventListener<K extends keyof DocumentEventMap>(
    eventName: K,
    handler: (event: DocumentEventMap[K]) => void,
    element: RefObject<Document>,
    options?: boolean | AddEventListenerOptions,
  ): void
  
  function useEventListener<
    KW extends keyof WindowEventMap,
    KH extends keyof HTMLElementEventMap,
    T extends HTMLElement | void = void,
  >(
    eventName: KW | KH,
    handler: (
      event: WindowEventMap[KW] | HTMLElementEventMap[KH] | Event,
    ) => void,
    element?: RefObject<T>,
    options?: boolean | AddEventListenerOptions,
  ) {
    // Create a ref that stores handler
    const savedHandler = useRef(handler)
  
    useIsomorphicLayoutEffect(() => {
      savedHandler.current = handler
    }, [handler])
  
    useEffect(() => {
      // Define the listening target
      const targetElement: T | Window = element?.current || window
      if (!(targetElement && targetElement.addEventListener)) {
        return
      }
  
      // Create event listener that calls handler function stored in ref
      const eventListener: typeof handler = event => savedHandler.current(event)
  
      targetElement.addEventListener(eventName, eventListener, options)
  
      // Remove event listener on cleanup
      return () => {
        targetElement.removeEventListener(eventName, eventListener)
      }
    }, [eventName, element, options])
  }

  

  type SetValue<T> = Dispatch<SetStateAction<T>>
  
  function useLocalStorage<T>(key: string, initialValue: T, listenToAllWindows:boolean = true): [T, SetValue<T>] {
    // Get from local storage then
    // parse stored json or return initialValue
    const readValue = useCallback((): T => {
      // Prevent build error "window is undefined" but keep keep working
      if (typeof window === 'undefined') {
        return initialValue
      }
  
      try {
        const item = window.localStorage.getItem(key)
        return item ? (parseJSON(item) as T) : initialValue
      } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error)
        return initialValue
      }
    }, [initialValue, key])
  
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState<T>(readValue)
  
    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue: SetValue<T> = useEventCallback(value => {
      // Prevent build error "window is undefined" but keeps working
      if (typeof window == 'undefined') {
        console.warn(
          `Tried setting localStorage key “${key}” even though environment is not a client`,
        )
      }
  
      try {
        // Allow value to be a function so we have the same API as useState
        const newValue = value instanceof Function ? value(storedValue) : value
  
        // Save to local storage
        window.localStorage.setItem(key, JSON.stringify(newValue))
  
        // Save state
        setStoredValue(newValue)
  
        // We dispatch a custom event so every useLocalStorage hook are notified
        window.dispatchEvent(new Event('local-storage'))
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error)
      }
    })
  
    useEffect(() => {
      setStoredValue(readValue())
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  
    const handleStorageChange = useCallback(
      (event: StorageEvent | CustomEvent) => {
        if (!listenToAllWindows || ((event as StorageEvent)?.key && (event as StorageEvent).key !== key)) {
          return
        }
        setStoredValue(readValue())
      },
      [key, readValue,listenToAllWindows],
    )
  
    // this only works for other documents, not the current one
    useEventListener('storage', handleStorageChange)
  
    // this is a custom event, triggered in writeValueToLocalStorage
    // See: useLocalStorage()
    useEventListener('local-storage', handleStorageChange)
  
    return [storedValue, setValue]
  }
  
  export default useLocalStorage
  
  // A wrapper for "JSON.parse()"" to support "undefined" value
  function parseJSON<T>(value: string | null): T | undefined {
    try {
      return value === 'undefined' ? undefined : JSON.parse(value ?? '')
    } catch {
      console.log('parsing error on', { value })
      return undefined
    }
  }
  