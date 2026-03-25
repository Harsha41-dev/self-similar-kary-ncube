# Self-Similar k-Ary n-Cube Model

Initial Node.js implementation work for the paper:

`A Performance Model for k-Ary n-Cube Networks with Self-Similar Traffic`

Authors:

- Geyong Min
- Mohamed Ould-Khaoua

## Current Progress

The repository currently includes the initial project setup and the first implementation modules prepared for the analytical model.

- Node.js project structure
- basic k-ary n-cube topology utilities
- initial self-similar traffic setup
- base analytical model scaffold
- sanity tests for early verification

## Project Structure

- `src/config.js` - basic configuration handling
- `src/topology.js` - topology representation and average-hop calculations
- `src/traffic.js` - initial traffic-model setup
- `src/model.js` - base analytical workflow summary
- `src/cli.js` - simple command-line entry point
- `tests/basic.test.js` - early validation checks

## Run

```bash
npm start
```

## Test

```bash
npm test
```

## Next Steps

- extend the self-similar traffic module
- add the main analytical equations from the paper
- validate outputs on small cases
