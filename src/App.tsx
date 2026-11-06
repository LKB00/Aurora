import { AppProvider, useApp, useNav, type Route } from './state/store'
import { StackNavigator } from './ui/StackNavigator'
import { Chat } from './screens/Chat'
import { Progress } from './screens/Progress'
import { Results } from './screens/Results'
import { Business } from './screens/Business'
import { Compare } from './screens/Compare'
import { FollowUp } from './screens/FollowUp'
import { Controls } from './ui/Demo'

const LABEL: Record<string, string> = { chat: 'Search', progress: 'Progress', results: 'Results', business: 'Business', compare: 'Compare', followup: 'Follow-up', controls: 'Controls' }

function renderRoute(r: Route) {
  switch (r.name) {
    case 'chat': return <Chat />
    case 'progress': return <Progress />
    case 'results': return <Results />
    case 'business': return <Business id={r.id} />
    case 'compare': return <Compare />
    case 'controls': return <Controls />
    case 'followup': return <FollowUp id={r.id} />
  }
}

function Router() {
  const { state } = useApp()
  const nav = useNav()
  return <StackNavigator stack={state.stack} render={renderRoute} labelFor={(r) => LABEL[r.name]} onBack={nav.back} />
}

export function App() {
  return (
    <AppProvider>
      <div className="app-root mx-auto box-border h-dvh w-full max-w-phone bg-bg">
        <Router />
      </div>
    </AppProvider>
  )
}
