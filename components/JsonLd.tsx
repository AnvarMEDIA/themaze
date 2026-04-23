/**
 * Renders a JSON-LD <script> tag with Schema.org structured data.
 * Accepts a single object or an array of objects; arrays are wrapped in @graph.
 */
interface Props {
  data: Record<string, unknown> | Record<string, unknown>[]
  id?: string
}

export function JsonLd({ data, id }: Props) {
  const payload = Array.isArray(data)
    ? data.length === 1
      ? data[0]
      : { '@context': 'https://schema.org', '@graph': data }
    : data

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
