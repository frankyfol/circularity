/** Free "defer" choice so players can always proceed when out of budget. */

export function eventHasZeroCostOption(actions) {
  return (actions || []).some((a) => (a.cost ?? 0) === 0);
}

export function createDeferAction(event) {
  return {
    id: 'defer',
    label: 'Defer — act when budget allows',
    plainLabel: 'Defer — cannot afford to act now',
    plainMeaning:
      'Spend nothing this time. Waste and pressure may build until you can invest.',
    hierarchyTier: 'defer',
    cost: 0,
    effects: {
      economy: 1,
      liveability: -2,
      capacity: -3,
      environment: -2,
    },
    participationFactor: 0,
    marketExposure: 'none',
    setsFlags: [],
    clearsFlags: [],
    resultExplain: 'You kept your budget, but the underlying problem kept growing.',
    animationId: 'none',
    pros: ['No spend — you keep budget for a later decision.'],
    cons: ['Problems do not wait — waste and pressure can build.'],
    isDefer: true,
    conceptLink: event?.conceptLink,
  };
}

export function actionsWithDeferOption(event) {
  const actions = [...(event?.actions || [])];
  if (!eventHasZeroCostOption(actions)) {
    actions.push(createDeferAction(event));
  }
  return actions;
}
