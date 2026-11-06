// The AI-native layer must stay grounded: every feed item, synthesis sentence and explanation comes from state.
import { describe, expect, it } from 'vitest'
import { derive, initialState, reducer, type Action, type AppState } from './store'
import { interpretCommand, synthesis, verdictLine, whyShown } from '../logic/agent'
import { nextAction } from '../logic/copy'

const run = (s: AppState, ...a: Action[]) => a.reduce(reducer, s)
const biz = (s: AppState, id: string) => derive(s).businesses.find((b) => b.business.id === id)!

describe('research activity feed', () => {
  it('starts with understanding, then only what has happened so far', () => {
    const s = initialState('iphone-live')
    const kinds = derive(s).activity.map((a) => a.kind)
    expect(kinds[0]).toBe('understand')
    expect(kinds).not.toContain('conversation') // nothing called yet
    expect(derive(s).activity.some((a) => a.live)).toBe(true)
  })

  it('has one call event per recorded call, and websites only where the research captured them', () => {
    const d = derive(initialState('iphone-results'))
    const callEvents = d.activity.filter((a) => a.kind === 'call_attempt' || a.kind === 'conversation')
    const calls = d.businesses.flatMap((b) => b.calls)
    expect(callEvents).toHaveLength(calls.length)
    expect(d.activity.filter((a) => a.kind === 'website')).toHaveLength(1)
    expect(derive(initialState('dentist')).activity.some((a) => a.kind === 'website')).toBe(false)
  })

  it('reports Venkateshwara’s 512GB alternative and unestablished items as findings', () => {
    const texts = derive(initialState('iphone-results')).activity.filter((a) => a.kind === 'finding').map((a) => a.text)
    expect(texts.some((t) => t.includes('512GB'))).toBe(true)
    expect(texts.some((t) => t.includes('not established on the call'))).toBe(true)
  })

  it('marks follow-up activity as simulated', () => {
    const s = run(initialState('iphone-results'), { type: 'FU_START', businessId: 'ven', preselect: ['variant'] }, { type: 'FU_REVIEW' }, { type: 'FU_APPROVE' }, { type: 'FU_ADVANCE' }, { type: 'FU_ADVANCE' })
    const fu = derive(s).activity.filter((a) => a.kind === 'follow_up' || (a.simulated && a.kind === 'finding'))
    expect(fu.length).toBeGreaterThan(0)
    fu.forEach((a) => expect(a.simulated).toBe(true))
  })
})

describe('synthesis', () => {
  it('summarises every reviewed business without claiming a match', () => {
    const d = derive(initialState('iphone-results'))
    const { sentences, coverage } = synthesis(d.businesses, d.requirements)
    expect(sentences.join(' ')).toMatch(/512GB rather than your “256GB in stock”/)
    expect(sentences.join(' ')).toMatch(/no answer after 2 attempts/)
    expect(sentences.join(' ')).toMatch(/not contacted/)
    expect(coverage.every((c) => c.summary.startsWith('0 of 3'))).toBe(true)
  })
  it('dentist: Special Smiles is described as unsourced, not confirmed', () => {
    const d = derive(initialState('dentist'))
    expect(synthesis(d.businesses, d.requirements).sentences.join(' ')).toMatch(/no visible source/)
  })
})

describe('why this result', () => {
  it('explains the suggestion truthfully and never treats rank as confirmation', () => {
    const d = derive(initialState('iphone-results'))
    const w = whyShown(biz(initialState('iphone-results'), 'ven'), true, d.businesses)
    expect(w.reason).toMatch(/only possible option/)
    expect(w.reason).toMatch(/not a confirmation/)
    expect(w.gaps).toEqual(expect.arrayContaining(['final price', 'pickup today']))
  })
})

describe('collaborative guidance', () => {
  it('understands “Only check the 256GB model and its final price” for this business', () => {
    const s = initialState('iphone-results')
    const cmd = interpretCommand('Only check the 256GB model and its final price', biz(s, 'ven'), derive(s).businesses)
    expect(cmd).toEqual({ kind: 'verify', ids: ['variant', 'price'] })
  })
  it('understands why / compare / budget, and says when it doesn’t understand', () => {
    const s = initialState('iphone-results')
    const all = derive(s).businesses
    expect(interpretCommand('Why is this business shown?', biz(s, 'ven'), all).kind).toBe('explain')
    expect(interpretCommand('Compare with Pai', biz(s, 'ven'), all)).toEqual({ kind: 'compare', withId: 'pai' })
    expect(interpretCommand('Set my budget to ₹1,25,000', biz(s, 'ven'), all)).toEqual({ kind: 'budget', value: 125000 })
    expect(interpretCommand('hello there', biz(s, 'ven'), all).kind).toBe('unknown')
  })
  it('correcting importance re-evaluates without new calls', () => {
    let s = initialState('iphone-results')
    const calls = s.calls.length
    s = run(s, { type: 'SET_KIND', id: 'colour', kind: 'must_have' })
    expect(derive(s).requirements.find((r) => r.id === 'colour')!.kind).toBe('must_have')
    expect(biz(s, 'ven').views.filter((v) => v.requirement.kind === 'must_have')).toHaveLength(4)
    expect(s.calls.length).toBe(calls)
    s = run(s, { type: 'SET_KIND', id: 'colour', kind: null })
    expect(derive(s).requirements.find((r) => r.id === 'colour')!.kind).toBe('informational')
  })
  it('next actions name what they will do', () => {
    const s = initialState('iphone-results')
    const a = nextAction(biz(s, 'ven'))!
    expect(a.label).toBe('Ask about 3 open items')
    expect(a.kind === 'followup' && a.detail).toMatch(/you approve first/)
  })
})

describe('one answer per result card', () => {
  it('says each business’s answer in one sentence, by its real status', () => {
    const s = initialState('iphone-results')
    expect(verdictLine(biz(s, 'ven'))).toBe('Offered 512GB instead of 256GB in stock — awaiting confirmation. Final price and pickup today are both still unknown.')
    expect(verdictLine(biz(s, 'pai'))).toBe('No answer after 2 attempts. Nothing is known yet — that isn’t a no.')
    expect(verdictLine(biz(s, 'srisai'))).toBe('Found, but not contacted yet.')
    const p = initialState('plumbing')
    expect(verdictLine(derive(p).businesses[0])).toMatch(/^Leak repair and today are both conditional/)
  })
})
