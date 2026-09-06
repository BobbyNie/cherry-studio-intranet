import { describe, expect, it } from 'vitest'

import enUS from '../locales/en-us.json'
import zhCN from '../locales/zh-cn.json'
import zhTW from '../locales/zh-tw.json'
import deDE from '../translate/de-de.json'
import elGR from '../translate/el-gr.json'
import esES from '../translate/es-es.json'
import frFR from '../translate/fr-fr.json'
import jaJP from '../translate/ja-jp.json'
import ptPT from '../translate/pt-pt.json'
import roRO from '../translate/ro-ro.json'
import ruRU from '../translate/ru-ru.json'
import viVN from '../translate/vi-vn.json'

const resources = [
  { name: 'en-US', resource: enUS, administrator: /administrator/i, publicBilling: /recharge|top up|website/i },
  { name: 'zh-CN', resource: zhCN, administrator: /管理员/, publicBilling: /充值|网站/ },
  { name: 'zh-TW', resource: zhTW, administrator: /管理員/, publicBilling: /儲值|網站/ },
  { name: 'de-DE', resource: deDE, administrator: /administrator/i, publicBilling: /aufladen|website/i },
  { name: 'el-GR', resource: elGR, administrator: /διαχειριστή/i, publicBilling: /πίστωση|ιστότοπο/i },
  { name: 'es-ES', resource: esES, administrator: /administrador/i, publicBilling: /recarg|sitio web/i },
  { name: 'fr-FR', resource: frFR, administrator: /administrateur/i, publicBilling: /recharg|site web/i },
  { name: 'ja-JP', resource: jaJP, administrator: /管理者/, publicBilling: /チャージ|サイト/ },
  { name: 'pt-PT', resource: ptPT, administrator: /administrador/i, publicBilling: /carreg|site/i },
  { name: 'ro-RO', resource: roRO, administrator: /administrator/i, publicBilling: /alimente|site/i },
  { name: 'ru-RU', resource: ruRU, administrator: /администратор/i, publicBilling: /пополн|сайт/i },
  { name: 'vi-VN', resource: viVN, administrator: /quản trị/i, publicBilling: /nạp tiền|trang/i }
]

describe('intranet error messages', () => {
  it.each(resources)('$name keeps quota and HTTP 402 guidance inside the configured-provider boundary', (locale) => {
    const messages = [locale.resource.error.diagnosis.quota, locale.resource.error.http['402']]

    for (const message of messages) {
      expect(message).toMatch(locale.administrator)
      expect(message).not.toMatch(locale.publicBilling)
    }
  })
})
