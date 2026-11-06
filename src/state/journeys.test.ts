// End-to-end journeys through the real reducer + derived state (brief §12 smoke tests).
import { describe, expect, it } from 'vitest'
import { derive, initialState, reducer, type Action, type AppState } from './store'

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s)
const biz = (s: AppState, id: string) => derive(s).businesses.find((b) => b.business.id === id)!
const req = (s: AppState, bid: string, rid: string) => biz(s, bid).views.find((v) => v.requirement.id === rid)!
const tickToEnd = (s: AppState) => {
  for (let i = 0; i < 20; i++) s = reducer(s, { type: 'TICK' })
  return s
}
const followUp = (s: AppState, id: string, reqs: string[]) =>
  run(s, { type: 'FU_START', businessId: id, preselect: reqs }, { type: 'FU_REVIEW' }, { type: 'FU_APPROVE' }, { type: 'FU_ADVANCE' }, { type: 'FU_ADVANCE' }, { type: 'FU_ADVANCE' })

describe('primary iPhone journey', () => {
  it('runs the live search stage by stage, and completion is not success', () => {
    let s = initialState('iphone-live-observed')
    expect(derive(s).process).toBe('discovering')
    expect(derive(s).businesses).toHaveLength(0)
    s = reducer(s, { type: 'TICK' })
    expect(derive(s).timeline.stages.discover.status).toBe('done')
    expect(derive(s).timeline.stages.contact.status).toBe('active')
    s = reducer(s, { type: 'TICK' }) // partial results while calls continue
    expect(derive(s).outcome).toBe('not_yet_evaluated')
    expect(biz(s, 'ven').calls.length).toBeGreaterThan(0)
    s = tickToEnd(s)
    expect(derive(s).process).toBe('completed')
    expect(derive(s).outcome).toBe('partial_options_only')
  })

  it('Venkateshwara: 512GB reported, 256GB unconfirmed', () => {
    const s = initialState('iphone-results')
    const v = req(s, 'ven', 'variant')
    expect(v.display).toBe('awaiting')
    expect(v.alternative).toBe('512GB')
    expect(biz(s, 'ven').suitability).toBe('potential')
  })

  it('a follow-up needs approval, updates only what was asked, and every screen reads the same record', () => {
    let s = initialState('iphone-results')
    s = run(s, { type: 'FU_START', businessId: 'ven', preselect: ['variant', 'price', 'pickup'] }, { type: 'FU_REVIEW' })
    // Nothing happens without approval.
    expect(run(s, { type: 'FU_ADVANCE' }).calls.length).toBe(s.calls.length)
    s = run(s, { type: 'FU_APPROVE' }, { type: 'FU_ADVANCE' }, { type: 'FU_ADVANCE' }, { type: 'FU_ADVANCE' })
    expect(s.followUp?.phase).toBe('done')
    expect(req(s, 'ven', 'variant').display).toBe('confirmed')
    expect(req(s, 'ven', 'price').display).toBe('confirmed')
    expect(req(s, 'ven', 'pickup').display).toBe('confirmed')
    expect(req(s, 'ven', 'colour').display).toBe('unanswered') // not asked → unchanged
    expect(req(s, 'ven', 'variant').history.length).toBe(2) // original evidence kept
    expect(biz(s, 'ven').suitability).toBe('suitable')
    expect(derive(s).outcome).toBe('suitable_options_found')
    expect(biz(s, 'ven').calls.filter((c) => c.kind === 'original')).toHaveLength(2)
  })

  it('a no-answer follow-up changes nothing about fit', () => {
    const before = initialState('iphone-noanswer')
    const s = followUp(before, 'ven', ['variant', 'price', 'pickup'])
    expect(s.followUp?.result?.outcome).toBe('no_answer')
    expect(biz(s, 'ven').views.map((v) => v.display)).toEqual(biz(before, 'ven').views.map((v) => v.display))
    expect(biz(s, 'ven').contact.state).toBe('no_answer')
    expect(biz(s, 'ven').suitability).toBe('potential')
  })

  it('a partial follow-up leaves the unanswered items open', () => {
    const s = followUp(initialState('iphone-partial'), 'ven', ['variant', 'price', 'pickup'])
    expect(req(s, 'ven', 'variant').display).toBe('confirmed')
    expect(req(s, 'ven', 'price').display).toBe('awaiting')
    expect(biz(s, 'ven').suitability).toBe('potential')
  })

  it('a contradictory follow-up produces a conflict, not a confirmation', () => {
    const s = followUp(initialState('iphone-conflict'), 'ven', ['variant', 'pickup'])
    expect(req(s, 'ven', 'variant').display).toBe('conflicting')
    expect(req(s, 'ven', 'pickup').display).toBe('conditional')
    expect(biz(s, 'ven').suitability).not.toBe('suitable')
  })

  it('cancelling mid-call records a cancelled call and changes nothing else', () => {
    let s = initialState('iphone-results')
    s = run(s, { type: 'FU_START', businessId: 'ven', preselect: ['variant'] }, { type: 'FU_REVIEW' }, { type: 'FU_APPROVE' }, { type: 'FU_ADVANCE' }, { type: 'FU_CANCEL' })
    expect(s.followUp?.result?.cancelled).toBe(true)
    expect(biz(s, 'ven').contact.state).toBe('cancelled')
    expect(req(s, 'ven', 'variant').display).toBe('awaiting')
  })

  it('reset restores the original data', () => {
    let s = followUp(initialState('iphone-results'), 'ven', ['variant'])
    s = reducer(s, { type: 'RESET' })
    expect(req(s, 'ven', 'variant').display).toBe('awaiting')
    expect(s.calls.some((c) => c.kind === 'follow_up')).toBe(false)
  })

  it('switching scenarios never mixes data', () => {
    let s = followUp(initialState('iphone-results'), 'ven', ['variant'])
    s = reducer(s, { type: 'LOAD_SCENARIO', id: 'dentist' })
    expect(derive(s).businesses.map((b) => b.business.id)).toEqual(['d1', 'd2', 'd3'])
    expect(s.calls.some((c) => c.businessId === 'ven')).toBe(false)
  })

  it('moving the clock forward flags time-sensitive answers as possibly out of date', () => {
    let s = followUp(initialState('iphone-results'), 'ven', ['variant', 'price', 'pickup'])
    expect(biz(s, 'ven').suitability).toBe('suitable')
    s = reducer(s, { type: 'SET_HOURS_AHEAD', value: 15 })
    expect(req(s, 'ven', 'variant').display).toBe('outdated')
    expect(biz(s, 'ven').suitability).not.toBe('suitable')
  })
})

describe('cross-category and recovery states', () => {
  it('dentist: conflict, condition and unattributed claims', () => {
    const s = initialState('dentist')
    expect(req(s, 'd1', 'date').display).toBe('conflicting')
    expect(req(s, 'd1', 'budget').display).toBe('conditional')
    // 5 PM was offered for “today”; the summary flags the date differs – not established for 3 Nov.
    expect(req(s, 'd3', 'date').display).toBe('unanswered')
    expect(biz(s, 'd2').suitability).toBe('insufficient')
  })

  it('plumbing: drop-off repair is conditional and location conflicts', () => {
    const s = initialState('plumbing')
    expect(req(s, 'm1', 'repair').display).toBe('conditional')
    expect(req(s, 'm1', 'area').display).toBe('conflicting')
    expect(biz(s, 'm1').suitability).toBe('potential')
  })

  it.each([
    ['edge-none-found', 'no_businesses_found'],
    ['edge-all-unanswered', 'unable_to_verify'],
    ['edge-no-info', 'unable_to_verify'],
    ['edge-no-suitable', 'no_suitable_option_found'],
    ['edge-interrupted', 'not_yet_evaluated'],
    ['edge-failed', 'not_yet_evaluated'],
    ['edge-not-contacted', 'not_yet_evaluated'],
  ])('%s → %s', (id, outcome) => {
    expect(derive(initialState(id)).outcome).toBe(outcome)
  })

  it('all unanswered: requirements say "no answer yet", never "does not meet"', () => {
    const s = initialState('edge-all-unanswered')
    derive(s).businesses.forEach((b) => {
      expect(b.suitability).toBe('insufficient')
      b.views.forEach((v) => expect(v.display).toBe('no_answer'))
    })
  })

  it('interrupted search resumes and finishes with the observed results', () => {
    let s = initialState('edge-interrupted')
    expect(derive(s).process).toBe('interrupted')
    expect(biz(s, 'ven').calls.length).toBeGreaterThan(0) // saved partial answers
    s = tickToEnd(reducer(s, { type: 'RESUME' }))
    expect(derive(s).process).toBe('completed')
    expect(derive(s).outcome).toBe('partial_options_only')
  })

  it('stopping a live search keeps answers and can resume', () => {
    let s = run(initialState('iphone-live'), { type: 'TICK' }, { type: 'TICK' }, { type: 'STOP_SEARCH' })
    expect(derive(s).process).toBe('cancelled')
    expect(reducer(s, { type: 'TICK' }).step).toBe(s.step) // stays stopped
    s = tickToEnd(reducer(s, { type: 'RESUME' }))
    expect(derive(s).process).toBe('completed')
  })

  it('no suitable option becomes suitable after raising the budget, without new calls', () => {
    let s = initialState('edge-no-suitable')
    const calls = s.calls.length
    s = reducer(s, { type: 'SET_BUDGET', value: 126000 })
    expect(derive(s).outcome).toBe('suitable_options_found')
    expect(biz(s, 'pai').suitability).toBe('suitable')
    expect(s.calls.length).toBe(calls)
  })
})
