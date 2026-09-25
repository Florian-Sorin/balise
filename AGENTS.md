# Balise agent notes

Balise is a small diagnostic utility, not a general-purpose SaaS.

## Product rules

- Observe before modifying network configuration.
- Keep router integration read-only unless a future decision explicitly changes this.
- Do not treat one failed probe as proof of root cause.
- Preserve raw evidence around incidents.
- Change one experimental variable at a time.
- Keep the Windows-native path first-class; WSL2 is not the production runtime for the collector.

## Engineering rules

- Prefer the standard library and a small dependency surface.
- Keep probe collection independent from diagnosis logic.
- Keep Livebox-specific logic behind adapters when introduced.
- SQLite is the source of truth for local observations.
- Tests should focus on deterministic diagnosis and incident state transitions.
- UI is intentionally lightweight until the diagnosis workflow is validated.
