import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { EASE_SPRING, SPRING_MS } from './ui/motion'
import { IPhoneFrame } from './device/IPhoneFrame'

// Three ways to show the same app:
//  • inside the mockup's iframe (?embed=ios): a phone viewport with the iPhone's status bar and home-indicator areas reserved
//  • by default: the iPhone mockup around it, scaled to fit any window
//  • with ?bare in the address: the app alone, using the device's own safe areas (for a real phone)
// The shared spring curve, available to any CSS transition as var(--ease-spring) / var(--dur-spring).
document.documentElement.style.setProperty('--ease-spring', EASE_SPRING)
document.documentElement.style.setProperty('--dur-spring', `${SPRING_MS}ms`)
const embedded = new URLSearchParams(location.search).get('embed') === 'ios'
if (embedded) {
  document.documentElement.setAttribute('data-ios', '')
  document.documentElement.style.setProperty('--safe-top', '54px')
  document.documentElement.style.setProperty('--safe-bottom', '34px')
}

// The mockup is the default everywhere. The bare app (for testing on a real phone) is opt-in: add ?bare to the address.
// It used to guess "this is a phone" from touch support, which wrongly hid the mockup in browsers that report touch.
const bare = new URLSearchParams(location.search).has('bare')

function Root() {
  if (embedded || bare) return <App />
  return <IPhoneFrame />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
