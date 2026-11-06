import { useApp, useNav } from '../state/store'

export function useStartFollowUp() {
  const { dispatch } = useApp()
  const nav = useNav()
  return (businessId: string, preselect: string[]) => {
    dispatch({ type: 'FU_START', businessId, preselect })
    nav.push({ name: 'followup', id: businessId })
  }
}
