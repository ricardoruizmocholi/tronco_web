interface Props {
  title: string
}

export default function PolicyPlaceholderPage({ title }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center">
      <h1 className="font-editorial text-3xl text-ink mb-4">{title}</h1>
      <p className="text-ink/50 text-sm">Contenido próximamente.</p>
    </div>
  )
}
