#!/usr/bin/env node

const { PaperModel } = require('./model');

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }

  return args;
}

function numberArg(args, key, fallback) {
  if (args[key] === undefined) {
    return fallback;
  }
  return Number(args[key]);
}

function buildConfig(args) {
  return {
    network: {
      radix: numberArg(args, 'radix', 8),
      dimensions: numberArg(args, 'dimensions', 2),
      virtualChannels: numberArg(args, 'virtual-channels', 7),
      messageLength: numberArg(args, 'message-length', 48),
      damping: numberArg(args, 'damping', 0.5),
      convergenceTol: numberArg(args, 'convergence-tol', 1e-6),
      maxIterations: numberArg(args, 'max-iterations', 30),
    },
    traffic: {
      meanRate: numberArg(args, 'mean-rate', 0.004),
      lag1Autocorr: numberArg(args, 'lag1-autocorr', 0.65),
      hurst: numberArg(args, 'hurst', 0.88),
      timeScales: numberArg(args, 'time-scales', 5),
    },
  };
}

function buildSweepValues(start, stop, steps) {
  if (steps <= 1) {
    return [start];
  }

  const values = [];
  for (let index = 0; index < steps; index += 1) {
    const ratio = index / (steps - 1);
    values.push(start + ((stop - start) * ratio));
  }
  return values;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      [
        'Usage:',
        '  npm start -- --radix 8 --dimensions 2 --virtual-channels 7 --message-length 48 --mean-rate 0.004 --lag1-autocorr 0.65 --hurst 0.88',
        '  npm start -- --rate-start 0.001 --rate-stop 0.01 --rate-steps 5',
      ].join('\n'),
    );
    return;
  }

  if (args['rate-start'] !== undefined) {
    const start = numberArg(args, 'rate-start', 0.001);
    const stop = numberArg(args, 'rate-stop', 0.01);
    const steps = numberArg(args, 'rate-steps', 5);
    const meanRates = buildSweepValues(start, stop, steps);
    const results = [];

    for (const meanRate of meanRates) {
      const config = buildConfig(args);
      config.traffic.meanRate = meanRate;
      const model = new PaperModel(config);
      const analysis = model.analyze();
      results.push({
        meanRate,
        totalLatency: analysis.analysis.estimatedTotalLatency,
        networkLatency: analysis.analysis.networkLatency,
        sourceWaitTime: analysis.analysis.sourceWaitTime,
        fullChannelProbability: analysis.analysis.fullChannelProbability,
      });
    }

    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const model = new PaperModel(buildConfig(args));
  const analysis = model.analyze();
  console.log(JSON.stringify(analysis, null, 2));
}

if (require.main === module) {
  main();
}
