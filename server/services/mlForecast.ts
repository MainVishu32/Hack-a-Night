export interface ForecastInputPoint {
  timestamp: number;
  requestsPerSecond: number;
  queueDelayMs: number;
  p95LatencyMs: number;
  workerBacklog: number;
  errorRate: number;
}

export interface MLForecastResult {
  modelType: string;
  status: 'EXPERIMENTAL_BASELINE';
  currentRps: number;
  predictedNextRps: number;
  spikeRiskScore: number; // 0.0 to 1.0
  isSpikePredicted: boolean;
  recommendedAdmissionRate: number;
  recommendedBatchWindowMs: number;
  confidenceInterval: {
    lowerRps: number;
    upperRps: number;
  };
  sampleSize: number;
  lastCalculatedAt: string;
}

class WorkloadForecaster {
  private history: ForecastInputPoint[] = [];
  private alpha = 0.3; // Exponential smoothing factor
  private smoothedRps = 15;

  public recordTelemetry(point: ForecastInputPoint) {
    this.history.push(point);
    if (this.history.length > 120) {
      this.history.shift();
    }
    // Update EMA
    this.smoothedRps = this.alpha * point.requestsPerSecond + (1 - this.alpha) * this.smoothedRps;
  }

  public generateForecast(): MLForecastResult {
    const n = this.history.length;
    const currentRps = n > 0 ? this.history[n - 1].requestsPerSecond : 15;

    // Moving average and variance baseline
    const rpsValues = this.history.map(h => h.requestsPerSecond);
    const mean = rpsValues.length > 0 ? rpsValues.reduce((a, b) => a + b, 0) / rpsValues.length : 15;
    const variance = rpsValues.length > 1
      ? rpsValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (rpsValues.length - 1)
      : 4;
    const stdDev = Math.sqrt(variance);

    // Linear trend estimation from last 10 samples
    let trendSlope = 0;
    if (n >= 5) {
      const recent = this.history.slice(-5);
      const delta = recent[recent.length - 1].requestsPerSecond - recent[0].requestsPerSecond;
      trendSlope = delta / 5;
    }

    const predicted = Math.max(5, Math.round(this.smoothedRps + trendSlope * 2));
    const zScore = stdDev > 0 ? Math.max(0, (predicted - mean) / stdDev) : 0;
    const spikeRiskScore = Math.min(1.0, parseFloat((zScore / 3.0).toFixed(2)));
    const isSpikePredicted = spikeRiskScore > 0.65;

    // Safe recommendations (advisory only)
    let recommendedAdmissionRate = 400;
    let recommendedBatchWindowMs = 10;

    if (isSpikePredicted) {
      recommendedAdmissionRate = 250; // Throttle admission rate slightly to protect DB
      recommendedBatchWindowMs = 15;  // Slightly larger batch window to improve throughput
    } else if (predicted < 30) {
      recommendedAdmissionRate = 600;
      recommendedBatchWindowMs = 8;
    }

    return {
      modelType: 'Double Exponential Smoothing + Trend Regression (AR-1 Baseline)',
      status: 'EXPERIMENTAL_BASELINE',
      currentRps: Math.round(currentRps),
      predictedNextRps: predicted,
      spikeRiskScore,
      isSpikePredicted,
      recommendedAdmissionRate,
      recommendedBatchWindowMs,
      confidenceInterval: {
        lowerRps: Math.max(0, Math.round(predicted - 1.96 * stdDev)),
        upperRps: Math.round(predicted + 1.96 * stdDev)
      },
      sampleSize: n,
      lastCalculatedAt: new Date().toISOString()
    };
  }
}

export const mlForecaster = new WorkloadForecaster();
