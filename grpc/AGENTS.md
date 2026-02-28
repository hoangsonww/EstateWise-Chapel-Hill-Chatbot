## gRPC Guidance

- Treat `proto/market_pulse.proto` as the contract source.
- Update handlers and server wiring after proto edits, not before.
- Preserve backward compatibility unless the task explicitly requests a breaking change.

## Validation

- `npm run build`
- `npm run test`
- `npm run proto:check` when the proto changed

## Docs

- Update `grpc/README.md` when RPC behavior, examples, or environment expectations change.
