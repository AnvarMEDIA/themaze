import en from '@/messages/en.json'
import ru from '@/messages/ru.json'
import { WorldMapEditor } from '@/components/admin/WorldMapEditor'

/**
 * The homepage map's editor. A server page only to hand the editor the
 * section's heading in both languages from the site's own message files,
 * so the preview says exactly what the site does; the editor loads and
 * saves the map through /api/world-map. middleware.ts guards /admin.
 */
export default function AdminWorldMapPage() {
  return (
    <WorldMapEditor
      copy={{
        en: { heading: en.worldMap.heading },
        ru: { heading: ru.worldMap.heading },
      }}
    />
  )
}
