// Demo scenarios. Each one is a complete, self-contained starting state, so switching never
// mixes data between scenarios. All edge-state data is SIMULATED and labelled as such.

import type { Business, CallRecord, Evidence, FollowUpMode, Scenario, TimelineStep } from '../types'
import { ev, nov3, step } from './helpers'
import * as I from './iphone'
import * as D from './dentist'
import * as P from './plumbing'

const IPHONE_NOW = nov3('19:05')

const iphoneBase = (over: Partial<Scenario> & Pick<Scenario, 'id' | 'name' | 'description' | 'simulatedNote' | 'group'>): Scenario => ({
  isSimulatedSearch: false,
  request: I.iphoneRequest,
  requirements: I.iphoneRequirements,
  businesses: I.iphoneBusinesses,
  calls: I.iphoneCalls,
  activity: I.iphoneActivity,
  evidence: I.iphoneEvidence,
  listed: I.iphoneListed,
  listedNote: I.iphoneListedNote,
  countsNote: I.iphoneCountsNote,
  sources: I.iphoneSources,
  timeline: I.iphoneTimeline,
  startStep: I.iphoneTimeline.length - 1,
  now: IPHONE_NOW,
  followUpMode: 'answered',
  scripts: I.iphoneScripts,
  ...over,
})

const followUpNote = (mode: FollowUpMode) =>
  ({
    answered: 'Follow-up calls return a scripted, simulated answer (e.g. Venkateshwara: 256GB available, ₹1,18,000, pickup today).',
    no_answer: 'Follow-up calls are simulated and nobody answers.',
    partial: 'Follow-up calls return a simulated partial answer: some details confirmed, some still open.',
    conflicting: 'Follow-up calls return a simulated answer where two staff members contradict each other.',
    failed: 'Follow-up calls fail for a simulated technical reason.',
  })[mode]

/* ---------- Edge-state fixtures (all simulated) ---------- */

const simCall = (businessId: string, outcome: CallRecord['outcome'], at: string, summary: string[] = []): CallRecord => ({
  id: `${businessId}-sim-${outcome}`, businessId, kind: 'original', outcome, at, summary, origin: 'simulated',
})

const noSuitableEvidence: Evidence[] = [
  ev('ven', 'variant', { source: 'prototype_simulation', status: 'business_stated', fit: 'does_not_meet', alternative: '512GB', statement: 'Said only the 512GB model is in stock; no 256GB.', obtainedAt: nov3('18:38'), origin: 'simulated' }),
  ev('pai', 'variant', { source: 'prototype_simulation', status: 'business_stated', fit: 'meets', statement: 'Said the 256GB model is in stock.', obtainedAt: nov3('18:40'), origin: 'simulated' }),
  ev('pai', 'price', { source: 'prototype_simulation', status: 'business_stated', fit: 'meets', priceValue: 124900, statement: 'Quoted ₹1,24,900 as the final price.', obtainedAt: nov3('18:40'), origin: 'simulated' }),
  ev('pai', 'pickup', { source: 'prototype_simulation', status: 'business_stated', fit: 'meets', statement: 'Said you can pick it up today.', obtainedAt: nov3('18:40'), origin: 'simulated' }),
  ev('srisai', 'variant', { source: 'prototype_simulation', status: 'business_stated', fit: 'does_not_meet', statement: 'Said they don’t sell iPhones.', obtainedAt: nov3('18:42'), origin: 'simulated' }),
]

const noInfoEvidence: Evidence[] = ['ven', 'pai', 'srisai'].flatMap((b) =>
  ['variant', 'price', 'pickup'].map((r) =>
    ev(b, r, { source: 'prototype_simulation', status: 'insufficient_information', fit: 'unknown', statement: 'The call connected but this wasn’t answered.', obtainedAt: nov3('18:40'), origin: 'simulated' }),
  ),
)

const successEvidence: Evidence[] = [
  ['ven', 118000, '18:38'], ['pai', 119500, '18:40'], ['srisai', 116900, '18:42'], ['bal', 117500, '18:44'], ['san', 119900, '18:46'],
].flatMap(([id, price, at]) => [
  ev(id as string, 'variant', { source: 'prototype_simulation', status: 'business_stated', fit: 'meets', statement: 'Said the 256GB model is in stock.', obtainedAt: nov3(at as string), origin: 'simulated' }),
  ev(id as string, 'price', { source: 'prototype_simulation', status: 'business_stated', fit: 'meets', priceValue: price as number, statement: `Quoted ₹${(price as number).toLocaleString('en-IN')} as the final price.`, obtainedAt: nov3(at as string), origin: 'simulated' }),
  ev(id as string, 'pickup', { source: 'prototype_simulation', status: 'business_stated', fit: 'meets', statement: 'Said you can pick it up today.', obtainedAt: nov3(at as string), origin: 'simulated' }),
])

const moreStores: Business[] = [
  { id: 'bal', name: 'Balaji Electronics Electrical', initial: 'B', distanceKm: 2.4, address: '14, 27th Main Rd, HSR Layout, Bengaluru', auroraRank: 4, auroraMatch: 0, revealStep: 0, origin: 'simulated' },
  { id: 'san', name: 'Sangeetha Gadgets', initial: 'S', distanceKm: 3.1, address: '8, 1st Cross, Sector 6, HSR Layout, Bengaluru', auroraRank: 5, auroraMatch: 0, revealStep: 0, origin: 'simulated' },
]

/** For single-step (already finished) edge states: everything is visible from the start. */
const allVisible = I.iphoneBusinesses.map((b) => ({ ...b, revealStep: 0 }))

const interruptedTimeline: TimelineStep[] = [
  I.iphoneTimeline[0],
  I.iphoneTimeline[1],
  I.iphoneTimeline[2],
  step('interrupted', ['done', '52 businesses found'], ['stopped', 'Paused · connection lost while calling'], ['pending', 'Waiting for calls to finish'],
    'The connection dropped while Aurora was calling businesses. Answers already received are saved.'),
  I.iphoneTimeline[3],
  I.iphoneTimeline[4],
]

const notContactedTimeline: TimelineStep[] = [
  step('interrupted', ['done', '52 businesses found'], ['stopped', 'No calls placed · calling service didn’t respond'], ['pending', 'Nothing to evaluate yet'],
    'Aurora found businesses but couldn’t place any calls. Nothing has been verified yet.'),
  step('contacting', ['done', '52 businesses found'], ['active', 'Calls under way'], ['pending', 'Waiting for answers']),
  I.iphoneTimeline[3],
  I.iphoneTimeline[4],
]

/** The observed dentist/plumbing result, reached through a simulated live search: same businesses and evidence, paced in stages. */
function liveFrom(base: Scenario, id: string, where: string): Scenario {
  const last = base.timeline[base.timeline.length - 1]
  return {
    ...base, id, name: base.name.replace(' · ', ' · live search · '), intro: true, isSimulatedSearch: true,
    description: 'Watch the search run stage by stage, then land on the observed result.',
    simulatedNote: 'The pacing of this search is simulated. The businesses and answers are the ones Aurora returned. Follow-up calls return scripted, simulated answers.',
    businesses: base.businesses.map((b, i) => ({ ...b, revealStep: [2, 2, 3][i % 3] })),
    timeline: [
      step('discovering', ['active', `Searching maps and websites near ${where}`], ['pending', 'Starts when businesses are found'], ['pending', 'Waiting for answers']),
      step('contacting', ['done', 'Businesses found'], ['active', 'Calls under way'], ['pending', 'Waiting for answers']),
      step('contacting', ['done', 'Businesses found'], ['active', 'First answers are in'], ['pending', 'Waiting for calls to finish']),
      step('evaluating', ['done', 'Businesses found'], ['done', 'Calls completed'], ['active', 'Checking answers against your request']),
      last,
    ],
  }
}

export const SCENARIOS: Scenario[] = [
  iphoneBase({
    id: 'iphone-live', group: 'Observed journeys', name: 'iPhone 17 Pro · live search', intro: true,
    description: 'Watch the search run stage by stage, then land on 5 confirmed stores.',
    simulatedNote: 'This whole search, its calls and its answers are simulated, to show how a successful journey looks. Pacing is sped up.', isSimulatedSearch: true,
    businesses: [...allVisible.map((b, i) => ({ ...b, revealStep: [2, 2, 3][i] })), ...moreStores.map((b) => ({ ...b, revealStep: 3 }))],
    calls: [simCall('ven', 'completed_with_information', nov3('18:38')), simCall('pai', 'completed_with_information', nov3('18:40')), simCall('srisai', 'completed_with_information', nov3('18:42')), simCall('bal', 'completed_with_information', nov3('18:44')), simCall('san', 'completed_with_information', nov3('18:46'))],
    activity: [...I.iphoneActivity, { id: 'bal-a1', businessId: 'bal', label: 'Located on Maps', at: nov3('18:33'), origin: 'simulated' }, { id: 'san-a1', businessId: 'san', label: 'Located on Maps', at: nov3('18:33'), origin: 'simulated' }],
    evidence: successEvidence, listed: [], countsNote: undefined,
    timeline: [
      I.iphoneTimeline[0],
      I.iphoneTimeline[1],
      I.iphoneTimeline[2],
      step('evaluating', ['done', '52 businesses found'], ['done', '5 businesses reached'], ['active', 'Checking answers against your request']),
      step('completed', ['done', '52 businesses found'], ['done', '5 businesses reached'], ['done', '5 businesses checked']),
    ],
    startStep: 0,
  }),
  iphoneBase({
    id: 'iphone-live-observed', group: 'Observed journeys', name: 'iPhone 17 Pro · live search (observed result)',
    description: 'The search as Aurora actually returned it: no exact match yet.',
    simulatedNote: 'The pacing of the live search is simulated. ' + followUpNote('answered'),
    startStep: 0,
  }),
  iphoneBase({
    id: 'iphone-results', group: 'Observed journeys', name: 'iPhone 17 Pro · results',
    description: 'Start at the finished search with the observed top three results.',
    simulatedNote: followUpNote('answered'),
  }),
  {
    id: 'dentist', group: 'Observed journeys', name: 'Dentist · qualified & conflicting evidence',
    description: 'Conditional price, conflicting appointment evidence, and 100% matches whose claims aren’t attributed.',
    simulatedNote: 'Follow-up calls return scripted, simulated answers.',
    isSimulatedSearch: false, request: D.dentistRequest, requirements: D.dentistRequirements, businesses: D.dentistBusinesses,
    calls: D.dentistCalls, activity: [], evidence: D.dentistEvidence, listed: [], listedNote: '', countsNote: D.dentistCountsNote,
    timeline: D.dentistTimeline, startStep: 0, now: nov3('15:00'), followUpMode: 'answered', scripts: D.dentistScripts,
  },
  {
    id: 'plumbing', group: 'Observed journeys', name: 'Plumbing · conditional service',
    description: 'A drop-off repair with inspection pending, and a location that differs between sources.',
    simulatedNote: 'Follow-up calls return scripted, simulated answers.',
    isSimulatedSearch: false, request: P.plumbingRequest, requirements: P.plumbingRequirements, businesses: P.plumbingBusinesses,
    calls: P.plumbingCalls, activity: [], evidence: P.plumbingEvidence, listed: P.plumbingListed, listedNote: 'These appeared in Aurora’s call list. Their answers weren’t captured in the research.',
    countsNote: P.plumbingCountsNote, timeline: P.plumbingTimeline, startStep: 0, now: nov3('15:00'), followUpMode: 'answered', scripts: P.plumbingScripts,
  },

  iphoneBase({
    id: 'iphone-noanswer', group: 'Follow-up outcomes', name: 'iPhone · follow-up not answered',
    description: 'Ask Venkateshwara again — nobody picks up. Nothing about the business changes.',
    simulatedNote: followUpNote('no_answer'), followUpMode: 'no_answer',
  }),
  iphoneBase({
    id: 'iphone-partial', group: 'Follow-up outcomes', name: 'iPhone · follow-up partly answered',
    description: 'The follow-up confirms 256GB, but the price is still pending.',
    simulatedNote: followUpNote('partial'), followUpMode: 'partial',
  }),
  iphoneBase({
    id: 'iphone-conflict', group: 'Follow-up outcomes', name: 'iPhone · follow-up contradicts itself',
    description: 'Two staff members give different answers about 256GB stock.',
    simulatedNote: followUpNote('conflicting'), followUpMode: 'conflicting',
  }),
  iphoneBase({
    id: 'iphone-failed', group: 'Follow-up outcomes', name: 'iPhone · follow-up call fails',
    description: 'The follow-up call fails before it connects.',
    simulatedNote: followUpNote('failed'), followUpMode: 'failed',
  }),

  iphoneBase({
    id: 'edge-none-found', group: 'Recovery & edge states', name: 'No businesses found',
    description: 'Discovery finds nothing in the search area.',
    simulatedNote: 'This whole search result is simulated.', isSimulatedSearch: true,
    businesses: [], calls: [], activity: [], evidence: [], listed: [], countsNote: undefined,
    timeline: [step('completed', ['done', 'No matching businesses found near Sector 3'], ['skipped', 'Nobody to call'], ['skipped', 'Nothing to evaluate'])],
    startStep: 0,
    recovery: {
      title: 'No businesses found near Sector 3',
      body: 'Aurora didn’t find any business likely to sell the iPhone 17 Pro in this area.',
      preserved: 'Your request is saved, so you won’t need to type it again.',
      actions: [{ kind: 'load_scenario', scenarioId: 'iphone-live', label: 'Try a wider search (demo)' }],
    },
  }),
  iphoneBase({
    id: 'edge-not-contacted', group: 'Recovery & edge states', name: 'Found, but none contacted',
    description: 'Businesses were found but no calls could be placed.',
    simulatedNote: 'This search state is simulated. Once you resume, the observed results appear.', isSimulatedSearch: true,
    businesses: I.iphoneBusinesses.map((b) => ({ ...b, revealStep: b.id === 'ven' ? 1 : 2 })),
    timeline: notContactedTimeline, startStep: 0,
  }),
  iphoneBase({
    id: 'edge-all-unanswered', group: 'Recovery & edge states', name: 'All calls unanswered',
    description: 'Every business Aurora called didn’t pick up.',
    simulatedNote: 'These call outcomes are simulated.', isSimulatedSearch: true,
    businesses: allVisible,
    calls: [simCall('ven', 'no_answer', nov3('18:35')), simCall('pai', 'no_answer', nov3('18:35')), simCall('srisai', 'no_answer', nov3('18:36'))],
    evidence: [], listed: [], countsNote: undefined,
    timeline: [step('completed', ['done', '3 businesses found'], ['done', 'No one answered'], ['done', 'Nothing could be verified'])],
    startStep: 0,
  }),
  iphoneBase({
    id: 'edge-no-info', group: 'Recovery & edge states', name: 'Calls answered, nothing useful',
    description: 'Calls connected, but none of your questions got an answer.',
    simulatedNote: 'These call outcomes are simulated.', isSimulatedSearch: true,
    businesses: allVisible,
    calls: ['ven', 'pai', 'srisai'].map((b) => simCall(b, 'completed_insufficient_information', nov3('18:40'), ['The call connected but no useful answers were given'])),
    evidence: noInfoEvidence, listed: [], countsNote: undefined,
    timeline: [step('completed', ['done', '3 businesses found'], ['done', '3 businesses reached'], ['done', 'No useful answers'])],
    startStep: 0,
  }),
  iphoneBase({
    id: 'edge-no-suitable', group: 'Recovery & edge states', name: 'No suitable option',
    description: 'Every business fails a must-have. Try raising the budget to ₹1,26,000.',
    simulatedNote: 'These answers are simulated.', isSimulatedSearch: true,
    businesses: allVisible,
    calls: [simCall('ven', 'completed_with_information', nov3('18:38')), simCall('pai', 'completed_with_information', nov3('18:40')), simCall('srisai', 'completed_with_information', nov3('18:42'))],
    evidence: noSuitableEvidence, listed: [], countsNote: undefined,
    timeline: [step('completed', ['done', '3 businesses found'], ['done', '3 businesses reached'], ['done', '3 businesses checked'])],
    startStep: 0,
    recovery: {
      title: 'No business meets all your must-haves',
      body: 'Every business Aurora reached failed at least one must-have: the wrong storage, over budget, or no iPhones at all.',
      preserved: 'All answers are saved. If you change a requirement, Aurora re-checks the answers it already has.',
      actions: [{ kind: 'edit_request' }],
    },
  }),
  iphoneBase({
    id: 'edge-interrupted', group: 'Recovery & edge states', name: 'Search interrupted',
    description: 'The connection drops mid-way through calling. Resume to finish.',
    simulatedNote: 'The interruption is simulated. Once you resume, the observed results appear.', isSimulatedSearch: true,
    businesses: I.iphoneBusinesses.map((b) => ({ ...b, revealStep: b.id === 'ven' ? 2 : 4 })),
    timeline: interruptedTimeline, startStep: 3,
  }),
  iphoneBase({
    id: 'edge-failed', group: 'Recovery & edge states', name: 'Search failed to start',
    description: 'The search can’t start at all.',
    simulatedNote: 'This failure is simulated.', isSimulatedSearch: true,
    businesses: [], calls: [], activity: [], evidence: [], listed: [], countsNote: undefined,
    timeline: [step('failed', ['failed', 'Couldn’t start'], ['pending', 'Not started'], ['pending', 'Not started'],
      'Aurora couldn’t start this search because of a service error. No businesses were contacted.')],
    startStep: 0,
    recovery: {
      title: 'This search couldn’t start',
      body: 'A service error stopped Aurora before it found or called anyone.',
      preserved: 'Your request is saved.',
      actions: [{ kind: 'load_scenario', scenarioId: 'iphone-live', label: 'Try again' }],
    },
  }),
]

SCENARIOS.push(
  liveFrom(SCENARIOS.find((x) => x.id === 'dentist')!, 'dentist-live', 'Kanakapura Road'),
  liveFrom(SCENARIOS.find((x) => x.id === 'plumbing')!, 'plumbing-live', 'Sector 3'),
)

export const DEFAULT_SCENARIO = 'iphone-live'
export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
