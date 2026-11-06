import { describe, expect, it } from 'vitest'
import type { CallRecord, Evidence, Requirement } from '../types'
import { buildBusinessView, classifyBusiness, contactSummary, evaluateRequirement, searchOutcome } from './evaluate'
import { iphoneBusinesses, iphoneCalls, iphoneEvidence, iphoneRequirements } from '../data/iphone'
import { dentistBusinesses, dentistCalls, dentistEvidence, dentistRequirements } from '../data/dentist'
import { plumbingEvidence, plumbingRequirements } from '../data/plumbing'

const NOW = '2026-11-03T19:05:00+05:30'
const ctx = { now: NOW }
const req = (id: string) => iphoneRequirements.find((r) => r.id === id)!
const base: Omit<Evidence, 'id' | 'requirementId' | 'fit' | 'status' | 'statement'> = {
  businessId: 'x', round: 0, source: 'business_call', obtainedAt: '2026-11-03T18:40:00+05:30', origin: 'simulated',
}
const e = (requirementId: string, over: Partial<Evidence>): Evidence =>
  ({ id: Math.random().toString(36), requirementId, fit: 'unknown', status: 'business_stated', statement: '', ...base, ...over }) as Evidence

const view = (bizId: string) =>
  buildBusinessView(iphoneBusinesses.find((b) => b.id === bizId)!, iphoneRequirements, iphoneEvidence, iphoneCalls, ctx)

describe('requirement evaluation', () => {
  it('treats "not checked" as unknown, never as "does not meet"', () => {
    const v = evaluateRequirement(req('variant'), [], ctx)
    expect(v.display).toBe('not_checked')
    expect(v.fit).toBe('unknown')
  })

  it('a no-answer call does not make a business unsuitable', () => {
    const pai = view('pai')
    expect(pai.contact.state).toBe('no_answer')
    expect(pai.contact.attempts).toBe(2)
    expect(pai.views.find((v) => v.requirement.id === 'variant')!.fit).toBe('unknown')
    expect(pai.suitability).not.toBe('not_suitable')
  })

  it('a different variant does not satisfy an exact-variant must-have, but is shown as an alternative', () => {
    const v = view('ven').views.find((x) => x.requirement.id === 'variant')!
    expect(v.fit).not.toBe('meets')
    expect(v.alternative).toBe('512GB')
    expect(v.display).toBe('awaiting')
  })

  it('a promise to check is awaiting confirmation, not confirmed', () => {
    const v = evaluateRequirement(req('variant'), [e('variant', { status: 'awaiting_confirmation', fit: 'meets' })], ctx)
    expect(v.display).toBe('awaiting')
    expect(v.fit).toBe('unknown')
  })

  it('a conditional answer is not treated as an unconditional confirmation', () => {
    const v = evaluateRequirement(req('pickup'), [e('pickup', { fit: 'meets', condition: 'Only before 8 PM' })], ctx)
    expect(v.fit).toBe('partial')
    expect(v.display).toBe('conditional')
    const plumbingRepair = evaluateRequirement(plumbingRequirements[0], plumbingEvidence.filter((x) => x.businessId === 'm1'), ctx)
    expect(plumbingRepair.display).toBe('conditional')
  })

  it('conflicting sources produce a conflict state', () => {
    const v = evaluateRequirement(req('variant'), [e('variant', { fit: 'meets' }), e('variant', { fit: 'does_not_meet' })], ctx)
    expect(v.display).toBe('conflicting')
    expect(v.fit).toBe('unknown')
    // Dentist: transcript says 6:30 PM, summary says not confirmed.
    const dateReq = dentistRequirements.find((r) => r.id === 'date')!
    const d1 = evaluateRequirement(dateReq, dentistEvidence.filter((x) => x.businessId === 'd1'), ctx)
    expect(d1.display).toBe('conflicting')
  })

  it('claims Aurora displayed without a visible source are not counted as verified', () => {
    const d2 = buildBusinessView(dentistBusinesses[1], dentistRequirements, dentistEvidence, dentistCalls, ctx)
    expect(d2.business.auroraMatch).toBe(100)
    expect(d2.views.every((v) => v.display === 'unattributed')).toBe(true)
    expect(d2.suitability).toBe('insufficient')
  })

  it('price is re-assessed against an edited budget without changing the evidence', () => {
    const price = e('price', { fit: 'meets', priceValue: 118000 })
    expect(evaluateRequirement(req('price'), [price], ctx).fit).toBe('meets')
    expect(evaluateRequirement({ ...req('price'), budget: 115000 }, [price], ctx).fit).toBe('does_not_meet')
  })

  it('time-sensitive evidence becomes "may be out of date" after the stale window', () => {
    const later = { now: '2026-11-04T10:00:00+05:30' }
    const v = evaluateRequirement(req('variant'), [e('variant', { fit: 'meets' })], later)
    expect(v.display).toBe('outdated')
    const payment = iphoneRequirements.find((r) => r.id === 'payment') as Requirement
    expect(evaluateRequirement(payment, [e('payment', { fit: 'meets' })], later).display).toBe('confirmed')
  })
})

describe('follow-up updates', () => {
  const original = iphoneEvidence.filter((x) => x.businessId === 'ven')

  it('a partial follow-up updates only the requirements it answered', () => {
    const followUp = [e('variant', { businessId: 'ven', round: 1, fit: 'meets' })]
    const before = iphoneRequirements.map((r) => evaluateRequirement(r, original, ctx))
    const after = iphoneRequirements.map((r) => evaluateRequirement(r, [...original, ...followUp], ctx))
    expect(after[0].display).toBe('confirmed')
    expect(after[0].history.length).toBeGreaterThan(0) // old evidence is kept
    after.slice(1).forEach((v, i) => expect(v.display).toBe(before[i + 1].display))
  })

  it('a no-answer follow-up does not change existing requirement fit', () => {
    const calls: CallRecord[] = [...iphoneCalls, { id: 'f', businessId: 'ven', kind: 'follow_up', outcome: 'no_answer', at: NOW, summary: [], origin: 'simulated' }]
    const before = buildBusinessView(iphoneBusinesses[0], iphoneRequirements, iphoneEvidence, iphoneCalls, ctx)
    const after = buildBusinessView(iphoneBusinesses[0], iphoneRequirements, iphoneEvidence, calls, ctx)
    expect(after.views.map((v) => v.fit)).toEqual(before.views.map((v) => v.fit))
    expect(after.suitability).toBe(before.suitability)
    expect(after.contact.state).toBe('no_answer')
  })

  it('only fresh, confirmed must-haves make a business suitable', () => {
    const confirmed = ['variant', 'price', 'pickup'].map((id) => e(id, { fit: 'meets', priceValue: id === 'price' ? 118000 : undefined }))
    const views = iphoneRequirements.map((r) => evaluateRequirement(r, confirmed, ctx))
    expect(classifyBusiness(views)).toBe('suitable')
    const stale = iphoneRequirements.map((r) => evaluateRequirement(r, confirmed, { now: '2026-11-05T10:00:00+05:30' }))
    expect(classifyBusiness(stale)).not.toBe('suitable')
  })
})

describe('search outcome', () => {
  it('process completion does not automatically mean the user’s task succeeded', () => {
    const businesses = ['ven', 'pai', 'srisai'].map(view)
    expect(searchOutcome('completed', true, businesses)).toBe('partial_options_only')
    expect(searchOutcome('completed', true, businesses)).not.toBe('suitable_options_found')
  })

  it('is not evaluated while the search is still running', () => {
    expect(searchOutcome('contacting', false, ['ven'].map(view))).toBe('not_yet_evaluated')
  })

  it('distinguishes "no businesses" from "unable to verify"', () => {
    expect(searchOutcome('completed', true, [])).toBe('no_businesses_found')
    const none = { suitability: 'insufficient' as const, contact: contactSummary([]) }
    expect(searchOutcome('completed', true, [none])).toBe('unable_to_verify')
  })
})
