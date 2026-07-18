import { Scale } from 'lucide-react'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Katiba OS home">
      <span className="brand-mark"><Scale aria-hidden="true" size={21} strokeWidth={2.2} /></span>
      {!compact && <span className="brand-name">Katiba<span>OS</span></span>}
    </div>
  )
}
