-- CreateEnum
CREATE TYPE "contact_type" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "document_file_side" AS ENUM ('FRONT', 'BACK', 'OTHER');

-- CreateEnum
CREATE TYPE "enrolment_type" AS ENUM ('NEW', 'UPDATE', 'CORRECTION');

-- CreateEnum
CREATE TYPE "evidence_strength" AS ENUM ('SUPERIOR', 'STRONG', 'FAIR', 'WEAK');

-- CreateEnum
CREATE TYPE "occupancy_type" AS ENUM ('OWNER', 'TENANT', 'FAMILY', 'OTHERS');

-- CreateEnum
CREATE TYPE "relationship_type" AS ENUM ('FATHER', 'MOTHER', 'SPOUSE');

-- CreateEnum
CREATE TYPE "sex" AS ENUM ('M', 'F', 'OTHERS');

-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateTable
CREATE TABLE "address" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "person_id" UUID NOT NULL,
    "fokontany_id" UUID NOT NULL,
    "house_number" VARCHAR(255) NOT NULL,
    "occupancy_type" "occupancy_type" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "person_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "centre_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "application_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centre" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "fokontany_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "centre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizen" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT,
    "person_id" UUID NOT NULL,
    "national_unique_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "citizen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commune" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "district_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "commune_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_method" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "person_id" UUID NOT NULL,
    "type" "contact_type" NOT NULL DEFAULT 'EMAIL',
    "value" VARCHAR(255) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "iso2_code" CHAR(2) NOT NULL,
    "iso3_code" CHAR(3) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nationality_name" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "region_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "district_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrolment_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_file" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "side" "document_file_side" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" VARCHAR(255),
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "checksum" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_mrz" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "raw_mrz" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_mrz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_ocr_result" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "engine_name" VARCHAR(255) NOT NULL,
    "engine_version" VARCHAR(255) NOT NULL,
    "extracted_text" TEXT NOT NULL,
    "confidence_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_ocr_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_type" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "evidence_strength" "evidence_strength" NOT NULL DEFAULT 'WEAK',
    "requires_mrz" BOOLEAN NOT NULL DEFAULT false,
    "supports_ocr" BOOLEAN NOT NULL DEFAULT false,
    "requires_original" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "document_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrolment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "citizen_id" UUID NOT NULL,
    "application_id" VARCHAR(255) NOT NULL,
    "enrolment_type" "enrolment_type" NOT NULL DEFAULT 'NEW',
    "created_offline" BOOLEAN NOT NULL DEFAULT false,
    "sync_status" "sync_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "enrolment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_biometric" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrolment_id" UUID NOT NULL,
    "image_file_path" TEXT NOT NULL,
    "model_name" VARCHAR(255) NOT NULL,
    "model_version" VARCHAR(255) NOT NULL,
    "embedding" TEXT NOT NULL,
    "quality_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "face_detected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "face_biometric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_relationship" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "citizen_id" UUID NOT NULL,
    "related_citizen_id" UUID,
    "related_person_name" VARCHAR(255),
    "relationship_type" "relationship_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fokontany" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commune_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "fokontany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255) NOT NULL,
    "date_of_birth" DATE,
    "birth_place" VARCHAR(255),
    "country_of_birth_id" UUID NOT NULL,
    "sex" "sex" NOT NULL DEFAULT 'M',
    "date_of_death" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "country_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizen_activation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "citizen_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "otp_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "citizen_activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jwks" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "alg" TEXT,
    "crv" TEXT,

    CONSTRAINT "jwks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauthClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "clientDiscoveryId" TEXT,
    "disabled" BOOLEAN DEFAULT false,
    "skipConsent" BOOLEAN,
    "enableEndSession" BOOLEAN,
    "subjectType" TEXT,
    "scopes" TEXT[],
    "clientCredentialsScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "name" TEXT,
    "uri" TEXT,
    "icon" TEXT,
    "contacts" TEXT[],
    "tos" TEXT,
    "policy" TEXT,
    "softwareId" TEXT,
    "softwareVersion" TEXT,
    "softwareStatement" TEXT,
    "redirectUris" TEXT[],
    "postLogoutRedirectUris" TEXT[],
    "backchannelLogoutUri" TEXT,
    "backchannelLogoutSessionRequired" BOOLEAN,
    "tokenEndpointAuthMethod" TEXT,
    "applicationType" TEXT,
    "jwks" TEXT,
    "jwksUri" TEXT,
    "grantTypes" TEXT[],
    "responseTypes" TEXT[],
    "requirePKCE" BOOLEAN,
    "dpopBoundAccessTokens" BOOLEAN DEFAULT false,
    "referenceId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "oauthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauthResource" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessTokenTtl" INTEGER,
    "refreshTokenTtl" INTEGER,
    "signingAlgorithm" TEXT,
    "signingKeyId" TEXT,
    "allowedScopes" TEXT[],
    "customClaims" JSONB,
    "dpopBoundAccessTokensRequired" BOOLEAN DEFAULT false,
    "disabled" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "policyVersion" INTEGER DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "oauthResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauthClientResource" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "oauthClientResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauthRefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "referenceId" TEXT,
    "authorizationCodeId" TEXT,
    "resources" TEXT[],
    "requestedUserInfoClaims" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "revoked" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "rotationReplayResponse" TEXT,
    "rotationReplayExpiresAt" TIMESTAMP(3),
    "authTime" TIMESTAMP(3),
    "confirmation" JSONB,
    "scopes" TEXT[],

    CONSTRAINT "oauthRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauthAccessToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "referenceId" TEXT,
    "authorizationCodeId" TEXT,
    "resources" TEXT[],
    "requestedUserInfoClaims" TEXT[],
    "refreshId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "revoked" TIMESTAMP(3),
    "confirmation" JSONB,
    "scopes" TEXT[],

    CONSTRAINT "oauthAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauthConsent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "referenceId" TEXT,
    "resources" TEXT[],
    "requestedUserInfoClaims" TEXT[],
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauthConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauthClientAssertion" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauthClientAssertion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deviceCode" (
    "id" TEXT NOT NULL,
    "deviceCode" TEXT NOT NULL,
    "userCode" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "lastPolledAt" TIMESTAMP(3),
    "pollingInterval" INTEGER,
    "clientId" TEXT,
    "scope" TEXT,
    "resources" TEXT[],
    "oauthClientId" TEXT,

    CONSTRAINT "deviceCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_user_id_key" ON "agent"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_person_id_key" ON "agent"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_role_name_key" ON "application_role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "centre_code_key" ON "centre"("code");

-- CreateIndex
CREATE UNIQUE INDEX "citizen_user_id_key" ON "citizen"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "citizen_person_id_key" ON "citizen"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "citizen_national_unique_id_key" ON "citizen"("national_unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_commune_district_name" ON "commune"("district_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_country_iso2" ON "country"("iso2_code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_country_iso3" ON "country"("iso3_code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_country_name" ON "country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_district_region_name" ON "district"("region_id", "name");

-- CreateIndex
CREATE INDEX "idx_document_document_type_id" ON "document"("document_type_id");

-- CreateIndex
CREATE INDEX "idx_document_enrolment_id" ON "document"("enrolment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_file_back" ON "document_file"("document_id") WHERE (side = 'BACK'::document_file_side);

-- CreateIndex
CREATE UNIQUE INDEX "document_file_storage_key_key" ON "document_file"("storage_key");

-- CreateIndex
CREATE INDEX "idx_document_file_document_id" ON "document_file"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_mrz_document_id_key" ON "document_mrz"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_ocr_document_id" ON "document_ocr_result"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_type_name_key" ON "document_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_enrolment_application" ON "enrolment"("application_id");

-- CreateIndex
CREATE INDEX "idx_face_biometric_enrolment_id" ON "face_biometric"("enrolment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_fokontany_commune_name" ON "fokontany"("commune_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_region_country_name" ON "region"("country_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_citizen_activation_pending" ON "citizen_activation"("citizen_id") WHERE (consumed_at IS NULL);

-- CreateIndex
CREATE INDEX "oauthClient_userId_idx" ON "oauthClient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauthClient_clientId_key" ON "oauthClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "oauthResource_identifier_key" ON "oauthResource"("identifier");

-- CreateIndex
CREATE INDEX "oauthClientResource_clientId_idx" ON "oauthClientResource"("clientId");

-- CreateIndex
CREATE INDEX "oauthClientResource_resourceId_idx" ON "oauthClientResource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "oauthClientResource_clientId_resourceId_uidx" ON "oauthClientResource"("clientId", "resourceId");

-- CreateIndex
CREATE INDEX "oauthRefreshToken_clientId_idx" ON "oauthRefreshToken"("clientId");

-- CreateIndex
CREATE INDEX "oauthRefreshToken_sessionId_idx" ON "oauthRefreshToken"("sessionId");

-- CreateIndex
CREATE INDEX "oauthRefreshToken_userId_idx" ON "oauthRefreshToken"("userId");

-- CreateIndex
CREATE INDEX "oauthRefreshToken_authorizationCodeId_idx" ON "oauthRefreshToken"("authorizationCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "oauthRefreshToken_token_key" ON "oauthRefreshToken"("token");

-- CreateIndex
CREATE INDEX "oauthAccessToken_clientId_idx" ON "oauthAccessToken"("clientId");

-- CreateIndex
CREATE INDEX "oauthAccessToken_sessionId_idx" ON "oauthAccessToken"("sessionId");

-- CreateIndex
CREATE INDEX "oauthAccessToken_userId_idx" ON "oauthAccessToken"("userId");

-- CreateIndex
CREATE INDEX "oauthAccessToken_authorizationCodeId_idx" ON "oauthAccessToken"("authorizationCodeId");

-- CreateIndex
CREATE INDEX "oauthAccessToken_refreshId_idx" ON "oauthAccessToken"("refreshId");

-- CreateIndex
CREATE UNIQUE INDEX "oauthAccessToken_token_key" ON "oauthAccessToken"("token");

-- CreateIndex
CREATE INDEX "oauthConsent_clientId_idx" ON "oauthConsent"("clientId");

-- CreateIndex
CREATE INDEX "oauthConsent_userId_idx" ON "oauthConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "deviceCode_deviceCode_uidx" ON "deviceCode"("deviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "deviceCode_userCode_uidx" ON "deviceCode"("userCode");

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "fk_address_fokontany" FOREIGN KEY ("fokontany_id") REFERENCES "fokontany"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "fk_address_person" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "fk_agent_centre" FOREIGN KEY ("centre_id") REFERENCES "centre"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "fk_agent_person" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "fk_agent_role" FOREIGN KEY ("role_id") REFERENCES "application_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "fk_agent_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "centre" ADD CONSTRAINT "fk_centre_fokontany" FOREIGN KEY ("fokontany_id") REFERENCES "fokontany"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "citizen" ADD CONSTRAINT "fk_citizen_person" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "citizen" ADD CONSTRAINT "fk_citizen_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commune" ADD CONSTRAINT "fk_commune_district" FOREIGN KEY ("district_id") REFERENCES "district"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contact_method" ADD CONSTRAINT "fk_contact_method_person" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "district" ADD CONSTRAINT "fk_district_region" FOREIGN KEY ("region_id") REFERENCES "region"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "fk_document_enrolment" FOREIGN KEY ("enrolment_id") REFERENCES "enrolment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "fk_document_type" FOREIGN KEY ("document_type_id") REFERENCES "document_type"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document_file" ADD CONSTRAINT "fk_document_file_document" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document_mrz" ADD CONSTRAINT "fk_document_mrz_document" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document_ocr_result" ADD CONSTRAINT "fk_document_ocr_document" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrolment" ADD CONSTRAINT "fk_enrolment_agent" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrolment" ADD CONSTRAINT "fk_enrolment_citizen" FOREIGN KEY ("citizen_id") REFERENCES "citizen"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "face_biometric" ADD CONSTRAINT "fk_face_biometric_enrolment" FOREIGN KEY ("enrolment_id") REFERENCES "enrolment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "family_relationship" ADD CONSTRAINT "fk_family_relationship_citizen" FOREIGN KEY ("citizen_id") REFERENCES "citizen"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "family_relationship" ADD CONSTRAINT "fk_family_relationship_related_citizen" FOREIGN KEY ("related_citizen_id") REFERENCES "citizen"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fokontany" ADD CONSTRAINT "fk_fokontany_commune" FOREIGN KEY ("commune_id") REFERENCES "commune"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "person" ADD CONSTRAINT "fk_person_country_of_birth" FOREIGN KEY ("country_of_birth_id") REFERENCES "country"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "region" ADD CONSTRAINT "fk_region_country" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "citizen_activation" ADD CONSTRAINT "citizen_activation_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "citizen"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "oauthClient" ADD CONSTRAINT "oauthClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthClientResource" ADD CONSTRAINT "oauthClientResource_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthClientResource" ADD CONSTRAINT "oauthClientResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "oauthResource"("identifier") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthRefreshToken" ADD CONSTRAINT "oauthRefreshToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthRefreshToken" ADD CONSTRAINT "oauthRefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthRefreshToken" ADD CONSTRAINT "oauthRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthAccessToken" ADD CONSTRAINT "oauthAccessToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthAccessToken" ADD CONSTRAINT "oauthAccessToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthAccessToken" ADD CONSTRAINT "oauthAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthAccessToken" ADD CONSTRAINT "oauthAccessToken_refreshId_fkey" FOREIGN KEY ("refreshId") REFERENCES "oauthRefreshToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthConsent" ADD CONSTRAINT "oauthConsent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "oauthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauthConsent" ADD CONSTRAINT "oauthConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
