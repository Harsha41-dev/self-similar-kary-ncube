# Self-Similar k-Ary n-Cube Model

Initial Node.js implementation work for the paper:

`A Performance Model for k-Ary n-Cube Networks with Self-Similar Traffic`

Authors:

- Geyong Min
- Mohamed Ould-Khaoua

## Current Progress

The repository now includes the initial project setup plus a first analytical draft for the path setup and latency parts of the paper.

- Node.js project structure
- basic k-ary n-cube topology utilities
- initial self-similar traffic setup
- first path-setup and blocking draft
- basic source-wait estimate using a simple M/G/1 draft
- iterative latency estimate with a simple channel-full approximation
- basic rate sweep support from the CLI
- sanity tests for early verification

## Project Structure

- `src/config.js` - basic configuration handling
- `src/topology.js` - topology representation and average-hop calculations
- `src/traffic.js` - initial traffic-model setup
- `src/model.js` - early analytical workflow, path-setup estimate, and queueing draft
- `src/cli.js` - command-line entry point for running the draft analysis
- `tests/basic.test.js` - early validation checks

## Run

```bash
npm start
```

With parameters:

```bash
npm start -- --radix 8 --dimensions 2 --virtual-channels 7 --message-length 48 --mean-rate 0.004 --lag1-autocorr 0.65 --hurst 0.88
```

Simple rate sweep:

```bash
npm start -- --rate-start 0.001 --rate-stop 0.01 --rate-steps 5
```

## Test

```bash
npm test
```

## Next Steps

- replace the simple channel-full approximation with the paper's occupancy model
- replace the M/G/1 source wait estimate with the paper's MMPP/G/1 queue analysis
- add the virtual-channel multiplexing factor from the paper latency equation
- extend the self-similar traffic module from target correlations to fitted MMPP parameters
- validate the draft on paper-style cases
