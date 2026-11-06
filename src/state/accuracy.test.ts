// Tests for the refinement brief: information accuracy (Tests A–E), follow-up outcomes, actions and navigation.
import { describe, expect, it } from 'vitest'
import { derive, initialState, reducer, type Action, type AppState } from './store'
import { nextAction, suggestedBusiness } from '../logic/copy'

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s)
const biz = (s: AppState, id: string) => derive(s).businesses.find((b) => b.business.id === id)!
const req = (s: AppState, bid: string, rid: string) => biz(s, bid).views.find((v) => v.requirement.id === rid)!
const call = (s: AppState, id: string, reqs: string[]) =>
  run(s, { type: 'FU_START', businessId: id, preselect: reqs }, { type: 'FU_REVIEW' }, { type: 'FU_APPROVE' }, { type: 'FU_ADVANCE' }, { type: 'FU_ADVANCE' }, { type: 'FU_ADVANCE' })

describe('Test A – iPhone, Venkateshwara partial verification', () => {
  it('512GB is reported as an alternative; 256GB, price and pickup stay unknown', () => {
    const s = initialState('iphone-results')
    expect(req(s, 'ven', 'variant').alternative).toBe('512GB')
    expect(req(s, 'ven', 'variant').fit).toBe('unknown')
    expect(req(s, 'ven', 'variant').display).toBe('awaiting')
    expect(req(s, 'ven', 'price').display).toBe('unanswered')
    expect(req(s, 'ven', 'pickup').display).toBe('unanswered')
  })
  it('a follow-up updates only what it answered and keeps the original evidence', () => {
    const s = call(initialState('iphone-results'), 'ven', ['variant', 'price', 'pickup'])
    const r = s.followUp!.result!
    expect(r.suitabilityBefore).toBe('potential')
    expect(r.suitabilityAfter).toBe('suitable')
    expect(req(s, 'ven', 'variant').history.map((e) => e.origin)).toEqual(['observed', 'observed'])
    expect(req(s, 'ven', 'colour').display).toBe('unanswered') // not asked → untouched
    expect(r.changes.every((c) => c.simulated)).toBe(true)
    expect(biz(s, 'ven').calls.filter((c) => c.kind === 'original')).toHaveLength(2)
  })
})

describe('Test B – iPhone, Pai International unanswered', () => {
  it('shows two unanswered attempts and never becomes unsuitable', () => {
    let s = initialState('iphone-noanswer')
    expect(biz(s, 'pai').contact.attempts).toBe(2)
    expect(biz(s, 'pai').contact.reached).toBe(false)
    expect(req(s, 'pai', 'variant').display).toBe('no_answer')
    expect(req(s, 'pai', 'payment').display).toBe('unattributed') // "Cards accepted" has no visible source
    expect(nextAction(biz(s, 'pai'))?.label).toBe('Retry call')
    s = call(s, 'pai', ['variant', 'price', 'pickup'])
    expect(s.followUp!.result!.outcome).toBe('no_answer')
    expect(biz(s, 'pai').contact.attempts).toBe(3)
    expect(biz(s, 'pai').suitability).toBe('insufficient')
    expect(req(s, 'pai', 'variant').display).toBe('no_answer')
  })
  it('“Retry call” goes back to review – the user approves again', () => {
    const s = run(call(initialState('iphone-noanswer'), 'pai', ['variant']), { type: 'FU_RETRY' })
    expect(s.followUp!.phase).toBe('review')
  })
})

describe('Test C – Dentist in Kanakapura Road', () => {
  it('itemises starting price and consultation fee, keeps the appointment conflict, is not fully verified', () => {
    const s = initialState('dentist')
    const price = req(s, 'd1', 'budget')
    expect(price.display).toBe('conditional')
    expect(price.primary!.details).toEqual(expect.arrayContaining([expect.stringContaining('₹800'), expect.stringContaining('₹400')]))
    expect(price.primary!.condition).toMatch(/examination/)
    expect(req(s, 'd1', 'date').display).toBe('conflicting')
    expect(req(s, 'd1', 'date').current).toHaveLength(2)
    expect(biz(s, 'd1').suitability).not.toBe('suitable')
    expect(nextAction(biz(s, 'd1'))?.label).toBe('Resolve discrepancy')
  })
})

describe('Test D – Special Smiles, no useful information', () => {
  it('positive claims are not attributed to the unsuccessful call', () => {
    const s = initialState('dentist')
    const b = biz(s, 'd2')
    expect(b.calls[0].outcome).toBe('completed_insufficient_information')
    b.views.forEach((v) => {
      expect(v.display).toBe('unattributed')
      expect(v.fit).toBe('unknown')
      v.current.forEach((e) => expect(e.source).toBe('aurora_display'))
    })
    expect(b.suitability).toBe('insufficient')
  })
  it('Imperial Dental: ₹1,250 is from the call; 5 PM is not established for the requested date', () => {
    const s = initialState('dentist')
    expect(req(s, 'd3', 'budget').primary!.source).toBe('business_call')
    expect(req(s, 'd3', 'date').fit).toBe('unknown')
    expect(req(s, 'd3', 'date').primary!.statement).toMatch(/differs from 3 November/)
  })
})

describe('Test E – Plumbing, Meenakshi conditional in-shop repair', () => {
  it('no budget claim, inspection pending, location discrepancy visible', () => {
    const s = initialState('plumbing')
    const reqs = derive(s).requirements
    expect(reqs.some((r) => r.budget != null)).toBe(false)
    expect(reqs.some((r) => /budget/i.test(r.label))).toBe(false)
    const cost = req(s, 'm1', 'cost')
    expect(cost.requirement.kind).toBe('informational')
    expect(cost.display).toBe('conditional') // ₹20 is attributed and not a guaranteed final price
    expect(req(s, 'm1', 'repair').display).toBe('conditional')
    expect(req(s, 'm1', 'repair').primary!.condition).toMatch(/Inspection is still pending/)
    expect(req(s, 'm1', 'mode').primary!.statement).toMatch(/not an on-site/)
    expect(req(s, 'm1', 'area').display).toBe('conflicting')
    expect(biz(s, 'm1').business.addressDiscrepancy).toMatch(/BTM Layout/)
    expect(biz(s, 'm1').suitability).toBe('potential')
  })
})

describe('Sri Sai – discovered only', () => {
  it('is not contacted and nothing is checked', () => {
    const s = initialState('iphone-results')
    expect(biz(s, 'srisai').contact.state).toBe('not_attempted')
    biz(s, 'srisai').views.forEach((v) => expect(v.display).toBe('not_checked'))
    expect(nextAction(biz(s, 'srisai'))?.label).toBe('Ask Aurora to call')
  })
})

describe('Follow-up outcome model', () => {
  it('a contradictory answer keeps both statements, carries conditions and suggests resolving it', () => {
    const s = call(initialState('iphone-conflict'), 'ven', ['variant', 'pickup'])
    const r = s.followUp!.result!
    const variant = r.changes.find((c) => c.requirementId === 'variant')!
    expect(variant.after).toBe('conflicting')
    expect(variant.statements).toHaveLength(2)
    expect(variant.conflict).toBe(true)
    expect(r.changes.find((c) => c.requirementId === 'pickup')!.condition).toMatch(/8 PM/)
    expect(nextAction(biz(s, 'ven'))?.label).toBe('Resolve discrepancy')
  })
  it('a partial answer leaves the rest open and listed as still open', () => {
    const s = call(initialState('iphone-partial'), 'ven', ['variant', 'price', 'pickup'])
    const r = s.followUp!.result!
    expect(r.stillOpen!.map((o) => o.requirementId)).toEqual(expect.arrayContaining(['price', 'pickup']))
    expect(r.suitabilityAfter).toBe('potential')
  })
})

describe('Actions and suggestions', () => {
  it('never suggests a business when nothing singles one out (all unanswered)', () => {
    expect(suggestedBusiness(derive(initialState('edge-all-unanswered')).businesses)).toBeNull()
  })
  it('suggests the single possible option', () => {
    expect(suggestedBusiness(derive(initialState('iphone-results')).businesses)?.business.id).toBe('ven')
  })
  it('a suitable business gets “Review option”', () => {
    const s = call(initialState('iphone-results'), 'ven', ['variant', 'price', 'pickup'])
    expect(nextAction(biz(s, 'ven'))?.label).toBe('Review option')
  })
})

describe('Navigation history', () => {
  it('browser Back then Forward returns to the same screen', () => {
    let s = initialState('iphone-results') // [chat, results]
    s = run(s, { type: 'PUSH', route: { name: 'business', id: 'ven' } })
    s = run(s, { type: 'GO', depth: 2 })
    expect(s.stack.at(-1)!.name).toBe('results')
    s = run(s, { type: 'GO', depth: 3 })
    expect(s.stack.at(-1)).toEqual({ name: 'business', id: 'ven' })
  })
  it('a new push clears the forward history', () => {
    let s = run(initialState('iphone-results'), { type: 'PUSH', route: { name: 'business', id: 'ven' } }, { type: 'GO', depth: 2 })
    s = run(s, { type: 'PUSH', route: { name: 'compare' } })
    expect(s.future).toEqual([])
  })
})
