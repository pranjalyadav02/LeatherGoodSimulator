export default function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.status(200).json({
    status: 'online',
    service: 'Atelier N°07 × Carry Bespoke Studio Backend (Vercel Serverless)',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    platform: 'Vercel Edge/Serverless',
  })
}
