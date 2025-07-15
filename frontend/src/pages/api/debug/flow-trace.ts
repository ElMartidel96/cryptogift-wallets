import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getNFTMetadata } from '../../../lib/nftMetadataStore';
import { promises as fsPromises } from 'fs';

// In-memory storage for production (simple fallback)
let inMemoryTraces: any[] = [];

function handleInMemoryStorage(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { type, sessionId, step, trace } = req.body;

      if (type === 'step') {
        // Add step to existing trace or create new one
        let existingTrace = inMemoryTraces.find(t => t.sessionId === sessionId);
        if (!existingTrace) {
          existingTrace = {
            sessionId,
            startTime: step.timestamp,
            steps: []
          };
          inMemoryTraces.push(existingTrace);
        }
        existingTrace.steps.push(step);
      } else if (type === 'complete') {
        // Update or add complete trace
        const existingIndex = inMemoryTraces.findIndex(t => t.sessionId === trace.sessionId);
        if (existingIndex >= 0) {
          inMemoryTraces[existingIndex] = trace;
        } else {
          inMemoryTraces.push(trace);
        }
      }

      // Keep only last 20 traces to prevent memory bloat
      inMemoryTraces = inMemoryTraces.slice(-20);

      res.status(200).json({ success: true, message: 'Trace data saved (in-memory)' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to save trace', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else if (req.method === 'GET') {
    try {
      const { sessionId, latest } = req.query;

      if (sessionId) {
        // Get specific trace
        const trace = inMemoryTraces.find(t => t.sessionId === sessionId);
        if (!trace) {
          return res.status(404).json({ error: 'Trace not found' });
        }
        
        const analysis = analyzeTrace(trace);
        res.status(200).json({ trace, analysis });
      } else if (latest) {
        // Get latest trace
        const latestTrace = inMemoryTraces.slice(-1)[0];
        if (!latestTrace) {
          return res.status(200).json({ trace: null });
        }
        
        const analysis = analyzeTrace(latestTrace);
        res.status(200).json({ trace: latestTrace, analysis });
      } else {
        // Get all traces summary
        const summary = inMemoryTraces.map(trace => ({
          sessionId: trace.sessionId,
          userAddress: trace.userAddress,
          startTime: trace.startTime,
          endTime: trace.endTime,
          finalResult: trace.finalResult,
          stepCount: trace.steps.length,
          duration: trace.endTime ? 
            new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime() : null
        }));
        
        res.status(200).json({ 
          summary,
          totalTraces: inMemoryTraces.length,
          latestTrace: inMemoryTraces.slice(-1)[0]?.sessionId || null
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to read traces', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// NFT Metadata Flow Diagnostic
async function handleNFTFlowDiagnostic(req: NextApiRequest, res: NextApiResponse) {
  const { contractAddress, tokenId } = req.body;

  try {
    const trace = {
      timestamp: new Date().toISOString(),
      contractAddress,
      tokenId,
      checks: {
        serverMetadata: null,
        tmpFiles: [],
        clientStorageTest: null,
        writePermissions: null,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
          workingDir: process.cwd(),
          tmpDir: '/tmp',
          storageDir: '/tmp/nft-metadata'
        }
      }
    };

    // 1. Check server metadata storage
    try {
      const serverMetadata = await getNFTMetadata(contractAddress, tokenId);
      trace.checks.serverMetadata = {
        found: !!serverMetadata,
        data: serverMetadata,
        status: 'success'
      };
    } catch (error) {
      trace.checks.serverMetadata = {
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      };
    }

    // 2. Check /tmp directory contents
    try {
      const tmpDir = '/tmp/nft-metadata';
      const files = await fsPromises.readdir(tmpDir).catch(() => []);
      trace.checks.tmpFiles = files.map(file => ({
        name: file,
        path: path.join(tmpDir, file),
        isTarget: file === `${contractAddress.toLowerCase()}_${tokenId}.json`
      }));
    } catch (error) {
      trace.checks.tmpFiles = [];
    }

    // 3. Test file write permissions
    try {
      const testFile = '/tmp/test-write.json';
      await fsPromises.writeFile(testFile, JSON.stringify({ test: true }));
      await fsPromises.unlink(testFile);
      trace.checks.writePermissions = { status: 'success' };
    } catch (error) {
      trace.checks.writePermissions = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    console.log('🔍 NFT Flow trace:', trace);
    res.status(200).json(trace);
  } catch (error) {
    console.error('❌ NFT Flow trace error:', error);
    res.status(500).json({ 
      error: 'NFT Flow trace failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Flow trace persistence and retrieval
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if this is an NFT metadata diagnostic request
  if (req.method === 'POST' && req.body.contractAddress && req.body.tokenId) {
    return handleNFTFlowDiagnostic(req, res);
  }
  
  // For production/Vercel compatibility, use in-memory storage with fallback
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, use simple in-memory storage (or integrate with your preferred DB)
    return handleInMemoryStorage(req, res);
  }
  
  // Development: use file system
  const logsDir = path.join(process.cwd(), 'logs');
  const tracesFile = path.join(logsDir, 'flow-traces.json');

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  if (req.method === 'POST') {
    try {
      const { type, sessionId, step, trace } = req.body;

      let traces = [];
      if (fs.existsSync(tracesFile)) {
        const tracesData = fs.readFileSync(tracesFile, 'utf8');
        traces = JSON.parse(tracesData);
      }

      if (type === 'step') {
        // Add step to existing trace or create new one
        let existingTrace = traces.find(t => t.sessionId === sessionId);
        if (!existingTrace) {
          existingTrace = {
            sessionId,
            startTime: step.timestamp,
            steps: []
          };
          traces.push(existingTrace);
        }
        existingTrace.steps.push(step);
      } else if (type === 'complete') {
        // Update or add complete trace
        const existingIndex = traces.findIndex(t => t.sessionId === trace.sessionId);
        if (existingIndex >= 0) {
          traces[existingIndex] = trace;
        } else {
          traces.push(trace);
        }
      }

      // Keep only last 50 traces to prevent file bloat
      traces = traces.slice(-50);

      fs.writeFileSync(tracesFile, JSON.stringify(traces, null, 2));

      res.status(200).json({ success: true, message: 'Trace data saved' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to save trace', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else if (req.method === 'GET') {
    try {
      const { sessionId, latest } = req.query;

      if (!fs.existsSync(tracesFile)) {
        return res.status(200).json({ traces: [] });
      }

      const tracesData = fs.readFileSync(tracesFile, 'utf8');
      const traces = JSON.parse(tracesData);

      if (sessionId) {
        // Get specific trace
        const trace = traces.find(t => t.sessionId === sessionId);
        if (!trace) {
          return res.status(404).json({ error: 'Trace not found' });
        }
        
        // Generate flow analysis
        const analysis = analyzeTrace(trace);
        
        res.status(200).json({ trace, analysis });
      } else if (latest) {
        // Get latest trace
        const latestTrace = traces.slice(-1)[0];
        if (!latestTrace) {
          return res.status(200).json({ trace: null });
        }
        
        const analysis = analyzeTrace(latestTrace);
        res.status(200).json({ trace: latestTrace, analysis });
      } else {
        // Get all traces summary
        const summary = traces.map(trace => ({
          sessionId: trace.sessionId,
          userAddress: trace.userAddress,
          startTime: trace.startTime,
          endTime: trace.endTime,
          finalResult: trace.finalResult,
          stepCount: trace.steps.length,
          duration: trace.endTime ? 
            new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime() : null
        }));
        
        res.status(200).json({ 
          summary,
          totalTraces: traces.length,
          latestTrace: traces.slice(-1)[0]?.sessionId || null
        });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to read traces', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

function analyzeTrace(trace: any) {
  const analysis = {
    summary: {
      totalSteps: trace.steps.length,
      duration: trace.endTime ? 
        new Date(trace.endTime).getTime() - new Date(trace.startTime).getTime() : null,
      finalResult: trace.finalResult,
      userAddress: trace.userAddress
    },
    path: [],
    decisions: [],
    errors: [],
    criticalPoints: [],
    timeline: []
  };

  // Analyze each step
  trace.steps.forEach((step, index) => {
    // Build execution path
    if (step.component !== 'FLOW_TRACKER') {
      analysis.path.push(`${step.component}.${step.action}`);
    }

    // Track decisions
    if (step.decision) {
      analysis.decisions.push({
        step: index + 1,
        component: step.component,
        decision: step.decision,
        timestamp: step.timestamp,
        data: step.data
      });
    }

    // Track errors
    if (step.result === 'error') {
      analysis.errors.push({
        step: index + 1,
        component: step.component,
        action: step.action,
        error: step.error || step.data?.errorMessage,
        timestamp: step.timestamp
      });
    }

    // Identify critical points
    if (step.action.includes('GASLESS') || step.action.includes('MINT') || step.action.includes('FALLBACK')) {
      analysis.criticalPoints.push({
        step: index + 1,
        component: step.component,
        action: step.action,
        result: step.result,
        timestamp: step.timestamp
      });
    }

    // Build timeline
    analysis.timeline.push({
      step: index + 1,
      time: step.timestamp,
      component: step.component,
      action: step.action,
      result: step.result,
      duration: index > 0 ? 
        new Date(step.timestamp).getTime() - new Date(trace.steps[index - 1].timestamp).getTime() : 0
    });
  });

  // Unique execution path
  analysis.path = [...new Set(analysis.path)];

  return analysis;
}