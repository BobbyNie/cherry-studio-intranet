import { addCollection } from '@iconify/react'
import { icons as materialIconThemeIcons } from '@iconify-json/material-icon-theme'

let registered = false

export function registerIconifyCollections(): void {
  if (registered) {
    return
  }

  addCollection(materialIconThemeIcons)
  registered = true
}
