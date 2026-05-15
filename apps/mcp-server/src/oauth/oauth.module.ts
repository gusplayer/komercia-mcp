import { Module } from '@nestjs/common';


import { OAuthAuthorizeController } from './authorize.controller.js';
import { CompletionTicketService } from './completion-ticket.service.js';
import { OAuthMetadataController } from './metadata.controller.js';
import { OAuthClientService } from './oauth-client.service.js';
import { OAuthCodeService } from './oauth-code.service.js';
import { PkceService } from './pkce.service.js';
import { OAuthRegistrationController } from './registration.controller.js';
import { OAuthTokenController } from './token.controller.js';
import { KomerciaSessionService } from '../auth/komercia-session.service.js';

@Module({
  controllers: [
    OAuthMetadataController,
    OAuthRegistrationController,
    OAuthAuthorizeController,
    OAuthTokenController,
  ],
  providers: [
    OAuthClientService,
    OAuthCodeService,
    PkceService,
    CompletionTicketService,
    KomerciaSessionService,
  ],
  exports: [
    OAuthClientService,
    OAuthCodeService,
    PkceService,
    CompletionTicketService,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS modules are decorator-driven empty classes
export class OAuthModule {}
