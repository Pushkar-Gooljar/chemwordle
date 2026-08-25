import { type Compound, type ConditionSpec } from './types';

export const AROMATIC_REAGENTS = [
  "CH3Cl", "Propene", "2-chloropropane", "Cl2 gas", "Br2 gas", "Br2 (aq)", 
  "HNO3 (conc)", "HNO3 (dilute)", "H2 gas", "CH3COCl", 
  "KMnO4 (aq, acidified)", "KMnO4 (aq, alkaline)", "K2Cr2O7 (acidified)",
  "NaOH (aq)", "KOH (aq)", "Na (s)", "Na2CO3 (aq)", 
  "KCN / NaCN (ethanolic)", "NaCN + dilute H2SO4", "NH3 (excess, ethanolic)", "NH3 (conc)", 
  "SOCl2", "PCl5", "LiAlH4 (dry ether)", "NaBH4", 
  "Phenol (C6H5OH)", "Ethanol", "Aliphatic alcohol", "Phenylamine", "Aromatic diamine", 
  "Acyl chloride", "Benzoyl chloride", "Sn / Fe metal + conc. HCl", "NaNO2 + dilute HCl", 
  "H2O", "HCl (dilute)", "H2SO4 (dilute)", "Dilute strong acid"
];

export const AROMATIC_CATALYSTS = [
  "AlCl3 (anhydrous)", "FeCl3", "AlBr3", "FeBr3", "H3PO4", "H2SO4 (conc)", 
  "Ni / Pt catalyst", "Ni catalyst", "None"
];

export const AROMATIC_CONDITIONS: ConditionSpec[] = [
  { id: 'temp_rt', label: 'Room Temperature', type: 'temperature', operator: '=', value: 25, unit: '°C' }, // 0
  { id: 'temp_rt_warm', label: 'Room Temp / Warm', type: 'temperature', operator: 'range', minValue: 25, maxValue: 40, unit: '°C' }, // 1
  { id: 'temp_reflux', label: 'Heat under Reflux', type: 'heating', operator: '=', value: 'Reflux' }, // 2
  { id: 'temp_reflux_acidify', label: 'Heat under Reflux, then acidify', type: 'heating', operator: '=', value: 'Reflux followed by acidification' }, // 3
  { id: 'temp_30', label: '30 °C', type: 'temperature', operator: '=', value: 30, unit: '°C' }, // 4
  { id: 'temp_55', label: 'Warm (50-55 °C)', type: 'temperature', operator: 'range', minValue: 50, maxValue: 55, unit: '°C' }, // 5
  { id: 'temp_150', label: '150-200 °C', type: 'temperature', operator: 'range', minValue: 150, maxValue: 200, unit: '°C' }, // 6
  { id: 'temp_ice', label: 'Ice Bath (0-5 °C)', type: 'temperature', operator: 'range', minValue: 0, maxValue: 5, unit: '°C' }, // 7
  { id: 'temp_lt_10', label: 'Cold (< 10 °C)', type: 'temperature', operator: '<', value: 10, unit: '°C' }, // 8
  { id: 'temp_gt_10', label: 'Warm (> 10 °C)', type: 'temperature', operator: '>', value: 10, unit: '°C' }, // 9
  { id: 'env_anhydrous', label: 'Anhydrous / Dry', type: 'environment', operator: '=', value: 'Anhydrous' }, // 10
  { id: 'env_dark', label: 'Dark', type: 'energy', operator: '=', value: 'Dark' }, // 11
  { id: 'env_uv', label: 'UV Light / Sunlight', type: 'energy', operator: '=', value: 'UV Light' }, // 12
  { id: 'press_high', label: 'High Pressure', type: 'pressure', operator: '>', value: 'High Pressure' }, // 13
  { id: 'env_sealed', label: 'Sealed Tube', type: 'pressure', operator: '=', value: 'Sealed Tube' }, // 14
  { id: 'temp_heat', label: 'Heat', type: 'heating', operator: '=', value: 'Heat' } // 15
];

export const AROMATIC_DATA: Record<string, Compound> = {
  benzene: {
    name: "Benzene", smiles: "c1ccccc1", formula: "C₆H₆", tags: ["unsubstituted"],
    transitions: [
      {
        target: "methylbenzene", process: "Friedel-Crafts Alkylation",
        reagents: ["CH3Cl"], catalysts: ["AlCl3 (anhydrous)", "FeCl3"], conditions: [AROMATIC_CONDITIONS[2], AROMATIC_CONDITIONS[10]],
        notes: "Electrophilic substitution. Generates the strongly electrophilic CH3+ carbocation."
      },
      {
        target: "isopropylbenzene", process: "Friedel-Crafts Alkylation",
        reagents: ["Propene"], catalysts: ["H3PO4"], conditions: [AROMATIC_CONDITIONS[15], AROMATIC_CONDITIONS[13]],
        notes: "Industrial synthesis of cumene."
      },
      {
        target: "isopropylbenzene", process: "Friedel-Crafts Alkylation",
        reagents: ["2-chloropropane"], catalysts: ["AlCl3 (anhydrous)"], conditions: [AROMATIC_CONDITIONS[2], AROMATIC_CONDITIONS[10]],
        notes: "Laboratory synthesis of cumene via electrophilic substitution."
      },
      {
        target: "nitrobenzene", process: "Nitration",
        reagents: ["HNO3 (conc)"], catalysts: ["H2SO4 (conc)"], conditions: [AROMATIC_CONDITIONS[5]],
        notes: "Electrophilic substitution. Generates nitronium ion NO2+. Temperatures >55°C lead to further substitution."
      },
      {
        target: "cyclohexane", process: "Hydrogenation",
        reagents: ["H2 gas"], catalysts: ["Ni / Pt catalyst"], conditions: [AROMATIC_CONDITIONS[6], AROMATIC_CONDITIONS[13]],
        notes: "Addition reaction. Completely breaks the delocalised pi-ring."
      },
      {
        target: "chlorobenzene", process: "Halogenation",
        reagents: ["Cl2 gas"], catalysts: ["AlCl3 (anhydrous)", "FeCl3"], conditions: [AROMATIC_CONDITIONS[0], AROMATIC_CONDITIONS[11], AROMATIC_CONDITIONS[10]],
        notes: "Electrophilic substitution. Catalyst generates Cl+ electrophile."
      },
      {
        target: "bromobenzene", process: "Halogenation",
        reagents: ["Br2 gas"], catalysts: ["AlBr3", "FeBr3"], conditions: [AROMATIC_CONDITIONS[0], AROMATIC_CONDITIONS[11], AROMATIC_CONDITIONS[10]],
        notes: "Electrophilic substitution. Catalyst generates Br+ electrophile."
      },
      {
        target: "phenyl_ethanone", process: "Friedel-Crafts Acylation",
        reagents: ["CH3COCl"], catalysts: ["AlCl3 (anhydrous)"], conditions: [AROMATIC_CONDITIONS[2], AROMATIC_CONDITIONS[10]],
        notes: "Electrophilic substitution. Generates the acylium ion CH3C+=O."
      }
    ]
  },
  methylbenzene: {
    name: "Methylbenzene", smiles: "Cc1ccccc1", formula: "C₇H₈", tags: ["2,4-directing"],
    transitions: [
      {
        target: "chloromethyl_benzene", process: "Free Radical Substitution",
        reagents: ["Cl2 gas"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[12]],
        notes: "Reaction occurs on the aliphatic side-chain, not the aromatic ring."
      },
      {
        target: "2_and_4_chloromethylbenzene", process: "Ring Halogenation",
        reagents: ["Cl2 gas"], catalysts: ["AlCl3 (anhydrous)", "FeCl3"], conditions: [AROMATIC_CONDITIONS[0], AROMATIC_CONDITIONS[11], AROMATIC_CONDITIONS[10]],
        notes: "The methyl group activates the ring and directs the incoming chlorine to the 2 (ortho) and 4 (para) positions."
      },
      {
        target: "2_and_4_nitromethylbenzene", process: "Ring Nitration",
        reagents: ["HNO3 (conc)"], catalysts: ["H2SO4 (conc)"], conditions: [AROMATIC_CONDITIONS[4]],
        notes: "Requires a lower temperature than benzene nitration because the methyl group activates the ring."
      },
      {
        target: "benzoic_acid", process: "Side-chain Oxidation",
        reagents: ["KMnO4 (aq, acidified)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "The alkyl side chain is fully oxidised to a carboxyl group."
      },
      {
        target: "benzoic_acid", process: "Side-chain Oxidation",
        reagents: ["KMnO4 (aq, alkaline)", "HCl (dilute)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[3]],
        notes: "Forms benzoate salt first, requiring subsequent acidification."
      }
    ]
  },
  chloromethyl_benzene: {
    name: "Chloromethyl benzene", smiles: "ClCc1ccccc1", formula: "C₇H₇Cl", tags: ["2,4-directing"],
    transitions: [
      {
        target: "phenyl_methanol", process: "Nucleophilic Substitution (Hydrolysis)",
        reagents: ["NaOH (aq)", "KOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Nucleophilic substitution of the side chain halogen."
      },
      {
        target: "phenyl_ethanenitrile", process: "Nucleophilic Substitution",
        reagents: ["KCN / NaCN (ethanolic)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Extends the carbon chain by one."
      },
      {
        target: "phenyl_methylamine", process: "Nucleophilic Substitution",
        reagents: ["NH3 (excess, ethanolic)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[15], AROMATIC_CONDITIONS[14]],
        notes: "Excess ammonia prevents further substitution into secondary/tertiary amines."
      }
    ]
  },
  phenyl_methanol: {
    name: "Phenyl methanol (Benzyl alcohol)", smiles: "OCc1ccccc1", formula: "C₇H₈O", tags: ["2,4-directing"],
    transitions: [
      {
        target: "benzoic_acid", process: "Oxidation",
        reagents: ["KMnO4 (aq, acidified)", "K2Cr2O7 (acidified)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Oxidises the primary alcohol directly to the carboxylic acid."
      },
      {
        target: "chloromethyl_benzene", process: "Nucleophilic Substitution",
        reagents: ["SOCl2", "PCl5"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Converts the hydroxyl group to a chloride."
      }
    ]
  },
  phenyl_ethanenitrile: {
    name: "Phenyl ethanenitrile", smiles: "N#CCc1ccccc1", formula: "C₈H₇N", tags: ["intermediate"],
    transitions: [
      {
        target: "phenyl_ethanoic_acid", process: "Hydrolysis",
        reagents: ["HCl (dilute)", "H2SO4 (dilute)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Full acid hydrolysis forming the acid and ammonium salt."
      },
      {
        target: "phenyl_ethanoic_acid", process: "Hydrolysis",
        reagents: ["NaOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[3]],
        notes: "Alkaline hydrolysis forms the salt first, releasing ammonia gas."
      },
      {
        target: "2_phenylethylamine", process: "Reduction",
        reagents: ["LiAlH4 (dry ether)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Reduces -CN to -CH2NH2."
      },
      {
        target: "2_phenylethylamine", process: "Reduction",
        reagents: ["H2 gas"], catalysts: ["Ni catalyst"], conditions: [AROMATIC_CONDITIONS[15], AROMATIC_CONDITIONS[13]],
        notes: "Catalytic hydrogenation."
      }
    ]
  },
  benzoic_acid: {
    name: "Benzoic acid", smiles: "O=C(O)c1ccccc1", formula: "C₇H₆O₂", tags: ["3-directing"],
    transitions: [
      {
        target: "benzoyl_chloride", process: "Nucleophilic Substitution",
        reagents: ["SOCl2"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[1]],
        notes: "Preferred route due to gaseous by-products."
      },
      {
        target: "benzoyl_chloride", process: "Nucleophilic Substitution",
        reagents: ["PCl5"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Produces steamy white fumes of HCl."
      },
      {
        target: "phenyl_methanol", process: "Reduction",
        reagents: ["LiAlH4 (dry ether)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Strong reducing agent required. NaBH4 will not reduce carboxylic acids."
      },
      {
        target: "sodium_benzoate", process: "Neutralisation",
        reagents: ["NaOH (aq)", "Na2CO3 (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Forms a soluble salt. Na2CO3 produces effervescence (CO2)."
      }
    ]
  },
  sodium_benzoate: {
    name: "Sodium Benzoate", smiles: "O=C([O-])c1ccccc1.[Na+]", formula: "C₇H₅NaO₂", tags: ["3-directing"],
    transitions: [
      {
        target: "benzoic_acid", process: "Acidification",
        reagents: ["HCl (dilute)", "H2SO4 (dilute)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Regenerates the insoluble benzoic acid, forming a white precipitate."
      }
    ]
  },
  benzoyl_chloride: {
    name: "Benzoyl Chloride", smiles: "O=C(Cl)c1ccccc1", formula: "C₇H₅ClO", tags: ["3-directing"],
    transitions: [
      {
        target: "benzoic_acid", process: "Hydrolysis",
        reagents: ["H2O"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Vigorous addition-elimination reaction. Produces steamy white fumes of HCl."
      },
      {
        target: "phenyl_benzoate", process: "Esterification",
        reagents: ["Phenol (C6H5OH)", "NaOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "NaOH converts phenol to the stronger nucleophile phenoxide ion."
      },
      {
        target: "alkyl_benzoate", process: "Esterification",
        reagents: ["Aliphatic alcohol"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Fast addition-elimination. No acid catalyst required, unlike carboxylic acids."
      },
      {
        target: "benzylamide", process: "Amidation",
        reagents: ["NH3 (conc)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Highly exothermic. Forms a primary amide linkage and steamy HCl fumes."
      },
      {
        target: "n_phenylbenzamide", process: "Amidation",
        reagents: ["Phenylamine"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Forms a secondary aromatic amide."
      },
      {
        target: "aromatic_polyamide", process: "Condensation Polymerisation",
        reagents: ["Aromatic diamine"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Forms an aromatic polyamide like Kevlar. Eliminates HCl."
      }
    ]
  },
  alkyl_benzoate: {
    name: "Alkyl Benzoate", smiles: "O=C(OCC)c1ccccc1", formula: "C₉H₁₀O₂", tags: ["3-directing"],
    transitions: [
      {
        target: "benzoic_acid", process: "Acid Hydrolysis",
        reagents: ["HCl (dilute)", "H2SO4 (dilute)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Reversible hydrolysis to form benzoic acid and an aliphatic alcohol."
      },
      {
        target: "sodium_benzoate", process: "Alkaline Hydrolysis",
        reagents: ["NaOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Irreversible hydrolysis to form sodium benzoate and an aliphatic alcohol."
      }
    ]
  },
  benzylamide: {
    name: "Benzamide", smiles: "NC(=O)c1ccccc1", formula: "C₇H₇NO", tags: ["3-directing"],
    transitions: [
      {
        target: "phenyl_methylamine", process: "Reduction",
        reagents: ["LiAlH4 (dry ether)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Reduces the carbonyl group to -CH2-."
      },
      {
        target: "benzoic_acid", process: "Acid Hydrolysis",
        reagents: ["HCl (dilute)", "H2SO4 (dilute)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Yields benzoic acid and ammonium salt."
      },
      {
        target: "sodium_benzoate", process: "Alkaline Hydrolysis",
        reagents: ["NaOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Yields sodium benzoate and ammonia gas."
      }
    ]
  },
  nitrobenzene: {
    name: "Nitrobenzene", smiles: "O=[N+]([O-])c1ccccc1", formula: "C₆H₅NO₂", tags: ["3-directing"],
    transitions: [
      {
        target: "phenylamine", process: "Reduction",
        reagents: ["Sn / Fe metal + conc. HCl", "NaOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Reduces -NO2 to -NH2. The NaOH deprotonates the intermediate phenylammonium salt."
      }
    ]
  },
  phenylamine: {
    name: "Phenylamine (Aniline)", smiles: "Nc1ccccc1", formula: "C₆H₇N", tags: ["2,4,6-directing"],
    transitions: [
      {
        target: "phenylammonium_chloride", process: "Neutralisation",
        reagents: ["HCl (dilute)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "The lone pair on the nitrogen accepts a proton, forming a soluble ionic salt."
      },
      {
        target: "2_4_6_tribromophenylamine", process: "Electrophilic Substitution (Bromination)",
        reagents: ["Br2 (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "The lone pair strongly activates the ring, causing multiple substitutions at 2, 4, and 6 without a catalyst. Forms a white ppt."
      },
      {
        target: "n_phenylethanamide", process: "Acylation / Amidation",
        reagents: ["CH3COCl"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0], AROMATIC_CONDITIONS[10]],
        notes: "Addition-elimination reaction forming a secondary amide linkage."
      },
      {
        target: "n_phenylbenzamide", process: "Acylation / Amidation",
        reagents: ["Benzoyl chloride"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Forms an aromatic secondary amide."
      },
      {
        target: "benzenediazonium_chloride", process: "Diazotisation",
        reagents: ["NaNO2 + dilute HCl"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[7]],
        notes: "If T > 10°C, the diazonium salt decomposes into phenol and N2 gas."
      }
    ]
  },
  benzenediazonium_chloride: {
    name: "Benzenediazonium chloride", smiles: "[N+]#Nc1ccccc1.[Cl-]", formula: "C₆H₅ClN₂", tags: ["intermediate"],
    transitions: [
      {
        target: "azo_dye", process: "Coupling reaction",
        reagents: ["Phenol (C6H5OH)", "NaOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[8]],
        notes: "Electrophilic substitution. Diazonium acts as a weak electrophile to form an extensively delocalised coloured dye."
      },
      {
        target: "phenol", process: "Hydrolysis / Decomposition",
        reagents: ["H2O"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[9]],
        notes: "Thermal decomposition of the diazonium group releases N2 gas and phenol."
      }
    ]
  },
  phenol: {
    name: "Phenol", smiles: "Oc1ccccc1", formula: "C₆H₆O", tags: ["2,4,6-directing"],
    transitions: [
      {
        target: "sodium_phenoxide", process: "Acid-Base / Redox",
        reagents: ["Na (s)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Redox reaction demonstrating weak acidity. Produces effervescence of H2 gas."
      },
      {
        target: "sodium_phenoxide", process: "Acid-Base / Redox",
        reagents: ["NaOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Acid-base neutralisation. Phenol dissolves to form a soluble salt. Phenol does NOT react with carbonates."
      },
      {
        target: "2_and_4_nitrophenol", process: "Electrophilic Substitution (Nitration)",
        reagents: ["HNO3 (dilute)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Ring is highly activated by the -OH lone pair, allowing nitration with dilute acid to form a mixture of mono-substituted products."
      },
      {
        target: "2_4_6_trinitrophenol", process: "Electrophilic Substitution (Nitration)",
        reagents: ["HNO3 (conc)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Strong activation allows for triple substitution at 2, 4, and 6 without a sulfuric acid catalyst."
      },
      {
        target: "2_4_6_tribromophenol", process: "Electrophilic Substitution (Bromination)",
        reagents: ["Br2 (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Reacts instantly without a halogen carrier. Decolourises bromine water and forms a white precipitate."
      },
      {
        target: "phenyl_ester", process: "Esterification",
        reagents: ["Acyl chloride", "NaOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Phenol does not react directly with carboxylic acids. NaOH converts it to the more nucleophilic phenoxide ion first."
      }
    ]
  },
  sodium_phenoxide: {
    name: "Sodium Phenoxide", smiles: "[O-]c1ccccc1.[Na+]", formula: "C₆H₅NaO", tags: ["2,4,6-directing"],
    transitions: [
      {
        target: "phenol", process: "Acidification",
        reagents: ["Dilute strong acid"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Regenerates phenol from its salt."
      }
    ]
  },
  phenyl_ester: {
    name: "Phenyl Ester", smiles: "CC(=O)Oc1ccccc1", formula: "C₈H₈O₂", tags: ["2,4-directing"],
    transitions: [
      {
        target: "phenol", process: "Alkaline Hydrolysis",
        reagents: ["NaOH (aq)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[3]],
        notes: "Yields phenoxide first, which must be acidified to obtain phenol."
      }
    ]
  },
  phenyl_ethanone: {
    name: "Phenyl ethanone", smiles: "CC(=O)c1ccccc1", formula: "C₈H₈O", tags: ["3-directing"],
    transitions: [
      {
        target: "1_phenylethanol", process: "Reduction",
        reagents: ["LiAlH4 (dry ether)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Reduces the ketone back into a secondary alcohol."
      },
      {
        target: "1_phenylethanol", process: "Reduction",
        reagents: ["NaBH4"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Milder reducing agent suitable for ketones."
      },
      {
        target: "2_hydroxy_2_phenylpropanenitrile", process: "Nucleophilic Addition",
        reagents: ["NaCN + dilute H2SO4"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[0]],
        notes: "Because the carbonyl carbon is planar, attack occurs from above/below equally, forming a racemic mixture."
      }
    ]
  },
  "2_hydroxy_2_phenylpropanenitrile": {
    name: "2-hydroxy-2-phenylpropanenitrile", smiles: "CC(O)(C#N)c1ccccc1", formula: "C₉H₉NO", tags: ["intermediate"],
    transitions: [
      {
        target: "2_hydroxy_2_phenylpropanoic_acid", process: "Acid Hydrolysis",
        reagents: ["HCl (dilute)", "H2SO4 (dilute)"], catalysts: ["None"], conditions: [AROMATIC_CONDITIONS[2]],
        notes: "Hydrolyses the nitrile group to a carboxylic acid."
      }
    ]
  },
  
  // Terminal/Leaf Nodes (No outbound transitions specified in the JSON)
  "2_hydroxy_2_phenylpropanoic_acid": { name: "2-hydroxy-2-phenylpropanoic acid", smiles: "CC(O)(C(=O)O)c1ccccc1", formula: "C₉H₁₀O₃", tags: ["intermediate"], transitions: [] },
  "1_phenylethanol": { name: "1-phenylethanol", smiles: "CC(O)c1ccccc1", formula: "C₈H₁₀O", tags: ["2,4-directing"], transitions: [] },
  "phenyl_methylamine": { name: "Phenyl methylamine (Benzylamine)", smiles: "NCc1ccccc1", formula: "C₇H₉N", tags: ["intermediate"], transitions: [] },
  "phenyl_ethanoic_acid": { name: "Phenyl ethanoic acid", smiles: "O=C(O)Cc1ccccc1", formula: "C₈H₈O₂", tags: ["intermediate"], transitions: [] },
  "2_phenylethylamine": { name: "2-phenylethylamine", smiles: "NCCc1ccccc1", formula: "C₈H₁₁N", tags: ["intermediate"], transitions: [] },
  "isopropylbenzene": { name: "Isopropylbenzene (Cumene)", smiles: "CC(C)c1ccccc1", formula: "C₉H₁₂", tags: ["2,4-directing"], transitions: [] },
  "bromobenzene": { name: "Bromobenzene", smiles: "Brc1ccccc1", formula: "C₆H₅Br", tags: ["2,4-directing"], transitions: [] },
  "chlorobenzene": { name: "Chlorobenzene", smiles: "Clc1ccccc1", formula: "C₆H₅Cl", tags: ["2,4-directing"], transitions: [] },
  "cyclohexane": { name: "Cyclohexane", smiles: "C1CCCCC1", formula: "C₆H₁₂", tags: ["unsubstituted"], transitions: [] },
  "2_and_4_chloromethylbenzene": { name: "2-chloromethylbenzene + 4-chloromethylbenzene", smiles: "Cc1ccccc1Cl", formula: "C₇H₇Cl", tags: ["intermediate"], transitions: [] },
  "2_and_4_nitromethylbenzene": { name: "2-nitromethylbenzene + 4-nitromethylbenzene", smiles: "Cc1ccccc1[N+](=O)[O-]", formula: "C₇H₇NO₂", tags: ["intermediate"], transitions: [] },
  "phenylammonium_chloride": { name: "Phenylammonium chloride", smiles: "[NH3+]c1ccccc1.[Cl-]", formula: "C₆H₈ClN", tags: ["3-directing"], transitions: [] },
  "2_4_6_tribromophenylamine": { name: "2,4,6-tribromophenylamine", smiles: "Nc1c(Br)cc(Br)cc1Br", formula: "C₆H₄Br₃N", tags: ["intermediate"], transitions: [] },
  "n_phenylethanamide": { name: "N-phenylethanamide", smiles: "CC(=O)Nc1ccccc1", formula: "C₈H₉NO", tags: ["2,4-directing"], transitions: [] },
  "n_phenylbenzamide": { name: "N-phenylbenzamide", smiles: "O=C(Nc1ccccc1)c2ccccc2", formula: "C₁₃H₁₁NO", tags: ["intermediate"], transitions: [] },
  "azo_dye": { name: "Azo dye", smiles: "Oc1ccc(/N=N/c2ccccc2)cc1", formula: "C₁₂H₁₀N₂O", tags: ["intermediate"], transitions: [] },
  "2_and_4_nitrophenol": { name: "2-nitrophenol + 4-nitrophenol", smiles: "Oc1ccccc1[N+](=O)[O-]", formula: "C₆H₅NO₃", tags: ["intermediate"], transitions: [] },
  "2_4_6_trinitrophenol": { name: "2,4,6-trinitrophenol", smiles: "Oc1c([N+](=O)[O-])cc([N+](=O)[O-])cc1[N+](=O)[O-]", formula: "C₆H₃N₃O₇", tags: ["intermediate"], transitions: [] },
  "2_4_6_tribromophenol": { name: "2,4,6-tribromophenol", smiles: "Oc1c(Br)cc(Br)cc1Br", formula: "C₆H₃Br₃O", tags: ["intermediate"], transitions: [] },
  "phenyl_benzoate": { name: "Phenyl Benzoate", smiles: "O=C(Oc1ccccc1)c2ccccc2", formula: "C₁₃H₁₀O₂", tags: ["intermediate"], transitions: [] },
  "aromatic_polyester": { name: "Aromatic Polyester (e.g. Terylene/PET)", smiles: "*C(=O)c1ccc(C(=O)O*)cc1", formula: "N/A", tags: ["intermediate"], transitions: [] },
  "aromatic_polyamide": { name: "Aromatic Polyamide (e.g. Kevlar)", smiles: "*C(=O)c1ccc(C(=O)N*c2ccc(N*)cc2)cc1", formula: "N/A", tags: ["intermediate"], transitions: [] }
};