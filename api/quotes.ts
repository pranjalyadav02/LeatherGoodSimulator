export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'POST') {
    const body = req.body || {}
    const newQuote = {
      id: `Q-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      createdAt: new Date().toISOString(),
      customer: body.customer ?? { name: 'Anonymous Client', email: 'guest@carrytote.in' },
      productId: body.productId ?? 'tote',
      productName: body.productName ?? 'Everyday Tote Bag',
      leatherId: body.leatherId ?? 'heritage-calf',
      leatherName: body.leatherName ?? 'Heritage Calf',
      colorName: body.colorName ?? 'Cognac Tan',
      hardware: body.hardware ?? 'brass',
      monogram: body.monogram ?? '',
      monogramMethod: body.monogramMethod ?? 'gold_foil',
      dimensions: body.dimensions ?? 'Standard Proportions',
      totalPrice: body.totalPrice ?? 4500,
      status: 'New Quote Request',
      craftsman: 'Unassigned',
      notes: body.notes ?? '',
      workshopSpec: body.workshopSpec ?? '',
      configuration: body.configuration ?? null,
    }
    return res.status(201).json({ success: true, quote: newQuote })
  }

  // GET
  res.status(200).json({
    quotes: [
      {
        id: 'Q-2026-0841',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        customer: { name: 'Ananya Sharma', email: 'ananya.sharma@example.com', phone: '+91 98201 44512' },
        productId: 'tote',
        productName: 'Everyday Tote Bag',
        leatherId: 'heritage-calf',
        leatherName: 'Heritage Full-Grain Calf',
        colorName: 'Cognac Tan',
        hardware: 'brass',
        monogram: 'AS',
        monogramMethod: 'gold_foil',
        dimensions: '36 × 30 × 14 cm',
        totalPrice: 4707,
        status: 'In Cutting Bench',
        craftsman: 'Master Craftsman Rajesh K.',
        notes: 'Please ensure double edge wax burnishing on handle straps.',
      },
      {
        id: 'Q-2026-0839',
        createdAt: new Date(Date.now() - 3600000 * 22).toISOString(),
        customer: { name: 'Vikram Malhotra', email: 'vikram.m@zenithcapital.in' },
        productId: 'wallet',
        productName: 'Bifold & Snap Wallet',
        leatherId: 'saffiano',
        leatherName: 'Saffiano Cross-Grain',
        colorName: 'Obsidian Black',
        hardware: 'black',
        monogram: 'VM',
        monogramMethod: 'blind_deboss',
        dimensions: '11.5 × 9.5 × 2 cm',
        totalPrice: 2260,
        status: 'Ready for Dispatch',
        craftsman: 'Artisan Suresh M.',
      },
    ],
  })
}
