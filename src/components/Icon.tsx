interface Props {
  name: string
  /** Tamanho em px (font-size). */
  size?: number
  filled?: boolean
  className?: string
}

/** Ícone do Material Symbols Outlined. */
export default function Icon({ name, size = 20, filled = false, className }: Props) {
  return (
    <span
      className={`material-symbols-outlined${className ? ` ${className}` : ''}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
