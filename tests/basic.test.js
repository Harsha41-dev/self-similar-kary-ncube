const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PaperModel,
  erlangLossProbability,
  estimatePatternPathSetupTime,
  estimateSourceWaitTime,
} = require('../src/model');
const { averageHops, destinationPatterns } = require('../src/topology');
const { buildInitialTrafficModel } = require('../src/traffic');

test('basic topology setup gives a positive average hop count', () => {
  const patterns = destinationPatterns(8, 2);
  const hops = averageHops(patterns);

  assert.ok(patterns.length > 0);
  assert.ok(hops > 0);
});

test('initial traffic model keeps decreasing long-range correlations', () => {
  const traffic = buildInitialTrafficModel({
    meanRate: 0.004,
    lag1Autocorr: 0.65,
    hurst: 0.88,
    timeScales: 5,
  });

  assert.equal(traffic.lags.length, traffic.targetCorrelations.length);
  assert.ok(traffic.targetCorrelations[0] > traffic.targetCorrelations[1]);
  assert.ok(traffic.targetCorrelations[1] > traffic.targetCorrelations[2]);
});

test('model summary includes topology and traffic setup', () => {
  const summary = new PaperModel({}).summarize();

  assert.equal(summary.stage, 'queueing draft');
  assert.ok(summary.topology.averageHopCount > 0);
  assert.equal(summary.traffic.lags.length, 4);
  assert.ok(Number.isFinite(summary.analysis.networkLatency));
  assert.ok(summary.analysis.networkLatency > summary.topology.averageHopCount);
  assert.ok(Number.isFinite(summary.analysis.sourceWaitTime));
  assert.ok(summary.analysis.estimatedTotalLatency >= summary.analysis.networkLatency);
});

test('path setup time grows when channel blocking grows', () => {
  const patterns = destinationPatterns(8, 2);
  const targetPattern = patterns.find((pattern) => pattern.totalHops === 4);

  const lowBlockingTime = estimatePatternPathSetupTime(targetPattern, 0.05);
  const highBlockingTime = estimatePatternPathSetupTime(targetPattern, 0.4);

  assert.ok(Number.isFinite(lowBlockingTime));
  assert.ok(Number.isFinite(highBlockingTime));
  assert.ok(highBlockingTime > lowBlockingTime);
});

test('erlang loss probability increases with offered load', () => {
  const lowLoad = erlangLossProbability(0.2, 4);
  const highLoad = erlangLossProbability(2.0, 4);

  assert.ok(lowLoad >= 0);
  assert.ok(highLoad <= 1);
  assert.ok(highLoad > lowLoad);
});

test('source wait estimate increases with traffic rate', () => {
  const lowRate = estimateSourceWaitTime(
    { messageLength: 48, virtualChannels: 7 },
    { meanRate: 0.002 },
    4,
    8,
  );
  const highRate = estimateSourceWaitTime(
    { messageLength: 48, virtualChannels: 7 },
    { meanRate: 0.008 },
    4,
    8,
  );

  assert.ok(lowRate.sourceWaitTime >= 0);
  assert.ok(highRate.sourceWaitTime > lowRate.sourceWaitTime);
});

test('higher input rate leads to higher total latency in the draft model', () => {
  const lowRate = new PaperModel({
    traffic: {
      meanRate: 0.002,
    },
  }).analyze();
  const highRate = new PaperModel({
    traffic: {
      meanRate: 0.008,
    },
  }).analyze();

  assert.ok(highRate.analysis.sourceWaitTime > lowRate.analysis.sourceWaitTime);
  assert.ok(highRate.analysis.estimatedTotalLatency > lowRate.analysis.estimatedTotalLatency);
});
