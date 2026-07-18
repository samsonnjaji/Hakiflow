export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="Katiba OS home">
      <img className={compact ? 'brand-icon-image' : 'brand-wordmark-image'} src={compact ? '/katiba-icon.png' : '/katiba-wordmark.png'} alt="" aria-hidden="true" />
    </div>
  )
}
