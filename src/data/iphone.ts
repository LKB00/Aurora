// iPhone 17 Pro journey – the primary scenario.
//
// OBSERVED (Aurora app test, 3 Nov 2026, screenshots IMG_1912–IMG_1938):
//   request text, Aurora's reply, the top three businesses, their displayed rank / match score /
//   rating / address, the activity log times, Venkateshwara's AI summary and transcript lines,
//   Pai International's two missed calls, Sri Sai's "Located on Maps" entry, and the final stage
//   counters (52 found, 17 reached, 52 ranked).
// SIMULATED (labelled in the UI): the pacing of the live search and every follow-up answer.

import iphonePhoto from '../assets/iphone-17-pro.jpg'
import type { Business, CallRecord, ActivityEvent, Evidence, FollowUpScript, ListedBusiness, Requirement, SearchRequest, TimelineStep } from '../types'
import { ev, nov3, step } from './helpers'

export const iphoneRequest: SearchRequest = {
  title: 'Apple iPhone 17 Pro',
  location: 'Sector 3',
  text: 'Find an iPhone 17 Pro with 256GB storage in Bengaluru. I want to buy it today. Check which nearby stores actually have it in stock, their final price, available colours, payment options and whether I can pick it up today. My maximum budget is ₹1,20,000.',
  attachments: [{ src: iphonePhoto, alt: 'The iPhone 17 Pro photo you attached' }],
  acknowledgement: 'Got it — I’m checking nearby stores in Bengaluru. Here’s what I understood.',
  interpretation: [
    { label: 'Product', value: 'iPhone 17 Pro' },
    { label: 'Variant', value: '256GB', note: 'exact – other storage sizes are alternatives, not matches' },
    { label: 'Where', value: 'Bengaluru', note: 'search area: Sector 3' },
    { label: 'When', value: 'Today' },
    { label: 'Max budget', value: '₹1,20,000', note: 'final price' },
  ],
}

export const iphoneRequirements: Requirement[] = [
  { id: 'variant', label: 'iPhone 17 Pro, 256GB in stock', short: '256GB in stock', kind: 'must_have', timeSensitive: true, question: 'Do you have the iPhone 17 Pro 256GB in stock today?' },
  { id: 'price', label: 'Final price within ₹1,20,000', short: 'Final price', kind: 'must_have', budget: 120000, timeSensitive: true, question: 'What is the final price, including any extra charges?' },
  { id: 'pickup', label: 'Pickup today', short: 'Pickup today', kind: 'must_have', timeSensitive: true, question: 'Can I pick it up from the store today?' },
  { id: 'colour', label: 'Available colours', short: 'Colours', kind: 'informational', timeSensitive: true, question: 'Which colours do you have in 256GB?' },
  { id: 'payment', label: 'Payment options', short: 'Payment', kind: 'informational', question: 'Which payment methods do you accept?' },
]

export const iphoneBusinesses: Business[] = [
  {
    id: 'ven', name: 'Venkateshwara Enterprises', initial: 'V', distanceKm: 1.8,
    address: '59, 101, 17th Main Rd, near MK Ahmed Bazza…', addressNote: 'Address is truncated in Aurora’s app.',
    rating: { value: 4.9, note: 'Rating as shown in Aurora' },
    auroraRank: 1, auroraMatch: 40, revealStep: 2, origin: 'observed',
  },
  {
    id: 'pai', name: 'Pai International – Hosur Road', initial: 'P', distanceKm: 3.6,
    address: '#6 to 8, Garebhave Palya, Next to Nissan sh…', addressNote: 'Address is truncated in Aurora’s app.',
    rating: { value: 4.7, note: 'Rating as shown in Aurora' },
    auroraRank: 2, auroraMatch: 5, revealStep: 2, origin: 'observed',
  },
  {
    id: 'srisai', name: 'Sri Sai Electronics and Furnishings', initial: 'S', distanceKm: 0.9,
    address: '1st Cross Rd, Sector 3, HSR Layout, Ben…', addressNote: 'Address is truncated in Aurora’s app.',
    auroraRank: 3, auroraMatch: 0, revealStep: 3, origin: 'observed',
  },
]

const venTranscript: CallRecord['transcript'] = [
  { speaker: 'business', text: 'Hello? Thank you, sir.', at: '00:02' },
  { speaker: 'aurora', text: 'Hi, do you sell the iPhone seventeen Pro?', at: '00:04' },
  { speaker: 'business', text: 'Hello?', at: '00:05' },
  { speaker: 'aurora', text: 'Yeah, I’m here. Do you have…', at: '00:10' },
  { speaker: 'business', text: 'Hello? [speech in Telugu], sir?', at: '00:11' },
  { speaker: 'aurora', text: 'Hello? Can you hear me?', at: '00:14' },
  { speaker: 'business', text: 'Your voice is very rose.', at: '00:16' },
  { speaker: 'aurora', text: 'Sorry, you’re breaking up. Do you have the iPhone seventeen Pro in stock?', at: '00:18' },
  { speaker: 'business', text: 'And', at: '00:21' },
  { speaker: 'business', text: 'we have seventeen pro with the five twelve CV storage area.', at: '00:24' },
  { speaker: 'aurora', text: 'Hmm, I need the two fifty-six G B model. Do you have that one?', at: '00:30' },
  { speaker: 'business', text: 'Just once you wait, sir. I have not continue.', at: '00:35' },
  { speaker: 'aurora', text: 'Okay, I’ll wait.', at: '00:38' },
  { speaker: 'business', text: 'Hello?', at: '00:49' },
  { speaker: 'aurora', text: 'Yeah, I’m here.', at: '00:50' },
  { speaker: 'business', text: 'Hello?', at: '00:51' },
  { speaker: 'aurora', text: 'Still here. Any…', at: '00:53' },
  { speaker: 'business', text: 'Sir, kill, sir. Yeah?', at: '00:53' },
  { speaker: 'aurora', text: 'Huh?', at: '00:56' },
  { speaker: 'business', text: 'Hello?', at: '00:57' },
  { speaker: 'aurora', text: 'Yeah, I’m here.', at: '00:58' },
]

export const iphoneCalls: CallRecord[] = [
  { id: 'ven-c1', businessId: 'ven', kind: 'original', outcome: 'no_answer', at: nov3('18:35'), summary: [], origin: 'observed' },
  {
    id: 'ven-c2', businessId: 'ven', kind: 'original', outcome: 'completed_with_information', at: nov3('18:38'), duration: '1m 1s', origin: 'observed',
    summary: [
      'Apple iPhone 17 Pro 512GB reportedly in stock',
      '256GB model availability remains unconfirmed',
      'No price, colors, payment options, or pickup timing provided',
      'Store promised to check 256GB availability; no timeframe',
    ],
    transcript: venTranscript,
    transcriptNote: 'AI-generated transcript as shown in Aurora (recording 0:58). It may contain transcription errors.',
  },
  { id: 'pai-c1', businessId: 'pai', kind: 'original', outcome: 'no_answer', at: nov3('18:34'), summary: [], origin: 'observed' },
  { id: 'pai-c2', businessId: 'pai', kind: 'original', outcome: 'no_answer', at: nov3('18:35'), summary: [], origin: 'observed' },
]

export const iphoneActivity: ActivityEvent[] = [
  { id: 'ven-a1', businessId: 'ven', label: 'Located on Maps', at: nov3('18:33'), origin: 'observed' },
  { id: 'pai-a1', businessId: 'pai', label: 'Located on Maps', at: nov3('18:33'), origin: 'observed' },
  { id: 'srisai-a1', businessId: 'srisai', label: 'Located on Maps', at: null, origin: 'observed' },
]

const venAt = nov3('18:38')
/** Observed in the transcript: repeated "Hello?", "you're breaking up", "Can you hear me?". */
const VEN_LINE = 'Poor line on this call – parts of the conversation were unclear.'
export const iphoneEvidence: Evidence[] = [
  ev('ven', 'variant', {
    source: 'business_call', status: 'business_stated', fit: 'unknown', alternative: '512GB',
    statement: 'Said it has the iPhone 17 Pro in 512GB — not the 256GB you asked for.',
    sourceDetail: 'AI summary: “Apple iPhone 17 Pro 512GB reportedly in stock”', obtainedAt: venAt, callId: 'ven-c2', origin: 'observed', caveat: VEN_LINE,
  }),
  ev('ven', 'variant', {
    source: 'business_call', status: 'awaiting_confirmation', fit: 'unknown',
    statement: 'Promised to check whether the 256GB model is available. No timeframe given.',
    sourceDetail: 'AI summary: “Store promised to check 256GB availability; no timeframe”', obtainedAt: venAt, callId: 'ven-c2', origin: 'observed', caveat: VEN_LINE,
  }),
  ev('ven', 'price', { source: 'business_call', status: 'insufficient_information', fit: 'unknown', statement: 'No price was given on the call.', sourceDetail: 'AI summary', obtainedAt: venAt, callId: 'ven-c2', origin: 'observed', caveat: VEN_LINE }),
  ev('ven', 'pickup', { source: 'business_call', status: 'insufficient_information', fit: 'unknown', statement: 'No pickup timing was given on the call.', sourceDetail: 'AI summary', obtainedAt: venAt, callId: 'ven-c2', origin: 'observed', caveat: VEN_LINE }),
  ev('ven', 'colour', { source: 'business_call', status: 'insufficient_information', fit: 'unknown', statement: 'No colours were mentioned on the call.', sourceDetail: 'AI summary', obtainedAt: venAt, callId: 'ven-c2', origin: 'observed', caveat: VEN_LINE }),
  ev('ven', 'payment', { source: 'business_call', status: 'insufficient_information', fit: 'unknown', statement: 'No payment options were mentioned on the call.', sourceDetail: 'AI summary', obtainedAt: venAt, callId: 'ven-c2', origin: 'observed', caveat: VEN_LINE }),
  ev('pai', 'payment', {
    source: 'aurora_display', status: 'source_unclear', fit: 'meets',
    statement: 'Aurora’s summary showed “Cards accepted”, but neither call was answered, so where this came from isn’t shown.',
    sourceDetail: 'AI summary on Aurora’s result', obtainedAt: null, origin: 'observed',
  }),
]

export const iphoneListed: ListedBusiness[] = [
  { name: 'Balaji Electronics Electrical', shownStatus: 'Call done' },
  { name: 'Sangeetha Gadgets', shownStatus: 'Call done' },
  { name: 'Maya Mobiles Accesso…', shownStatus: 'Call done' },
  { name: 'Mahaveer electricals', shownStatus: 'Call done' },
  { name: 'S.S. Electricals', shownStatus: 'Call done' },
  { name: 'Raja Electrical & El…', shownStatus: 'Call done' },
  { name: 'KHETESHWAR TELECOM AND ELE…', shownStatus: 'Call done' },
  { name: 'Apple Premium Partne…', shownStatus: 'Call done' },
  { name: 'RAMA ELECTRICAL', shownStatus: 'Call done' },
  { name: 'Cashify Mobile Phone…', shownStatus: 'Call done' },
]
export const iphoneListedNote =
  'These appeared in Aurora’s call lists. Their answers weren’t captured in the research screenshots, so they aren’t assessed here.'

/** Websites seen in Aurora's "Websites" tab during the test (IMG_1926); names are truncated as displayed. */
export const iphoneSources = [
  { kind: 'website' as const, label: 'Happy Customer iPho…', detail: 'instagram.com (as displayed)' },
  { kind: 'website' as const, label: 'Imagine Store Near Me…', detail: 'retail.imagin… (as displayed)' },
]

export const iphoneCountsNote =
  'Counts are as Aurora displayed them at the end of the test. Aurora also showed other totals on other screens (50 vs 52 businesses, 2 vs 3 sites, 39 calls vs 17 reached). Their definitions aren’t documented, so they aren’t combined here.'

/** Deterministic live-search timeline. Pacing is simulated; final counts are observed. */
export const iphoneTimeline: TimelineStep[] = [
  step('discovering', ['active', 'Searching maps and websites near Sector 3'], ['pending', 'Starts when businesses are found'], ['pending', 'Waiting for answers']),
  step('contacting', ['done', '52 businesses found'], ['active', 'Calls under way'], ['pending', 'Waiting for answers']),
  step('contacting', ['done', '52 businesses found'], ['active', 'First answers are in'], ['pending', 'Waiting for calls to finish']),
  step('evaluating', ['done', '52 businesses found'], ['done', '17 businesses reached (as shown by Aurora)'], ['active', 'Checking answers against your request']),
  step('completed', ['done', '52 businesses found'], ['done', '17 businesses reached (as shown by Aurora)'], ['done', '52 businesses ranked']),
]

/* ---------- Simulated follow-up answers (never real) ---------- */

export const iphoneScripts: Record<string, Partial<Record<'answered' | 'partial' | 'conflicting', FollowUpScript>>> = {
  ven: {
    answered: {
      outcome: 'completed_with_information', duration: '0m 52s',
      summary: ['256GB model available today', 'Final price ₹1,18,000', 'Same-day pickup available', 'Colours not confirmed'],
      answers: {
        variant: { fit: 'meets', status: 'business_stated', statement: 'Said the iPhone 17 Pro 256GB is available today.' },
        price: { fit: 'meets', status: 'business_stated', statement: 'Quoted ₹1,18,000 as the final price.', priceValue: 118000 },
        pickup: { fit: 'meets', status: 'business_stated', statement: 'Said you can pick it up from the store today.' },
        colour: { fit: 'unknown', status: 'insufficient_information', statement: 'Didn’t say which colours are available.' },
        payment: { fit: 'unknown', status: 'insufficient_information', statement: 'Didn’t say which payment methods they accept.' },
      },
      transcript: [
        { speaker: 'aurora', text: 'Hi, I called earlier about the iPhone 17 Pro. Do you have the 256GB model in stock today?', at: '00:03' },
        { speaker: 'business', text: 'Yes, 256 is available.', at: '00:09' },
        { speaker: 'aurora', text: 'What is the final price, including any extra charges?', at: '00:14' },
        { speaker: 'business', text: 'One lakh eighteen thousand, final.', at: '00:21' },
        { speaker: 'aurora', text: 'Can it be picked up from the store today?', at: '00:27' },
        { speaker: 'business', text: 'Yes, come today.', at: '00:31' },
        { speaker: 'aurora', text: 'Which colours do you have in 256GB?', at: '00:36' },
        { speaker: 'business', text: 'Come to the shop and see.', at: '00:41' },
      ],
    },
    partial: {
      outcome: 'completed_with_information', duration: '0m 34s',
      summary: ['256GB model available', 'Price to be confirmed after checking with the owner', 'Call ended before pickup was discussed'],
      answers: {
        variant: { fit: 'meets', status: 'business_stated', statement: 'Said the iPhone 17 Pro 256GB is available.' },
        price: { fit: 'unknown', status: 'awaiting_confirmation', statement: 'Said they would confirm the price after checking with the owner.' },
        pickup: { fit: 'unknown', status: 'insufficient_information', statement: 'The call ended before pickup was discussed.' },
        colour: { fit: 'unknown', status: 'insufficient_information', statement: 'The call ended before colours were discussed.' },
        payment: { fit: 'unknown', status: 'insufficient_information', statement: 'The call ended before payment was discussed.' },
      },
    },
    conflicting: {
      outcome: 'completed_with_information', duration: '1m 10s',
      summary: ['Two staff members gave different answers about 256GB stock', 'Final price ₹1,18,000', 'Pickup today only before 8 PM'],
      answers: {
        variant: [
          { fit: 'meets', status: 'business_stated', statement: 'First staff member said the 256GB model is in stock.' },
          { fit: 'does_not_meet', status: 'business_stated', statement: 'A second staff member said only 512GB is left.' },
        ],
        price: { fit: 'meets', status: 'business_stated', statement: 'Quoted ₹1,18,000 as the final price.', priceValue: 118000 },
        pickup: { fit: 'meets', status: 'business_stated', statement: 'Said pickup today is possible.', condition: 'Only if you arrive before 8 PM.' },
        colour: { fit: 'unknown', status: 'insufficient_information', statement: 'Didn’t say which colours are available.' },
        payment: { fit: 'unknown', status: 'insufficient_information', statement: 'Didn’t say which payment methods they accept.' },
      },
    },
  },
  pai: {
    answered: {
      outcome: 'completed_with_information', duration: '0m 47s',
      summary: ['256GB in stock', 'Final price ₹1,19,900', 'Pickup available tomorrow, not today', 'Cards and UPI accepted'],
      answers: {
        variant: { fit: 'meets', status: 'business_stated', statement: 'Said the iPhone 17 Pro 256GB is in stock.' },
        price: { fit: 'meets', status: 'business_stated', statement: 'Quoted ₹1,19,900 as the final price.', priceValue: 119900 },
        pickup: { fit: 'does_not_meet', status: 'business_stated', statement: 'Said it can be picked up tomorrow, not today.' },
        colour: { fit: 'meets', status: 'business_stated', statement: 'Said Silver and Deep Blue are available in 256GB.' },
        payment: { fit: 'meets', status: 'business_stated', statement: 'Said they accept cards and UPI.' },
      },
    },
  },
  srisai: {
    answered: {
      outcome: 'completed_with_information', duration: '0m 21s',
      summary: ['Does not sell iPhones'],
      answers: {
        variant: { fit: 'does_not_meet', status: 'business_stated', statement: 'Said they don’t sell iPhones.' },
        price: { fit: 'unknown', status: 'not_applicable', statement: 'Not applicable — they don’t sell iPhones.' },
        pickup: { fit: 'unknown', status: 'not_applicable', statement: 'Not applicable — they don’t sell iPhones.' },
      },
    },
  },
}
