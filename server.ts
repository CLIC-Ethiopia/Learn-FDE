import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // In-memory session tracking for backend session orchestration
  const activeSessions = new Map<string, {
    sessionId: string;
    startTime: number;
    lastActive: number;
    targetModule?: string;
    scriptRuns: number;
  }>();

  // API 1: Backend Session Orchestration
  app.post('/api/session/start', (req: Request, res: Response) => {
    const sessionId = 'fde_sess_' + Math.random().toString(36).substring(2, 10);
    const session = {
      sessionId,
      startTime: Date.now(),
      lastActive: Date.now(),
      targetModule: req.body?.targetModule || 'mod-apis-grpc',
      scriptRuns: 0
    };
    activeSessions.set(sessionId, session);
    res.json({ success: true, session });
  });

  // API 2: Backend Script Trigger
  app.post('/api/session/trigger-script', (req: Request, res: Response) => {
    const { scriptType, parameters } = req.body || {};
    
    // Simulate orchestration script triggers (e.g. airgap verification, synthetic schema builder)
    let executionResult = {
      timestamp: new Date().toISOString(),
      scriptType: scriptType || 'airgap-health-check',
      status: 'SUCCESS',
      logs: [] as string[],
      executionTimeMs: Math.floor(Math.random() * 40) + 12
    };

    switch (scriptType) {
      case 'airgap-audit':
        executionResult.logs = [
          '[INIT] Validating physical network interfaces (eth0, eth1)...',
          '[PASS] Egress default gateway 0.0.0.0/0 is strictly blocked by iptables.',
          '[CHECK] Testing internal container registry mTLS handshakes...',
          '[PASS] Registry at registry.client.local responded with valid X.509 cert.',
          '[COMPLETE] Air-gap zero-trust compliance verified: 0 internet leaks detected.'
        ];
        break;

      case 'synthetic-data-gen':
        const count = parameters?.recordCount || 50;
        executionResult.logs = [
          `[DATA_GEN] Generating ${count} synthetic enterprise FHIR/HL7 records...`,
          '[PII_MASK] Masking SSNs, patient identifiers, and billing codes with SHA-256 tokens...',
          `[SUCCESS] Generated ${count} normalized mock payload records ready for local ingestion.`
        ];
        break;

      case 'token-bucket-sim':
        const capacity = parameters?.capacity || 120;
        const rate = parameters?.rate || 15;
        const burst = parameters?.burst || 120;
        const dropped = Math.max(0, burst - capacity);
        executionResult.logs = [
          `[SIM] Testing Token Bucket with Capacity=${capacity}, RefillRate=${rate} req/s, Burst=${burst}...`,
          `[RESULT] Processed: ${burst - dropped} requests, Dropped (429): ${dropped}`,
          `[HEALTH] Estimated DB Load: ${Math.min(100, Math.round((rate / 20) * 75))}% CPU.`
        ];
        break;

      default:
        executionResult.logs = [
          `[SCRIPT] Triggered '${scriptType}' successfully in local container environment.`,
          '[SYSTEM] All localized workers operating normally with zero external dependencies.'
        ];
    }

    res.json({ success: true, result: executionResult });
  });

  // API 3: Static Catalog Fallback Endpoint
  app.get('/api/catalog', (req: Request, res: Response) => {
    try {
      const catalogPath = path.resolve(__dirname, 'public', 'catalog.json');
      if (fs.existsSync(catalogPath)) {
        const raw = fs.readFileSync(catalogPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        return res.send(raw);
      }
      res.status(404).json({ error: 'Catalog file not found' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API 4: Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'UP',
      mode: 'OFFLINE_FIRST',
      nodeVersion: process.version,
      uptime: process.uptime()
    });
  });

  // Setup Vite dev server middleware or serve dist
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FDE Academy Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[FDE Academy Server Error]:', err);
});
