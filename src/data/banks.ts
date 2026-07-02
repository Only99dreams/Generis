export interface Bank {
  code: string;
  name: string;
}

export const NIGERIAN_BANKS: Bank[] = [
  { code: "044", name: "Access Bank" },
  { code: "100026", name: "Carbon" },
  { code: "023", name: "Citibank Nigeria" },
  { code: "063", name: "Diamond Bank" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank (FCMB)" },
  { code: "058", name: "Guaranty Trust Bank (GTBank)" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "090267", name: "Kuda Microfinance Bank" },
  { code: "014", name: "MainStreet Bank" },
  { code: "090405", name: "Moniepoint Bank" },
  { code: "120003", name: "Momo Payment Service Bank" },
  { code: "305", name: "Paycom (Opay)" },
  { code: "327", name: "Paga Microfinance Bank" },
  { code: "100033", name: "Palmpay" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "090325", name: "Sparkle" },
  { code: "039", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "SunTrust Bank Nigeria Limited" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "215", name: "Unity Bank" },
  { code: "566", name: "VFD Microfinance Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "000", name: "Other Banks" },
];

export function searchBanks(query: string): Bank[] {
  const q = query.toLowerCase();
  return NIGERIAN_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.code.includes(q)
  );
}
