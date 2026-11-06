// A place on a map. Tattva's own PinIcon is a drawing pin, which means "pinned", not "location", and it has no map-marker icon, so this one is drawn
// here in Tattva's icon style (24 grid, 1.5 stroke, round caps). A gap to report back to the design system.
import type { SVGProps } from 'react'

export function LocationIcon({ width = 16, height = 16, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  )
}
