function destinationPatterns(radix, dimensions) {
  const distanceOptions = [];
  const half = Math.floor(radix / 2);
  const even = radix % 2 === 0;

  for (let dimension = 0; dimension < dimensions; dimension += 1) {
    const options = [];
    options.push([0, 1]);
    for (let hops = 1; hops <= half; hops += 1) {
      let multiplicity = 2;
      if (even && hops === half) {
        multiplicity = 1;
      }
      options.push([hops, multiplicity]);
    }
    distanceOptions.push(options);
  }

  const patterns = [];

  function build(index, currentHops, currentMultiplicity) {
    if (index === dimensions) {
      let allZero = true;
      let totalHops = 0;
      for (const hop of currentHops) {
        totalHops += hop;
        if (hop !== 0) {
          allZero = false;
        }
      }
      if (allZero) {
        return;
      }

      patterns.push({
        hops: currentHops.slice(),
        multiplicity: currentMultiplicity,
        totalHops,
      });
      return;
    }

    for (const option of distanceOptions[index]) {
      const hop = option[0];
      const multiplicity = option[1];
      currentHops.push(hop);
      build(index + 1, currentHops, currentMultiplicity * multiplicity);
      currentHops.pop();
    }
  }

  build(0, [], 1);
  return patterns;
}

function averageHops(patterns) {
  let totalNodes = 0;
  let weightedHops = 0;

  for (const pattern of patterns) {
    totalNodes += pattern.multiplicity;
    weightedHops += pattern.totalHops * pattern.multiplicity;
  }

  return weightedHops / totalNodes;
}

module.exports = {
  averageHops,
  destinationPatterns,
};
