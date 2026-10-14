import { useContext } from 'react'
import { DialogContext } from './DialogContext'

// { confirm(options) -> Promise<{ confirmed, checked }>, alert(message) }
export function useDialog() {
  return useContext(DialogContext)
}
