import { pluralRu } from './utils'

/**
 * What an IndexNow submission's answer means, in words for the admin's
 * toasts (components/admin/NotifyIndexingButton, PressKitInteractive).
 * Client-safe: lib/indexing itself is server-only. The codes are the
 * protocol's (https://www.indexnow.org/documentation).
 */

/** What /api/admin/notify-indexing answers (lib/indexing, IndexNowResult). */
export interface IndexNowReply {
  ok?: boolean
  status?: number
  submitted?: number
}

export function indexNowMessage(httpStatus: number, reply: IndexNowReply): { ok: boolean; text: string } {
  if (httpStatus === 401) return { ok: false, text: 'Сессия админки закончилась — войдите заново.' }
  const n = reply.submitted ?? 0
  const urls = `${n} ${pluralRu(n, 'адрес', 'адреса', 'адресов')}`
  if (reply.ok) {
    if (n === 0) return { ok: true, text: 'IndexNow: отправлять нечего' }
    // 202: the addresses are taken, the key file is still being checked.
    return { ok: true, text: reply.status === 202 ? `IndexNow принял ${urls} · ключ ещё проверяется` : `IndexNow принял ${urls}` }
  }
  switch (reply.status) {
    case undefined:
      return { ok: false, text: httpStatus >= 400 ? `Не удалось отправить (ошибка ${httpStatus})` : 'Нет связи с IndexNow — повторите позже' }
    case 400:
      return { ok: false, text: 'IndexNow: неверный запрос (400)' }
    case 403:
      return { ok: false, text: 'IndexNow не принял ключ (403): файла ключа на сайте нет, или в нём другой ключ' }
    case 422:
      return { ok: false, text: 'IndexNow отклонил адреса (422): они не относятся к сайту или к его файлу ключа' }
    case 429:
      return { ok: false, text: 'IndexNow: слишком много отправок (429) — повторите позже' }
    default:
      return { ok: false, text: `IndexNow ответил ошибкой ${reply.status}` }
  }
}
