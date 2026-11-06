// The chat composer: typed instructions change only what the prototype can change honestly, and never place a call.
import { describe, expect, it } from 'vitest'
import { derive, initialState, reducer, type AppState } from './store'

const say = (s: AppState, text: string) => reducer(s, { type: 'CHAT_SAY', text })
const last = (s: AppState) => s.chat![s.chat!.length - 1]

describe('chat composer', () => {
  it('changes importance and re-checks answers without calling anyone', () => {
    const s0 = initialState('dentist')
    const s = say(s0, 'Self-pay doesn’t matter')
    expect(derive(s).requirements.find((r) => r.id === 'payment')?.kind).toBe('informational')
    expect(s.calls).toHaveLength(s0.calls.length)
    expect(last(s).text).toMatch(/self-pay is now good to know.*nobody was called/i)
    expect(s.chat![0]).toMatchObject({ role: 'user', text: 'Self-pay doesn’t matter' })
  })

  it('sets the budget from a typed amount', () => {
    const s = say(initialState('iphone-results'), 'Set my budget to ₹1,25,000')
    expect(s.budget).toBe(125000)
    expect(last(s).text).toMatch(/₹1,25,000/)
  })

  it('turns “check X at a business” into the review step – never a call', () => {
    const s0 = initialState('dentist')
    const s = say(s0, 'Only check the slot on 3 Nov at Happy Client')
    expect(last(s).actions?.[0]).toMatchObject({ kind: 'review', ids: ['date'] })
    expect(s.followUp).toBeNull()
    expect(s.calls).toHaveLength(s0.calls.length)
  })

  it('asks which business when none is named', () => {
    const s = say(initialState('iphone-results'), 'Check the final price')
    expect(last(s).text).toMatch(/Which business/)
    expect(last(s).actions!.length).toBeGreaterThan(1)
  })

  it('refuses to fake a new search', () => {
    const s0 = initialState('iphone-results')
    const s = say(s0, 'Find one in Indiranagar instead')
    expect(last(s).text).toMatch(/new search can’t be started/)
    expect(derive(s).requirements).toEqual(derive(s0).requirements)
  })

  it('compares and explains named businesses', () => {
    const s = say(initialState('iphone-results'), 'Compare Venkateshwara and Pai')
    expect(last(s).actions?.[0]).toMatchObject({ kind: 'compare', ids: ['ven', 'pai'] })
    const w = say(initialState('iphone-results'), 'Why Pai?')
    expect(last(w).text).toMatch(/weren’t|reached|answer/i)
  })

  it('waits for results before acting on businesses, and says when it doesn’t understand', () => {
    expect(last(say(initialState('iphone-live'), 'Check the price at Venkateshwara')).text).toMatch(/once the calls finish/)
    expect(last(say(initialState('iphone-results'), 'hello')).text).toMatch(/didn’t catch that/)
  })
})
