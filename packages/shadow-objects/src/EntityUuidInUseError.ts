/**
 * Thrown when the Kernel is asked to create an entity under a uuid it already holds an entity for.
 *
 * A uuid names one entity at a time. The entity behind it keeps its shadow objects, its signals,
 * its contexts, its token and its properties; the creation that was refused leaves nothing of
 * itself anywhere, because the guard stands ahead of every write it would make.
 *
 * The uuid is free again once `Kernel.destroyEntity()` has been through: whoever wants an entity
 * built anew under the same uuid destroys the one that stands first.
 *
 * In a change trail this is the reason underneath a {@link ChangeTrailRefusedError}: the trail is
 * refused at that entry, and `appliedCount` names the prefix the Kernel did apply.
 */
export class EntityUuidInUseError extends Error {
  /** the uuid the kernel already holds an entity for */
  readonly uuid: string;

  constructor(uuid: string) {
    super(`the kernel cannot create an entity because the uuid ${uuid} is already held by another entity`);
    this.name = 'EntityUuidInUseError';
    this.uuid = uuid;
  }
}