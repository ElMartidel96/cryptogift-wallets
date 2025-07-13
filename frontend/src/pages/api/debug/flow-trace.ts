import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Flow trace persistence and retrieval
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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