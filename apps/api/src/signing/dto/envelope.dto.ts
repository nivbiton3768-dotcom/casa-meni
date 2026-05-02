export class CreateEnvelopeDto {
  title!: string;
  message?: string;
  sourceFileUrl!: string;
  sourceFileName!: string;
  documentId?: string;
  leaseId?: string;
  propertyId?: string;
  expiresInDays?: number;
  signers!: Array<{
    name: string;
    email: string;
    userId?: string;
  }>;
}

export class SignEnvelopeDto {
  signatureDataUrl!: string;
}

export class DeclineEnvelopeDto {
  reason?: string;
}
