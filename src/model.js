const { normalizeConfig } = require('./config');
const { averageHops, destinationPatterns } = require('./topology');
const { buildInitialTrafficModel } = require('./traffic');

function computePrefixCompletionCounts(hops) {
  let maxHops = 0;
  for (const hop of hops) {
    maxHops += hop;
  }

  const dimensions = hops.length;
  let counts = [];
  for (let hopSum = 0; hopSum <= maxHops; hopSum += 1) {
    counts.push(Array(dimensions + 1).fill(0));
  }
  counts[0][0] = 1;

  for (const hopBudget of hops) {
    const next = [];
    for (let hopSum = 0; hopSum <= maxHops; hopSum += 1) {
      next.push(Array(dimensions + 1).fill(0));
    }

    for (let hopSum = 0; hopSum <= maxHops; hopSum += 1) {
      for (let completed = 0; completed <= dimensions; completed += 1) {
        const currentCount = counts[hopSum][completed];
        if (currentCount === 0) {
          continue;
        }

        for (let used = 0; used <= hopBudget; used += 1) {
          const nextHopSum = hopSum + used;
          if (nextHopSum > maxHops) {
            break;
          }

          let nextCompleted = completed;
          if (used === hopBudget) {
            nextCompleted += 1;
          }
          next[nextHopSum][nextCompleted] += currentCount;
        }
      }
    }

    counts = next;
  }

  const totals = [];
  for (const row of counts) {
    let total = 0;
    for (const value of row) {
      total += value;
    }
    totals.push(total);
  }

  return { totals, counts };
}

function buildBlockingProbabilities(pattern, fullChannelProbability) {
  if (pattern.totalHops === 0) {
    return [];
  }

  const stats = computePrefixCompletionCounts(pattern.hops);
  const probabilities = Array(pattern.totalHops).fill(0);

  for (let hopIndex = 0; hopIndex < pattern.totalHops; hopIndex += 1) {
    const totalPrefixes = stats.totals[hopIndex];
    if (totalPrefixes === 0) {
      continue;
    }

    let blockingProbability = 0;
    for (let completed = 0; completed <= pattern.hops.length; completed += 1) {
      const share = stats.counts[hopIndex][completed] / totalPrefixes;
      const remainingDimensions = pattern.hops.length - completed;
      blockingProbability += share * (fullChannelProbability ** remainingDimensions);
    }

    probabilities[hopIndex] = blockingProbability;
  }

  return probabilities;
}

function solveTridiagonal(lower, diagonal, upper, rhs) {
  const size = diagonal.length;
  const nextUpper = Array(size).fill(0);
  const nextRhs = Array(size).fill(0);

  if (Math.abs(diagonal[0]) < 1e-12) {
    return null;
  }

  nextUpper[0] = upper[0] / diagonal[0];
  nextRhs[0] = rhs[0] / diagonal[0];

  for (let index = 1; index < size; index += 1) {
    const denominator = diagonal[index] - (lower[index] * nextUpper[index - 1]);
    if (Math.abs(denominator) < 1e-12) {
      return null;
    }

    if (index < size - 1) {
      nextUpper[index] = upper[index] / denominator;
    }
    nextRhs[index] = (rhs[index] - (lower[index] * nextRhs[index - 1])) / denominator;
  }

  const solution = Array(size).fill(0);
  solution[size - 1] = nextRhs[size - 1];

  for (let index = size - 2; index >= 0; index -= 1) {
    solution[index] = nextRhs[index] - (nextUpper[index] * solution[index + 1]);
  }

  return solution;
}

function estimatePatternPathSetupTime(pattern, fullChannelProbability) {
  if (pattern.totalHops === 0) {
    return 0;
  }

  const blocking = buildBlockingProbabilities(pattern, fullChannelProbability);
  const hopCount = pattern.totalHops;
  const lower = Array(hopCount + 1).fill(0);
  const diagonal = Array(hopCount + 1).fill(0);
  const upper = Array(hopCount + 1).fill(0);
  const rhs = Array(hopCount + 1).fill(0);

  const firstOpenProbability = 1 - blocking[0];
  if (firstOpenProbability <= 1e-12) {
    return Number.POSITIVE_INFINITY;
  }

  diagonal[0] = firstOpenProbability;
  upper[0] = -firstOpenProbability;
  rhs[0] = 1;

  for (let hopIndex = 1; hopIndex < hopCount; hopIndex += 1) {
    const block = blocking[hopIndex];
    lower[hopIndex] = -block;
    diagonal[hopIndex] = 1;
    upper[hopIndex] = -(1 - block);
    rhs[hopIndex] = 1;
  }

  diagonal[hopCount] = 1;
  rhs[hopCount] = 0;

  const residualTimes = solveTridiagonal(lower, diagonal, upper, rhs);
  if (!residualTimes) {
    return Number.POSITIVE_INFINITY;
  }

  return residualTimes[0] + hopCount;
}

function averagePathSetupTime(patterns, fullChannelProbability) {
  let totalMultiplicity = 0;
  let weightedTime = 0;

  for (const pattern of patterns) {
    const pathSetupTime = estimatePatternPathSetupTime(pattern, fullChannelProbability);
    if (!Number.isFinite(pathSetupTime)) {
      return Number.POSITIVE_INFINITY;
    }

    totalMultiplicity += pattern.multiplicity;
    weightedTime += pathSetupTime * pattern.multiplicity;
  }

  if (totalMultiplicity === 0) {
    return 0;
  }

  return weightedTime / totalMultiplicity;
}

function erlangLossProbability(offeredLoad, servers) {
  if (offeredLoad <= 0) {
    return 0;
  }

  let blocking = 1;
  for (let server = 1; server <= servers; server += 1) {
    blocking = (offeredLoad * blocking) / (server + (offeredLoad * blocking));
  }
  return blocking;
}

function gammaPathApproximation(pathSetupTime, averageHopCount) {
  const variance = Math.max((pathSetupTime - averageHopCount) ** 2, 1e-9);
  const beta = pathSetupTime / variance;
  const alpha = pathSetupTime * beta;

  return {
    alpha,
    beta,
    variance,
  };
}

function estimateSourceWaitTime(network, traffic, averageHopCount, pathSetupTime) {
  const offset = network.messageLength + averageHopCount;
  const gammaFit = gammaPathApproximation(pathSetupTime, averageHopCount);
  const meanServiceTime = offset + pathSetupTime;
  const secondMoment = (
    (offset * offset)
    + ((2 * offset * gammaFit.alpha) / gammaFit.beta)
    + ((gammaFit.alpha * (gammaFit.alpha + 1)) / (gammaFit.beta * gammaFit.beta))
  );

  const perVirtualChannelArrivalRate = traffic.meanRate / network.virtualChannels;
  const utilization = perVirtualChannelArrivalRate * meanServiceTime;
  if (utilization >= 1) {
    return {
      sourceWaitTime: Number.POSITIVE_INFINITY,
      sourceWaitMode: 'm-g-1 draft',
      sourceUtilizationPerVirtualChannel: utilization,
      serviceSecondMoment: secondMoment,
      gammaFit,
    };
  }

  const sourceWaitTime = (
    perVirtualChannelArrivalRate * secondMoment
  ) / (
    2 * (1 - utilization)
  );

  return {
    sourceWaitTime,
    sourceWaitMode: 'm-g-1 draft',
    sourceUtilizationPerVirtualChannel: utilization,
    serviceSecondMoment: secondMoment,
    gammaFit,
  };
}

function estimateDraftMetrics(network, traffic, patterns, averageHopCount) {
  let pathSetupTime = averageHopCount + 1;
  let fullChannelProbability = 0;
  let equivalentSourcesPerChannel = 0;
  let channelArrivalRate = 0;
  const channelServiceTime = network.messageLength + averageHopCount;
  let converged = false;
  let iterations = 0;

  for (let iteration = 0; iteration < network.maxIterations; iteration += 1) {
    iterations = iteration + 1;
    equivalentSourcesPerChannel = pathSetupTime / (4 * network.dimensions);
    channelArrivalRate = equivalentSourcesPerChannel * traffic.meanRate;

    const offeredLoad = channelArrivalRate * channelServiceTime;
    fullChannelProbability = erlangLossProbability(offeredLoad, network.virtualChannels);

    const nextPathSetup = averagePathSetupTime(patterns, fullChannelProbability);
    if (!Number.isFinite(nextPathSetup)) {
      return {
        averagePathSetupTime: Number.POSITIVE_INFINITY,
        networkLatency: Number.POSITIVE_INFINITY,
        estimatedTotalLatency: Number.POSITIVE_INFINITY,
        sourceWaitTime: Number.POSITIVE_INFINITY,
        sourceWaitMode: 'm-g-1 draft',
        sourceWaitImplemented: true,
        sourceUtilizationPerVirtualChannel: Number.POSITIVE_INFINITY,
        serviceSecondMoment: Number.POSITIVE_INFINITY,
        pathSetupGamma: null,
        multiplexingFactor: 1,
        virtualChannelMultiplexingImplemented: false,
        fullChannelProbability: 1,
        equivalentSourcesPerChannel,
        channelArrivalRate,
        channelServiceTime,
        converged: false,
        iterations,
      };
    }

    const blendedPathSetup = (
      (network.damping * nextPathSetup)
      + ((1 - network.damping) * pathSetupTime)
    );
    const delta = Math.abs(blendedPathSetup - pathSetupTime) / Math.max(pathSetupTime, 1);
    pathSetupTime = blendedPathSetup;

    if (delta < network.convergenceTol) {
      converged = true;
      break;
    }
  }

  const networkLatency = pathSetupTime + network.messageLength + averageHopCount;
  const waitEstimate = estimateSourceWaitTime(
    network,
    traffic,
    averageHopCount,
    pathSetupTime,
  );
  const estimatedTotalLatency = networkLatency + waitEstimate.sourceWaitTime;

  return {
    averagePathSetupTime: pathSetupTime,
    networkLatency,
    estimatedTotalLatency,
    sourceWaitTime: waitEstimate.sourceWaitTime,
    sourceWaitMode: waitEstimate.sourceWaitMode,
    sourceWaitImplemented: true,
    sourceUtilizationPerVirtualChannel: waitEstimate.sourceUtilizationPerVirtualChannel,
    serviceSecondMoment: waitEstimate.serviceSecondMoment,
    pathSetupGamma: waitEstimate.gammaFit,
    multiplexingFactor: 1,
    virtualChannelMultiplexingImplemented: false,
    fullChannelProbability,
    equivalentSourcesPerChannel,
    channelArrivalRate,
    channelServiceTime,
    converged,
    iterations,
  };
}

class PaperModel {
  constructor(config) {
    this.config = normalizeConfig(config);
  }

  analyze() {
    const network = this.config.network;
    const patterns = destinationPatterns(network.radix, network.dimensions);
    const averageHopCount = averageHops(patterns);
    const trafficModel = buildInitialTrafficModel(this.config.traffic);
    const analysis = estimateDraftMetrics(
      network,
      this.config.traffic,
      patterns,
      averageHopCount,
    );

    return {
      paper: 'A Performance Model for k-Ary n-Cube Networks with Self-Similar Traffic',
      stage: 'queueing draft',
      topology: {
        radix: network.radix,
        dimensions: network.dimensions,
        nodeCount: network.radix ** network.dimensions,
        virtualChannels: network.virtualChannels,
        messageLength: network.messageLength,
        patternCount: patterns.length,
        averageHopCount,
      },
      traffic: trafficModel,
      analysis,
      nextSteps: [
        'replace the simple channel-full estimate with the paper occupancy model',
        'replace the M/G/1 source wait estimate with the paper MMPP/G/1 analysis',
        'add the virtual-channel multiplexing factor from the paper latency equation',
        'fit the self-similar source process with actual MMPP parameters',
        'validate this draft against small paper-style cases',
      ],
    };
  }

  summarize() {
    return this.analyze();
  }
}

module.exports = {
  PaperModel,
  buildBlockingProbabilities,
  erlangLossProbability,
  estimateDraftMetrics,
  estimatePatternPathSetupTime,
  estimateSourceWaitTime,
  gammaPathApproximation,
};
