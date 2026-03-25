const { normalizeConfig } = require('./config');
const { PaperModel } = require('./model');
const { averageHops, destinationPatterns } = require('./topology');
const { buildInitialTrafficModel } = require('./traffic');

module.exports = {
  averageHops,
  buildInitialTrafficModel,
  destinationPatterns,
  normalizeConfig,
  PaperModel,
};
