/**
 * The reason a Shadow Environment refuses a change trail it could only apply in part.
 *
 * A change trail is applied entry by entry and the first throw ends the run, so what the Kernel
 * holds afterwards is always a prefix of the trail: the entries in `[0, appliedCount)` are
 * applied, the entry at `appliedCount` is the one that threw, and everything behind it was never
 * attempted. That single number is therefore the whole answer to "how far did it get" — the view
 * side folds the prefix into its bookkeeping and sends the rest again with the next trail.
 *
 * `cause` carries what the entry actually threw. Across a worker boundary that is a
 * `WorkerReportedError` carrying the wording and the name of the throw; the class of the original
 * error and the fields it added do not cross the boundary.
 *
 * A refusal for a reason that says nothing about how far the Kernel got — a confirmation window
 * that ran out, a worker that died, a proxy of someone else's making — is not one of these. The
 * view reads such a reason as "the whole trail may well have been applied", which is the safe
 * direction: a creation the Kernel already holds an entity for is refused, and the same trail
 * comes back to the same refusal for as long as the view keeps sending it.
 */
export class ChangeTrailRefusedError extends Error {
  /** how many entries of the change trail the Kernel applied before it stopped */
  readonly appliedCount: number;

  /** how many entries the change trail carried */
  readonly entryCount: number;

  constructor(appliedCount: number, entryCount: number, options?: ErrorOptions) {
    super(`the kernel applied ${appliedCount} of ${entryCount} change trail entries`, options);
    this.name = 'ChangeTrailRefusedError';
    this.appliedCount = appliedCount;
    this.entryCount = entryCount;
  }
}
