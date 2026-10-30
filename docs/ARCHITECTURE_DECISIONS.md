# Architecture decisions

## Active repository namespace

HimVote remains the active product namespace. The SecureVote prompt is treated as the current security review and implementation gate for this repository. Duplicating the repository under a second name would create two divergent security surfaces.

## Trust boundaries

Identity and casting remain separate service domains. The casting path must not receive identity cookies, bearer identity tokens, or person identifiers. Accepted evidence is written through the casting transaction and then passed to the ordered log publisher through a durable outbox.

## Election engine boundary

Clients do not implement ballot encryption. The `services/election_engine` adapter is the only integration boundary. The current Profile VEEM implementation is a development stand in. Secret ballot claims remain limited until an established engine with an independently usable verifier passes the engine gate.

## Witness and chain boundary

The witness and chain layers commit evidence digests only. A local witness or Anvil chain is a development emulator and does not establish independent operation or public consensus.

## Evidence before status

The interface exposes pending, witnessed, anchored, audited, and published states separately. A client must not display a successful final state before the matching evidence is present and verified.

