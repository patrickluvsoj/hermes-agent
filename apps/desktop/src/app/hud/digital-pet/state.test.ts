import { beforeEach, describe, expect, it } from 'vitest'

import { $digitalPetHudEnabled } from './state'

beforeEach(() => {
  window.localStorage.clear()
  $digitalPetHudEnabled.set(false)
})

describe('Digital Pet HUD preference', () => {
  it('defaults to Standard HUD and persists explicit opt-in', () => {
    expect($digitalPetHudEnabled.get()).toBe(false)

    $digitalPetHudEnabled.set(true)

    expect(window.localStorage.getItem('hermes.desktop.hud.digital-pet.v1')).toBe('true')
  })
})
