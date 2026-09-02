import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $changeEventsAvailable, $petChange } from '@/store/live-sync'
import { $petInfo } from '@/store/pet'
import { $activeGatewayProfile } from '@/store/profile'
import { $gatewayState } from '@/store/session'

import { PET_STARTUP_RETRY_MS } from './pet-info-poll'
import { usePetInfoSync } from './use-pet-info-sync'

beforeEach(() => {
  $changeEventsAvailable.set(false)
  $petChange.set({ tick: 0 })
  $gatewayState.set('open')
  $petInfo.set({ enabled: false })
  $activeGatewayProfile.set('default')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePetInfoSync', () => {
  it('loads the full sprite once, then refreshes active pets through metadata', async () => {
    const request = vi.fn(async (method: string) => {
      if (method === 'pet.info.meta') {
        return { enabled: true, scale: 0.33, slug: 'boba', spritesheetRevision: 'r1' }
      }

      return {
        displayName: 'Boba',
        enabled: true,
        scale: 0.33,
        slug: 'boba',
        spritesheetBase64: 'sprite',
        spritesheetRevision: 'r1'
      }
    })

    const { result } = renderHook(() => usePetInfoSync(request as never))

    await waitFor(() => expect(result.current.enabled).toBe(true))
    await waitFor(() => expect(request).toHaveBeenCalledWith('pet.info.meta', expect.anything()))

    expect(request.mock.calls.filter(([method]) => method === 'pet.info')).toHaveLength(1)
  })

  it('retries a cold-start disabled response without waiting for the backstop poll', async () => {
    vi.useFakeTimers()

    const request = vi
      .fn()
      .mockResolvedValueOnce({ enabled: false })
      .mockResolvedValueOnce({ enabled: true, slug: 'boba', spritesheetBase64: 'sprite' })

    const { result } = renderHook(() => usePetInfoSync(request as never))

    await act(async () => undefined)
    expect(request).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PET_STARTUP_RETRY_MS[0])
    })

    expect(request.mock.calls.filter(([method]) => method === 'pet.info')).toHaveLength(2)
    expect(request).toHaveBeenCalledWith('pet.info.meta', expect.anything())
    expect(result.current.enabled).toBe(true)
  })

  it('cannot publish an old profile response after the active profile changes', async () => {
    let resolveDefault: (value: unknown) => void = () => undefined

    const defaultResponse = new Promise(resolve => {
      resolveDefault = resolve
    })

    const request = vi.fn((_method: string, params: { profile?: string }) =>
      params.profile === 'default' ? defaultResponse : Promise.resolve({ enabled: false })
    )

    renderHook(() => usePetInfoSync(request as never))
    await waitFor(() => expect(request).toHaveBeenCalledWith('pet.info', expect.objectContaining({ profile: 'default' })))

    act(() => $activeGatewayProfile.set('work'))
    await waitFor(() => expect(request).toHaveBeenCalledWith('pet.info', expect.objectContaining({ profile: 'work' })))

    await act(async () => {
      resolveDefault({ enabled: true, slug: 'wrong-profile', spritesheetBase64: 'old' })
      await defaultResponse
    })

    expect($petInfo.get()).toEqual({ enabled: false })
  })
})
