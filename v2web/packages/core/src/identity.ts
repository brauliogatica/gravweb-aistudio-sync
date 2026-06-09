export type EntityId = string;
export type IsoDateTime = string;
export type Sha256Hex = string;

export interface AuditStamp {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  createdBy?: EntityId;
  updatedBy?: EntityId;
}

export interface UserRef {
  id: EntityId;
  email?: string;
  displayName?: string;
  provider?: "auth0" | "local" | "system";
}

