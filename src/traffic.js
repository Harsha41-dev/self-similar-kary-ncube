function buildInitialTrafficModel(config) {
  const lags = [1, 10, 100, 1000];
  const targetCorrelations = [];

  for (const lag of lags) {
    targetCorrelations.push(
      config.lag1Autocorr * lag ** (2 * config.hurst - 2),
    );
  }

  return {
    meanRate: config.meanRate,
    lag1Autocorr: config.lag1Autocorr,
    hurst: config.hurst,
    timeScales: config.timeScales,
    lags,
    targetCorrelations,
  };
}

module.exports = { buildInitialTrafficModel };
