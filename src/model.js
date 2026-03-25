const { normalizeConfig } = require('./config');
const { averageHops, destinationPatterns } = require('./topology');
const { buildInitialTrafficModel } = require('./traffic');

class PaperModel {
  constructor(config) {
    this.config = normalizeConfig(config);
  }

  summarize() {
    const network = this.config.network;
    const patterns = destinationPatterns(network.radix, network.dimensions);
    const averageHopCount = averageHops(patterns);
    const trafficModel = buildInitialTrafficModel(this.config.traffic);

    return {
      paper: 'A Performance Model for k-Ary n-Cube Networks with Self-Similar Traffic',
      stage: 'initial setup',
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
      nextSteps: [
        'complete the MMPP fitting procedure',
        'add the path setup and blocking equations',
        'add the source queue analysis',
        'validate the model on sample cases',
      ],
    };
  }
}

module.exports = { PaperModel };
