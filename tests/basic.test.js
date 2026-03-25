const test = require('node:test');
const assert = require('node:assert/strict');

const { PaperModel } = require('../src/model');
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

  assert.equal(summary.stage, 'initial setup');
  assert.ok(summary.topology.averageHopCount > 0);
  assert.equal(summary.traffic.lags.length, 4);
});
