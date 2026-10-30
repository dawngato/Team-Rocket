# Local development certificates

This directory intentionally contains no committed certificate or private-key
material. Generate short-lived development certificates locally when a TLS
profile requires them, and keep production certificates in the deployment
secret store.

The repository does not treat self-signed local certificates as evidence of
production TLS or operator independence.
