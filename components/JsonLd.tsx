/**
 * Renders a JSON-LD <script> tag with Schema.org structured data.
 * Accepts a single object or an array of objects; arrays are wrapped in @graph.
 */
interface Props {
  data: Record<string, unknown> | Record<string, unknown>[]
  id?: string
}

// U+2028 / U+2029 are valid in JSON strings but are JS line terminators,
// so they must be referenced via char code (never written literally in
// source). Combined with escaping `<`/`>`/`&`, this prevents any
// user-supplied field (project/post title, client name…) from breaking
// out of the inline <script> — i.e. stored XSS on every public page.
const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)

function escapeJsonForScript(value: string): string {
  return value
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(LS).join('\\u2028')
    .split(PS).join('\\u2029')
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
      dangerouslySetInnerHTML={{ __html: escapeJsonForScript(JSON.stringify(payload)) }}
    />
  )
}
