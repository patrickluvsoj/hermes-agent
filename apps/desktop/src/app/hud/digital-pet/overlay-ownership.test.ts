import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { $hudActive } from '@/store/hud'

import { useDigitalPetHudOverlayOwnership } from './overlay-ownership'
import { $digitalPetHudEnabled } from './state'

const { resumePetOverlay, suspendPetOverlay } = vi.hoisted(() => ({
  resumePetOverlay: vi.fn(),
  suspendPetOverlay: vi.fn()
}))

vi.mock('@/store/pet-overlay', () => ({
  resumePetOverlay,
  suspendPetOverlay
}))

vi.mock('@/store/windows', () => ({
  isAuxiliaryWindow: () => false,
  isHudWindow: () => false,
  isPeerInstanceWindow: () => false
}))

beforeEach(() => {
  resumePetOverlay.mockClear()
  suspendPetOverlay.mockClear()
  $digitalPetHudEnabled.set(false)
  $hudActive.set(false)
})

describe('useDigitalPetHudOverlayOwnership', () => {
  it('suspends a popped-out pet only while Digital Pet HUD is active', () => {
    renderHook(() => useDigitalPetHudOverlayOwnership())

    act(() => $digitalPetHudEnabled.set(true))
    act(() => $hudActive.set(true))

    expect(suspendPetOverlay).toHaveBeenCalled()

    act(() => $hudActive.set(false))

    expect(resumePetOverlay).toHaveBeenCalled()
  })
})
