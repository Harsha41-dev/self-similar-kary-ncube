function normalizeConfig(config = {}) {
  const inputNetwork = config.network || {};
  const inputTraffic = config.traffic || {};

  const network = {
    radix: 8,
    dimensions: 2,
    virtualChannels: 7,
    messageLength: 48,
  };
  const traffic = {
    meanRate: 0.004,
    lag1Autocorr: 0.65,
    hurst: 0.88,
    timeScales: 5,
  };

  for (const key of Object.keys(inputNetwork)) {
    network[key] = inputNetwork[key];
  }
  for (const key of Object.keys(inputTraffic)) {
    traffic[key] = inputTraffic[key];
  }

  return { network, traffic };
}

module.exports = { normalizeConfig };
