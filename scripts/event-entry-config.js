/** Entry gates and weight modifiers from EVENT_DATABASE_SPEC Decision Tree tables B & C */

export const ENTRY_BY_EVENT = {
  r2_open_dump_pressure: {
    weightModifiers: [{ ifFlag: 'LINEAR_PATH', multiply: 2 }],
  },
  r2_hinterland_protest: {
    weightModifiers: [{ ifFlag: 'DUMP_RELIANT', multiply: 2 }],
  },
  r2_leachate_wells: {
    requiresFlags: [],
    requiresAnyFlags: ['LANDFILL_BUILT', 'DUMP_RELIANT'],
  },
  r2_methane_vent: {
    requiresAnyFlags: ['LANDFILL_BUILT', 'DUMP_RELIANT'],
  },
  r2_illegal_dumping: {
    weightModifiers: [{ ifFlag: 'TAX_IMPOSED', multiply: 2 }],
  },
  r2_landfill_mining: {
    requiresFlags: ['LANDFILL_BUILT'],
  },
  r3_nimby_protest: {
    weightModifiers: [
      { ifFlag: 'INCINERATOR_BUILT', multiply: 3 },
      { ifFlag: 'PUBLIC_TRUST_LOW', multiply: 2 },
    ],
  },
  r3_dioxin_study: { requiresFlags: ['INCINERATOR_BUILT'] },
  r3_ash_disposal: { requiresFlags: ['INCINERATOR_BUILT'] },
  r3_energy_deal: { requiresFlags: ['INCINERATOR_BUILT'] },
  r3_aging_plant: { requiresFlags: ['INCINERATOR_BUILT'] },
  r3_district_heating: { requiresFlags: ['INCINERATOR_BUILT'] },
  r4_invasive_species: {
    weightModifiers: [{ ifFlag: 'POLLUTION_LEGACY', multiply: 2 }],
  },
  r5_slum_no_collection: {
    weightModifiers: [
      { ifFlag: 'LINEAR_PATH', multiply: 2 },
      { ifFlag: 'DUMP_RELIANT', multiply: 2 },
    ],
  },
  r5_disease_outbreak: {
    requiresAnyFlags: ['DUMP_RELIANT', 'POLLUTION_LEGACY'],
    weightModifiers: [
      { ifFlag: 'DUMP_RELIANT', multiply: 3 },
      { ifFlag: 'POLLUTION_LEGACY', multiply: 3 },
    ],
  },
  r5_scavenger_tragedy: { requiresFlags: ['DUMP_RELIANT'] },
  r5_child_labour: {
    weightModifiers: [
      { ifFlag: 'INFORMAL_EVICTED', multiply: 2 },
      { ifFlag: 'DUMP_RELIANT', multiply: 2 },
    ],
  },
  r5_coop_formation: { requiresFlags: ['INFORMAL_INTEGRATED'] },
  r5_gender_health: {
    weightModifiers: [{ ifFlag: 'INFORMAL_INTEGRATED', multiply: 2 }],
  },
  r5_eviction_pressure: {
    weightModifiers: [{ ifFlag: 'PUBLIC_TRUST_LOW', multiply: 2 }],
  },
  r6_zero_waste_pledge: {
    weightModifiers: [{ ifFlag: 'ZERO_WASTE_AMBITION', multiply: 3 }],
  },
  r6_circular_industry: {
    weightModifiers: [{ ifFlag: 'RECYCLING_SYSTEM', multiply: 2 }],
  },
  r6_landfill_ban: {
    requiresAnyFlags: ['RECYCLING_SYSTEM', 'INCINERATOR_BUILT'],
  },
  r6_green_jobs: {
    weightModifiers: [
      { ifFlag: 'INFORMAL_INTEGRATED', multiply: 2 },
      { ifFlag: 'CIRCULAR_PATH', multiply: 2 },
    ],
  },
  r6_citizen_referendum: {
    weightModifiers: [{ ifFlag: 'PUBLIC_TRUST_LOW', multiply: 2 }],
  },
};

/** PRIMARY_* founding path weights (×2) from Table B */
export const PRIMARY_WEIGHTS = {
  PRIMARY_DISPOSE: [
    'r2_landfill_full',
    'r2_open_dump_pressure',
    'r2_semakau_offshore',
    'r2_transport_cost',
    'r2_land_conflict',
  ],
  PRIMARY_INCINERATE: [
    'r3_incinerator_proposal',
    'r3_w2e_partnership',
    'r3_emissions_cap',
    'r3_carbon_market',
  ],
  PRIMARY_RECYCLE: [
    'r1_recycling_pilot',
    'r1_ewaste_influx',
    'r4_sand_mining',
    'r5_green_exchange',
    'r5_community_composting',
    'r6_circular_industry',
    'r6_deposit_law',
  ],
  PRIMARY_REDUCE: [
    'r1_packaging_boom',
    'r1_fast_fashion',
    'r4_packaging_tax_push',
    'r4_ecological_deficit',
    'r4_repair_economy',
    'r6_polluter_pays',
    'r6_zero_waste_pledge',
    'r6_smart_waste',
  ],
};

export const PRIMARY_INCINERATE_EXTRA = {
  r3_incinerator_proposal: 3,
  r3_w2e_partnership: 3,
  r3_emissions_cap: 2,
  r3_carbon_market: 2,
};
