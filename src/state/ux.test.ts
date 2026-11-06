// The experience layer reads the same state as everything else and never invents a fact, a count or a progress figure.
import { describe, expect, it } from 'vitest'
import { derive, initialState, reducer, type Action, type AppState } from './store'
import { buildMilestones, needsAttention, readInterpretation, usefulFindings } from '../logic/agent'
import { getScenario } from '../data/scenarios'

const run = (s: AppState, ...a: Action[]) => a.reduce(reducer, s)
const biz = (s: AppState, id: string) => derive(s).businesses.find((b) => b.business.id === id)!

describe('reading the interpreted request', () => {
  it('puts the exact thing first and the constraints after it', () => {
    const r = readInterpretation(getScenario('iphone-results').request.interpretation)
    expect(r.headline.value).toBe('iPhone 17 Pro')
    expect(r.variant?.value).toBe('256GB')
    expect(r.constraints.map((c) => c.label)).toEqual(['Where', 'When', 'Max budget'])
  })

  it('only says something is missing when the request really lacks it (plumbing has no recorded budget)', () => {
    expect(readInterpretation(getScenario('iphone-results').request.interpretation).open).toEqual([])
    expect(readInterpretation(getScenario('dentist').request.interpretation).open).toEqual([])
    const plumbing = readInterpretation(getScenario('plumbing').request.interpretation).open
    expect(plumbing).toHaveLength(1)
    expect(plumbing[0]).toMatch(/^Budget wasn’t recorded/)
  })
})

describe('progress milestones', () => {
  it('start with the request understood and the rest pending or active – no invented progress', () => {
    const d = derive(initialState('iphone-live'))
    const m = buildMilestones(d.scenario, d.timeline, d.businesses)
    expect(m.map((x) => x.id)).toEqual(['understand', 'discover', 'contact', 'evaluate'])
    expect(m[0].state).toBe('done')
    expect(m[1].state).toBe('active')
    expect(m[2].state).toBe('pending')
    expect(m[3].state).toBe('pending')
  })

  it('agree with the stage rail the chat card shows, once the search has finished', () => {
    const d = derive(initialState('iphone-results'))
    const m = buildMilestones(d.scenario, d.timeline, d.businesses)
    expect(m.every((x) => x.state === 'done')).toBe(true)
    expect(m[1].detail).toMatch(/52 businesses found — as shown by Aurora/)
    expect(m[1].detail).toMatch(/2 websites checked/)
  })

  it('keep Aurora’s own count and the businesses reviewed here as two labelled scopes', () => {
    const d = derive(initialState('iphone-results'))
    const contact = buildMilestones(d.scenario, d.timeline, d.businesses)[2].detail!
    expect(contact).toMatch(/17 businesses reached — as shown by Aurora/)
    expect(contact).toMatch(/Of the 3 reviewed here: Spoke with 1 · 1 not reached · 1 not contacted/)
  })
})

describe('what needs the user’s attention', () => {
  it('lists the real reasons, with each contact outcome in its own words', () => {
    const d = derive(initialState('iphone-results'))
    const items = needsAttention(d.businesses, true)
    const reason = (id: string) => items.find((i) => i.business.business.id === id)?.reason
    expect(reason('ven')).toBe('Offered 512GB instead of 256GB in stock.')
    expect(reason('pai')).toBe('No one answered · 2 attempts. That isn’t a no.')
    expect(reason('srisai')).toBe('Sri Sai was found but not contacted.')
  })

  it('does not flag a business as “not contacted” while calls are still going out', () => {
    const d = derive(initialState('iphone-live'))
    expect(needsAttention(d.businesses, false).some((i) => /not contacted/.test(i.reason))).toBe(false)
  })

  it('flags conflicting evidence for the dentist', () => {
    const d = derive(initialState('dentist'))
    expect(needsAttention(d.businesses, true).find((i) => i.business.business.id === 'd1')?.reason).toMatch(/Answers conflict on slot/i)
  })

  it('useful findings leave out “not established” noise and keep the simulated flag after a follow-up', () => {
    const d = derive(initialState('iphone-results'))
    expect(usefulFindings(d.activity).every((a) => a.tone !== 'neutral')).toBe(true)
    const after = derive(run(initialState('iphone-results'), { type: 'FU_START', businessId: 'ven', preselect: ['variant'] }, { type: 'FU_REVIEW' }, { type: 'FU_APPROVE' }, { type: 'FU_ADVANCE' }, { type: 'FU_ADVANCE' }))
    expect(usefulFindings(after.activity).some((a) => a.simulated)).toBe(true)
  })
})

describe('the three scenarios keep their facts', () => {
  it('iPhone: nothing unknown has become confirmed', () => {
    const s = initialState('iphone-results')
    const ven = biz(s, 'ven')
    const by = (id: string) => ven.views.find((v) => v.requirement.id === id)!
    expect(by('variant').alternative).toBe('512GB')
    expect(by('variant').display).toBe('awaiting')
    expect(['price', 'pickup', 'colour', 'payment'].every((id) => by(id).display === 'unanswered' && !by(id).satisfied)).toBe(true)
    const pai = biz(s, 'pai')
    expect(pai.contact.state).toBe('no_answer')
    expect(pai.contact.reached).toBe(false)
    const sri = biz(s, 'srisai')
    expect(sri.calls).toHaveLength(0)
    expect(sri.contact.state).toBe('not_attempted')
    expect(getScenario('iphone-results').activity.filter((a) => a.businessId === 'srisai').every((a) => /Maps/.test(a.label))).toBe(true)
  })

  it('dentist: a starting price is not the final price, and the appointment evidence is conflicting', () => {
    const d1 = biz(initialState('dentist'), 'd1')
    const price = d1.views.find((v) => v.requirement.id === 'budget')!
    expect(price.display).toBe('conditional')
    expect(price.satisfied).toBe(false)
    expect(price.primary?.details?.join(' ')).toMatch(/₹800/)
    expect(price.primary?.details?.join(' ')).toMatch(/₹400/)
    expect(d1.views.find((v) => v.requirement.id === 'date')!.display).toBe('conflicting')
  })

  it('plumbing: the repair is conditional and in-shop, not treated as an on-site visit', () => {
    const m1 = biz(initialState('plumbing'), 'm1')
    const repair = m1.views.find((v) => v.requirement.id === 'repair')!
    expect(repair.display).toBe('conditional')
    expect(repair.satisfied).toBe(false)
    expect(m1.business.addressDiscrepancy).toBeTruthy()
    expect(m1.suitability).toBe('potential')
  })
})

describe('audit fixes: nothing is claimed beyond the evidence', () => {
  it('after the follow-up, the headline says must-haves and names what is still unknown', async () => {
    const { outcomeCopy } = await import('../logic/copy')
    const s = run(initialState('iphone-results'), { type: 'FU_START', businessId: 'ven', preselect: ['variant', 'price', 'pickup'] }, { type: 'FU_REVIEW' }, { type: 'FU_APPROVE' }, { type: 'FU_ADVANCE' }, { type: 'FU_ADVANCE' })
    const d = derive(s)
    if (d.outcome === 'suitable_options_found') {
      const c = outcomeCopy(d.outcome, d.process, d.businesses)
      expect(c.title).toMatch(/your must-haves$/)
      expect(c.title).not.toMatch(/everything/)
      expect(c.body).toMatch(/still unknown/)
    }
  })
  it('a budget on a request with no price limit changes nothing and says so', async () => {
    const { chatReply } = await import('../logic/chat')
    const d = derive(initialState('plumbing'))
    const ctx = { requirements: d.requirements, businesses: d.businesses, evaluated: d.evaluated } as never
    expect(chatReply({ kind: 'budget', value: 500 } as never, ctx, ctx).text).toMatch(/no price limit/)
  })
})

describe('contact line says what really happened across attempts', () => {
  it('Venkateshwara: first call unanswered, second connected – not just “2 attempts”', async () => {
    const { contactText } = await import('../logic/contact')
    const ven = biz(initialState('iphone-results'), 'ven')
    expect(ven.contact.attempts).toBe(2)
    expect(ven.contact.answered).toBe(1)
    expect(contactText(ven.contact)).toMatch(/1 of 2 calls answered/)
  })
  it('Pai: never answered stays “2 attempts” – nothing is known', async () => {
    const { contactText } = await import('../logic/contact')
    expect(contactText(biz(initialState('iphone-results'), 'pai').contact)).toMatch(/Not reached · 2 attempts/)
  })
})
