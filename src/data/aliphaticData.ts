import { type Compound, type ConditionSpec } from './types';

export const ALIPHATIC_REAGENTS = [
  "Cl2 / Br2 gas", "H2 gas", "Dry HCl / HBr gas", "X2 (in organic solvent)", 
  "H2O (steam)", "H2O", "Cold conc. H2SO4 + H2O", "KMnO4 (cold, dilute)", 
  "KMnO4 (hot, conc)", "NaOH (aq) / KOH (aq)", "NaOH / KOH (ethanolic)", 
  "KCN / NaCN (ethanolic)", "NH3 (excess, ethanolic)", "Conc. NH3 (aq)", 
  "PCl5", "SOCl2", "PCl3", "NaBr + conc. H2SO4", "Red phosphorus + I2", 
  "K2Cr2O7 (acidified)", "Tollens' reagent", "Fehling's solution", 
  "Carboxylic acid", "Acyl chloride", "Na (metal)", "Mg (metal)", 
  "NaBH4", "LiAlH4 (dry ether)", "HCN + KCN trace", "NaCN + dilute H2SO4", 
  "Dilute HCl / H2SO4", "Na2CO3 (aq) / NaHCO3 (aq)", "Conc. H2SO4", 
  "Conc. H2SO4 / H2O2 (aq)", "Alcohol", "Diol", "Diamine", 
  "Dicarboxylic acid", "Diacyl chloride", "Primary/Secondary Amine", 
  "Halogenoalkane", "None"
];

export const ALIPHATIC_CATALYSTS = [
  "UV Light", "Ni / Pt catalyst", "Ziegler-Natta", "Radical initiator", 
  "Conc. H2SO4", "Conc. H3PO4", "Al2O3 powder", "Biological enzymes", "None"
];

export const ALIPHATIC_CONDITIONS: ConditionSpec[] = [
  { id: 'temp_rt', label: 'Room Temp', type: 'temperature', operator: '=', value: 25, unit: '°C' }, // 0
  { id: 'temp_reflux', label: 'Heat under Reflux', type: 'heating', operator: '=', value: 'Reflux' }, // 1
  { id: 'temp_distil', label: 'Warm & Distil', type: 'heating', operator: '=', value: 'Distil' }, // 2
  { id: 'temp_150', label: '150-200 °C', type: 'temperature', operator: 'range', minValue: 150, maxValue: 200 }, // 3
  { id: 'temp_300', label: '300 °C', type: 'temperature', operator: '=', value: 300 }, // 4
  { id: 'press_high', label: 'High Pressure', type: 'pressure', operator: '>', value: 'High Pressure' }, // 5
  { id: 'env_uv', label: 'UV Light', type: 'energy', operator: '=', value: 'UV Light' }, // 6
  { id: 'env_dark', label: 'Dark', type: 'energy', operator: '=', value: 'Dark' }, // 7
  { id: 'env_sealed', label: 'Sealed Tube', type: 'pressure', operator: '=', value: 'Sealed Tube' }, // 8
  { id: 'temp_warm', label: 'Warm', type: 'temperature', operator: '>', value: 40, unit: '°C' }, // 9
  { id: 'temp_170', label: '170 °C', type: 'temperature', operator: '=', value: 170, unit: '°C' }, // 10
  { id: 'press_high_temp_high', label: 'High P & T', type: 'both', operator: '>', value: 'High' }, // 11
  { id: 'temp_heat', label: 'Heat', type: 'heating', operator: '=', value: 'Heat' } // 12
];

// Mapped generic groups to Et/Pr equivalents for SMILES rendering
export const ALIPHATIC_DATA: Record<string, Compound> = {
  alkane: {
    name: "Alkane (Ethane)", smiles: "CC", formula: "C₂H₆", tags: ["hydrocarbon"],
    transitions: [
      {
        target: "halogenoalkane", process: "Free Radical Substitution",
        reagents: ["Cl2 / Br2 gas"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[6]],
        notes: "Produces mixture of multi-substituted products via initiation, propagation, and termination."
      }
    ]
  },
  alkene: {
    name: "Alkene (Ethene)", smiles: "C=C", formula: "C₂H₄", tags: ["hydrocarbon"],
    transitions: [
      {
        target: "alkane", process: "Hydrogenation",
        reagents: ["H2 gas"], catalysts: ["Ni / Pt catalyst"], conditions: [ALIPHATIC_CONDITIONS[3]], 
        notes: "Electrophilic Addition. Also referred to as reduction."
      },
      {
        target: "halogenoalkane", process: "Electrophilic Addition",
        reagents: ["Dry HCl / HBr gas"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Follows Markovnikov's rule. Major product formed via the most stable carbocation intermediate."
      },
      {
        target: "dihalogenoalkane", process: "Electrophilic Addition",
        reagents: ["X2 (in organic solvent)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0], ALIPHATIC_CONDITIONS[7]], 
        notes: "Used as a test for unsaturation (decolourises bromine water in the dark)."
      },
      {
        target: "alcohol", process: "Hydration",
        reagents: ["H2O (steam)"], catalysts: ["Conc. H3PO4"], conditions: [ALIPHATIC_CONDITIONS[4], ALIPHATIC_CONDITIONS[5]], 
        notes: "Industrial method."
      },
      {
        target: "alcohol", process: "Hydration (Lab)",
        reagents: ["Cold conc. H2SO4 + H2O"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0], ALIPHATIC_CONDITIONS[9]], 
        notes: "Laboratory method. Reacts initially at RT, then warm with water."
      },
      {
        target: "diol", process: "Mild Oxidation",
        reagents: ["KMnO4 (cold, dilute)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Observe a colour change from purple to colourless."
      },
      {
        target: "polyalkene", process: "Addition Polymerisation",
        reagents: ["None"], catalysts: ["Ziegler-Natta", "Radical initiator"], conditions: [ALIPHATIC_CONDITIONS[11]],
        notes: "The pi bond breaks to form a continuous carbon chain. Not biodegradable."
      }
    ]
  },
  halogenoalkane: {
    name: "Halogenoalkane (Chloroethane)", smiles: "CCCl", formula: "C₂H₅Cl", tags: ["halogen"],
    transitions: [
      {
        target: "alcohol", process: "Nucleophilic Substitution",
        reagents: ["NaOH (aq) / KOH (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Aqueous conditions required. Proceeds via SN1 (tertiary) or SN2 (primary)."
      },
      {
        target: "alkene", process: "Elimination",
        reagents: ["NaOH / KOH (ethanolic)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Alcoholic conditions required. Hydroxide acts as a base instead of a nucleophile."
      },
      {
        target: "nitrile", process: "Nucleophilic Substitution",
        reagents: ["KCN / NaCN (ethanolic)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Extends carbon chain by one. Must be in ethanol to prevent hydrolysis."
      },
      {
        target: "amine", process: "Nucleophilic Substitution",
        reagents: ["NH3 (excess, ethanolic)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[8]], 
        notes: "Ammonia must be in excess to prevent further substitution into secondary/tertiary amines. Sealed tube required."
      }
    ]
  },
  dihalogenoalkane: {
    name: "Dihalogenoalkane (1,2-Dibromoethane)", smiles: "BrCCBr", formula: "C₂H₄Br₂", tags: ["halogen"],
    transitions: [
      {
        target: "diol", process: "Nucleophilic Substitution (Hydrolysis)",
        reagents: ["NaOH (aq) / KOH (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]],
        notes: "Both halogen atoms are substituted by hydroxyl groups."
      }
    ]
  },
  alcohol: {
    name: "Alcohol (Ethanol)", smiles: "CCO", formula: "C₂H₆O", tags: ["oxygen", "primary"],
    transitions: [
      {
        target: "halogenoalkane", process: "Nucleophilic Substitution (SOCl2)",
        reagents: ["SOCl2"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0], ALIPHATIC_CONDITIONS[9]], 
        notes: "Preferred route as by-products (SO2 and HCl) are gaseous."
      },
      {
        target: "halogenoalkane", process: "Nucleophilic Substitution (PCl5)",
        reagents: ["PCl5"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Produces steamy white fumes of HCl. Often used as a test for the -OH group."
      },
      {
        target: "halogenoalkane", process: "Nucleophilic Substitution (PCl3)",
        reagents: ["PCl3"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[12]], 
        notes: "Requires heating. By-product is H3PO3."
      },
      {
        target: "halogenoalkane", process: "Nucleophilic Substitution (HBr/HI)",
        reagents: ["NaBr + conc. H2SO4", "Red phosphorus + I2"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Generates HBr or PI3 in situ for bromination or iodination respectively."
      },
      {
        target: "alkene", process: "Elimination (Dehydration)",
        reagents: ["None"], catalysts: ["Conc. H2SO4", "Conc. H3PO4"], conditions: [ALIPHATIC_CONDITIONS[10]], 
        notes: "Removes a molecule of water."
      },
      {
        target: "alkene", process: "Elimination (Dehydration Lab)",
        reagents: ["None"], catalysts: ["Al2O3 powder"], conditions: [ALIPHATIC_CONDITIONS[12]], 
        notes: "Alternative laboratory method: pass vapour over heated catalyst."
      },
      {
        target: "aldehyde", process: "Partial Oxidation",
        reagents: ["K2Cr2O7 (acidified)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[2]], 
        notes: "Only works for primary alcohols. Must distil to prevent further oxidation."
      },
      {
        target: "carboxylic_acid", process: "Full Oxidation",
        reagents: ["K2Cr2O7 (acidified)", "KMnO4 (hot, conc)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Only works for primary alcohols."
      },
      {
        target: "ester", process: "Esterification (Acid)",
        reagents: ["Carboxylic acid"], catalysts: ["Conc. H2SO4"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Reversible condensation reaction."
      },
      {
        target: "ester", process: "Esterification (Acyl Chloride)",
        reagents: ["Acyl chloride"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Irreversible reaction, highly exothermic. Produces steamy fumes of HCl."
      },
      {
        target: "alkoxide", process: "Redox",
        reagents: ["Na (metal)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Produces effervescence of hydrogen gas. Demonstrates the weak acidity of alcohols."
      }
    ]
  },
  alkoxide: {
    name: "Alkoxide (Sodium ethoxide)", smiles: "CCO[Na]", formula: "C₂H₅NaO", tags: ["oxygen", "salt"],
    transitions: []
  },
  aldehyde: {
    name: "Aldehyde (Ethanal)", smiles: "CC=O", formula: "C₂H₄O", tags: ["oxygen", "carbonyl"],
    transitions: [
      {
        target: "alcohol", process: "Reduction",
        reagents: ["NaBH4", "LiAlH4 (dry ether)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Reduces to primary alcohol. Represented as [H]."
      },
      {
        target: "carboxylic_acid", process: "Oxidation",
        reagents: ["K2Cr2O7 (acidified)", "Tollens' reagent", "Fehling's solution"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Tollens' gives silver mirror. Fehling's gives brick-red precipitate."
      },
      {
        target: "hydroxynitrile", process: "Nucleophilic Addition",
        reagents: ["HCN + KCN trace", "NaCN + dilute H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Extends carbon chain. Forms a racemic mixture if a chiral centre is generated."
      }
    ]
  },
  ketone: {
    name: "Ketone (Propanone)", smiles: "CC(=O)C", formula: "C₃H₆O", tags: ["oxygen", "carbonyl"],
    transitions: [
      {
        target: "secondary_alcohol", process: "Reduction",
        reagents: ["NaBH4", "LiAlH4 (dry ether)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]],
        notes: "Reduces to a secondary alcohol (propan-2-ol)."
      },
      {
        target: "hydroxynitrile_c4", process: "Nucleophilic Addition",
        reagents: ["HCN + KCN trace", "NaCN + dilute H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]],
        notes: "Extends carbon chain; the product is branched since the carbonyl carbon already carries two alkyl groups."
      }
    ]
  },
  secondary_alcohol: {
    name: "Secondary Alcohol (Propan-2-ol)", smiles: "CC(O)C", formula: "C₃H₈O", tags: ["oxygen", "secondary"],
    transitions: [
      {
        target: "ketone", process: "Oxidation",
        reagents: ["K2Cr2O7 (acidified)", "KMnO4 (hot, conc)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]],
        notes: "Secondary alcohols oxidise to ketones. Tertiary alcohols do not oxidise this way."
      }
    ]
  },
  hydroxynitrile_c4: {
    name: "Hydroxynitrile (2-Hydroxy-2-methylpropanenitrile)", smiles: "CC(C)(O)C#N", formula: "C₄H₇NO", tags: ["nitrogen", "oxygen"],
    transitions: []
  },
  hydroxynitrile: {
    name: "Hydroxynitrile (2-Hydroxypropanenitrile)", smiles: "CC(O)C#N", formula: "C₃H₅NO", tags: ["nitrogen", "oxygen"],
    transitions: [
      {
        target: "hydroxy_carboxylic_acid", process: "Acid Hydrolysis",
        reagents: ["Dilute HCl / H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]],
        notes: "Produces a hydroxycarboxylic acid (lactic acid) and ammonium salt."
      },
      {
        target: "hydroxyamine", process: "Reduction",
        reagents: ["LiAlH4 (dry ether)", "H2 gas"], catalysts: ["Ni / Pt catalyst"], conditions: [ALIPHATIC_CONDITIONS[0], ALIPHATIC_CONDITIONS[11]],
        notes: "Reduces the -CN group to -CH2NH2, forming a hydroxyamine. Use H2 + Ni catalyst under heat/pressure, OR LiAlH4 at RT."
      }
    ]
  },
  hydroxy_carboxylic_acid: {
    name: "Hydroxy Acid (Lactic Acid)", smiles: "CC(O)C(=O)O", formula: "C₃H₆O₃", tags: ["oxygen"],
    transitions: []
  },
  hydroxyamine: {
    name: "Hydroxyamine (1-Amino-2-propanol)", smiles: "CC(O)CN", formula: "C₃H₉NO", tags: ["nitrogen", "oxygen"],
    transitions: []
  },
  carboxylic_acid: {
    name: "Carboxylic Acid (Ethanoic acid)", smiles: "CC(=O)O", formula: "C₂H₄O₂", tags: ["oxygen", "carbonyl"],
    transitions: [
      {
        target: "carboxylate_salt", process: "Neutralisation (Alkali)",
        reagents: ["NaOH (aq) / KOH (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Simple acid-base neutralisation."
      },
      {
        target: "carboxylate_salt", process: "Neutralisation (Carbonate)",
        reagents: ["Na2CO3 (aq) / NaHCO3 (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Produces effervescence of CO2. Used as a test for carboxylic acids."
      },
      {
        target: "carboxylate_salt", process: "Redox (Metal)",
        reagents: ["Na (metal)", "Mg (metal)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Produces effervescence of H2 gas."
      },
      {
        target: "alcohol", process: "Reduction",
        reagents: ["LiAlH4 (dry ether)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Reduces straight to primary alcohol. NaBH4 is not strong enough to reduce carboxylic acids."
      },
      {
        target: "acyl_chloride", process: "Nucleophilic Substitution (SOCl2)",
        reagents: ["SOCl2"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0], ALIPHATIC_CONDITIONS[9]], 
        notes: "Preferred route due to gaseous by-products (SO2 and HCl)."
      },
      {
        target: "acyl_chloride", process: "Nucleophilic Substitution (PCl5 / PCl3)",
        reagents: ["PCl5", "PCl3"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0], ALIPHATIC_CONDITIONS[12]], 
        notes: "PCl5 occurs at RT (steamy fumes). PCl3 requires heat."
      },
      {
        target: "ester", process: "Esterification",
        reagents: ["Alcohol"], catalysts: ["Conc. H2SO4"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Reversible condensation reaction establishing an equilibrium."
      },
      {
        target: "polyester", process: "Condensation Polymerisation",
        reagents: ["Diol"], catalysts: ["Conc. H2SO4"], conditions: [ALIPHATIC_CONDITIONS[12]], 
        notes: "Forms a polyester chain (requires a dicarboxylic acid), eliminating H2O."
      },
      {
        target: "polyamide", process: "Condensation Polymerisation",
        reagents: ["Diamine"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[12]], 
        notes: "Forms a polyamide chain (requires a dicarboxylic acid), eliminating H2O."
      }
    ]
  },
  carboxylate_salt: {
    name: "Carboxylate Salt (Sodium ethanoate)", smiles: "CC(=O)O[Na]", formula: "C₂H₃NaO₂", tags: ["oxygen", "salt"],
    transitions: [
      {
        target: "carboxylic_acid", process: "Acidification",
        reagents: ["Dilute HCl / H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]],
        notes: "Displaces the weaker carboxylic acid from its salt."
      }
    ]
  },
  acyl_chloride: {
    name: "Acyl Chloride (Ethanoyl chloride)", smiles: "CC(=O)Cl", formula: "C₂H₃ClO", tags: ["halogen", "carbonyl"],
    transitions: [
      {
        target: "carboxylic_acid", process: "Hydrolysis",
        reagents: ["H2O"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Highly exothermic, vigorous reaction. Produces steamy white fumes of HCl."
      },
      {
        target: "ester", process: "Esterification",
        reagents: ["Alcohol"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Faster and irreversible compared to using carboxylic acid. Produces HCl fumes."
      },
      {
        target: "amide", process: "Acylation (Primary)",
        reagents: ["Conc. NH3 (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Forms a primary amide."
      },
      {
        target: "n_ethylethanamide", process: "Acylation (Substituted)",
        reagents: ["Primary/Secondary Amine"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]],
        notes: "Forms an N-substituted amide (illustrated here as N-ethylethanamide)."
      },
      {
        target: "polyester", process: "Condensation Polymerisation",
        reagents: ["Diol"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Eliminates HCl. Requires a diacyl chloride."
      },
      {
        target: "polyamide", process: "Condensation Polymerisation",
        reagents: ["Diamine"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]], 
        notes: "Eliminates HCl. Requires a diacyl chloride."
      }
    ]
  },
  ester: {
    name: "Ester (Ethyl ethanoate)", smiles: "CCOC(=O)C", formula: "C₄H₈O₂", tags: ["oxygen", "carbonyl"],
    transitions: [
      {
        target: "carboxylic_acid", process: "Acid Hydrolysis",
        reagents: ["Dilute HCl / H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Reversible. Also produces an alcohol."
      },
      {
        target: "carboxylate_salt", process: "Alkaline Hydrolysis",
        reagents: ["NaOH (aq) / KOH (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Irreversible reaction. Also produces an alcohol."
      }
    ]
  },
  nitrile: {
    name: "Nitrile (Propanenitrile)", smiles: "CCC#N", formula: "C₃H₅N", tags: ["nitrogen"],
    transitions: [
      {
        target: "propanoic_acid", process: "Acid Hydrolysis",
        reagents: ["Dilute HCl / H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]],
        notes: "Full hydrolysis. Produces propanoic acid and an ammonium salt."
      },
      {
        target: "propanoate_salt", process: "Alkaline Hydrolysis",
        reagents: ["NaOH (aq) / KOH (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]],
        notes: "Full hydrolysis. Produces sodium propanoate and ammonia gas."
      },
      {
        target: "propanamide", process: "Partial Hydrolysis",
        reagents: ["Conc. H2SO4 / H2O2 (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]],
        notes: "Stops at the amide stage rather than full hydrolysis."
      },
      {
        target: "propylamine", process: "Reduction",
        reagents: ["LiAlH4 (dry ether)", "H2 gas"], catalysts: ["Ni / Pt catalyst"], conditions: [ALIPHATIC_CONDITIONS[0], ALIPHATIC_CONDITIONS[11]],
        notes: "Reduces -CN to -CH2NH2. H2 gas route requires heat and pressure."
      }
    ]
  },
  propanoic_acid: {
    name: "Carboxylic Acid (Propanoic Acid)", smiles: "CCC(=O)O", formula: "C₃H₆O₂", tags: ["oxygen", "carbonyl"],
    transitions: [
      {
        target: "propanoate_salt", process: "Neutralisation (Alkali)",
        reagents: ["NaOH (aq) / KOH (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]],
        notes: "Simple acid-base neutralisation."
      }
    ]
  },
  propanoate_salt: {
    name: "Carboxylate Salt (Sodium Propanoate)", smiles: "CCC(=O)O[Na]", formula: "C₃H₅NaO₂", tags: ["oxygen", "salt"],
    transitions: [
      {
        target: "propanoic_acid", process: "Acidification",
        reagents: ["Dilute HCl / H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]],
        notes: "Displaces the weaker carboxylic acid from its salt."
      }
    ]
  },
  propanamide: {
    name: "Amide (Propanamide)", smiles: "CCC(=O)N", formula: "C₃H₇NO", tags: ["nitrogen", "carbonyl"],
    transitions: []
  },
  propylamine: {
    name: "Amine (Propylamine)", smiles: "CCCN", formula: "C₃H₉N", tags: ["nitrogen"],
    transitions: []
  },
  amine: {
    name: "Amine (Ethylamine)", smiles: "CCN", formula: "C₂H₇N", tags: ["nitrogen"],
    transitions: [
      {
        target: "n_ethylethanamide", process: "Acylation",
        reagents: ["Acyl chloride"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0]],
        notes: "Nucleophilic Addition-Elimination. Forms N-substituted amide (N-ethylethanamide)."
      },
      {
        target: "diethylamine", process: "Nucleophilic Substitution",
        reagents: ["Halogenoalkane"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[8]],
        notes: "Further alkylation gives a secondary amine (and can continue on to tertiary/quaternary). Heat in sealed tube."
      },
      {
        target: "polyamide", process: "Condensation Polymerisation",
        reagents: ["Dicarboxylic acid", "Diacyl chloride"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[12], ALIPHATIC_CONDITIONS[0]],
        notes: "Eliminates H2O (acid route + heat) or HCl (acyl route + RT)."
      }
    ]
  },
  n_ethylethanamide: {
    name: "N-Substituted Amide (N-Ethylethanamide)", smiles: "CCNC(=O)C", formula: "C₄H₉NO", tags: ["nitrogen", "carbonyl"],
    transitions: []
  },
  diethylamine: {
    name: "Secondary Amine (Diethylamine)", smiles: "CCNCC", formula: "C₄H₁₁N", tags: ["nitrogen"],
    transitions: []
  },
  amide: {
    name: "Amide (Ethanamide)", smiles: "CC(=O)N", formula: "C₂H₅NO", tags: ["nitrogen", "carbonyl"],
    transitions: [
      {
        target: "carboxylic_acid", process: "Acid Hydrolysis",
        reagents: ["Dilute HCl / H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Produces carboxylic acid and an ammonium salt."
      },
      {
        target: "carboxylate_salt", process: "Alkaline Hydrolysis",
        reagents: ["NaOH (aq) / KOH (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]], 
        notes: "Produces carboxylate salt and ammonia/amine."
      },
      {
        target: "amine", process: "Reduction",
        reagents: ["LiAlH4 (dry ether)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[0], ALIPHATIC_CONDITIONS[9]], 
        notes: "Reduces the carbonyl C=O of the amide to a CH2 group. NaBH4 cannot reduce amides."
      }
    ]
  },
  diol: { 
    name: "Diol (Ethane-1,2-diol)", smiles: "OCCO", formula: "C₂H₆O₂", tags: ["oxygen"], 
    transitions: [
      {
        target: "polyester", process: "Condensation Polymerisation",
        reagents: ["Dicarboxylic acid", "Diacyl chloride"], catalysts: ["Conc. H2SO4"], conditions: [ALIPHATIC_CONDITIONS[12], ALIPHATIC_CONDITIONS[0]],
        notes: "Eliminates H2O (if acid) or HCl (if acyl chloride)."
      }
    ] 
  },
  amino_acid: {
    name: "Amino Acid (Glycine)", smiles: "NCC(=O)O", formula: "C₂H₅NO₂", tags: ["nitrogen", "oxygen"],
    transitions: [
      {
        target: "polyamide", process: "Condensation Polymerisation",
        reagents: ["None"], catalysts: ["Biological enzymes", "None"], conditions: [ALIPHATIC_CONDITIONS[12], ALIPHATIC_CONDITIONS[0]],
        notes: "Self-condensation. Forms polypeptides/proteins via peptide (amide) bonds, eliminating water."
      }
    ]
  },
  polyalkene: {
    name: "Poly(alkene)", smiles: "*CC*", formula: "(C₂H₄)n", tags: ["polymer", "hydrocarbon"],
    transitions: []
  },
  polyester: {
    name: "Polyester", smiles: "*CCOC(=O)CC(=O)*", formula: "(CₓH_yO_z)n", tags: ["polymer", "oxygen"],
    transitions: [
      {
        target: "carboxylic_acid", process: "Acid Hydrolysis",
        reagents: ["Dilute HCl / H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]],
        notes: "Breaks polymer down into original diol and dicarboxylic acid."
      },
      {
        target: "carboxylate_salt", process: "Alkaline Hydrolysis",
        reagents: ["NaOH (aq) / KOH (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]],
        notes: "Breaks polymer down into original diol and dicarboxylate salt."
      }
    ]
  },
  polyamide: {
    name: "Polyamide", smiles: "*CCNC(=O)CCC(=O)*", formula: "(CₓH_yN_zO_w)n", tags: ["polymer", "nitrogen"],
    transitions: [
      {
        target: "carboxylic_acid", process: "Acid Hydrolysis",
        reagents: ["Dilute HCl / H2SO4"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]],
        notes: "Breaks polymer down into dicarboxylic acid and the diamine (which immediately protonates to form a diammonium salt)."
      },
      {
        target: "carboxylate_salt", process: "Alkaline Hydrolysis",
        reagents: ["NaOH (aq) / KOH (aq)"], catalysts: ["None"], conditions: [ALIPHATIC_CONDITIONS[1]],
        notes: "Breaks polymer down into dicarboxylate salt and the original diamine."
      }
    ]
  }
};