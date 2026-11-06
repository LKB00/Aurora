// A realistic iPhone around the app. The app runs in an iframe of exactly iPhone size, so it gets a true phone viewport:
// its breakpoints, full-screen sheets and safe areas all behave as they would on a device.
import { useEffect, useState } from 'react'
import './device.css'

const W = 418
const H = 872

function StatusIcons() {
  return (
    <span className="iphone-status-right" aria-hidden>
      <svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="8" width="3.2" height="4" rx="1" fill="#000" /><rect x="5" y="5.5" width="3.2" height="6.5" rx="1" fill="#000" /><rect x="10" y="3" width="3.2" height="9" rx="1" fill="#000" /><rect x="15" y="0" width="3.2" height="12" rx="1" fill="#000" /></svg>
      <svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.4c2.3 0 4.4.9 6 2.4l1.1-1.2A10.3 10.3 0 0 0 8.5.7C5.7.7 3.2 1.8 1.4 3.6l1.1 1.2a8.6 8.6 0 0 1 6-2.4Zm0 3.4c1.4 0 2.7.5 3.7 1.4l1.1-1.2a7.2 7.2 0 0 0-4.8-1.9c-1.8 0-3.5.7-4.8 1.9l1.1 1.2c1-.9 2.3-1.4 3.7-1.4Zm0 3.3c.6 0 1.2.2 1.6.6L8.5 11.6 6.9 9.7c.4-.4 1-.6 1.6-.6Z" fill="#000" /></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="#000" opacity="0.4" /><rect x="2" y="2" width="20" height="9" rx="2.6" fill="#000" /><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" fill="#000" opacity="0.45" /></svg>
    </span>
  )
}

export function IPhoneFrame() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 32) / H, (window.innerWidth - 32) / W))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return (
    <div className="iphone-stage">
      <div className="iphone" style={{ transform: `scale(${scale})` }}>
        <span className="iphone-btn" style={{ left: -3, top: 150, height: 34 }} />
        <span className="iphone-btn" style={{ left: -3, top: 214, height: 62 }} />
        <span className="iphone-btn" style={{ left: -3, top: 290, height: 62 }} />
        <span className="iphone-btn" style={{ right: -3, top: 230, height: 96 }} />
        <div className="iphone-body" />
        <div className="iphone-bezel" />
        <div className="iphone-screen">
          <iframe title="Aurora" src={`${location.pathname}?embed=ios`} />
          <div className="iphone-status" aria-hidden><span>9:41</span><StatusIcons /></div>
          <div className="iphone-island" />
          <div className="iphone-home" />
        </div>
        <div className="iphone-glare" />
      </div>
    </div>
  )
}
