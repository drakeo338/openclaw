import { isRecord } from "@openclaw/normalization-core/record-coerce";
import { Check } from "typebox/value";
import { SKILL_LIBRARY_MAX_SELECTIONS } from "../../packages/gateway-protocol/src/schema/skill-library.js";
import { UserChannelIdentitySchema } from "../../packages/gateway-protocol/src/schema/users.js";
import { isChannelIngressReadCommand } from "../channels/message/ingress-queue-read-contract.js";
import { isPluginBlobReadCommand } from "../plugin-state/plugin-blob-worker-contract.js";
import { isTuiLastSessionReadCommand } from "../tui/tui-last-session.contract.js";
import type { OpenClawStateReadRequest } from "./openclaw-state-read.types.js";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function isReadRequest(input: unknown): input is OpenClawStateReadRequest {
  if (!isRecord(input) || !isRecord(input.context) || !isRecord(input.command)) {
    return false;
  }
  const { command, context } = input;
  const { environment } = context;
  return (
    typeof input.databasePath === "string" &&
    typeof input.location === "string" &&
    typeof input.checkFreshAdmission === "boolean" &&
    (input.expectedIdentity === undefined || typeof input.expectedIdentity === "string") &&
    (input.snapshotRoot === undefined || typeof input.snapshotRoot === "string") &&
    (context.existingSchemaPath === undefined || typeof context.existingSchemaPath === "string") &&
    isRecord(environment) &&
    typeof environment.OPENCLAW_STATE_DIR === "string" &&
    (environment.OPENCLAW_SUPERVISOR_MODE === undefined ||
      environment.OPENCLAW_SUPERVISOR_MODE === "external") &&
    ((command.type === "deliveryQueue.outbound" &&
      (command.id === undefined || typeof command.id === "string") &&
      (command.mode === "pending" || command.mode === "unfinished")) ||
      command.type === "acpSessions.list" ||
      (command.type === "acpSessions.metadata" &&
        Array.isArray(command.entries) &&
        command.entries.length <= 64 &&
        command.entries.every(
          (entry) =>
            isRecord(entry) &&
            Array.isArray(entry.keys) &&
            entry.keys.length <= 3 &&
            entry.keys.every((key) => typeof key === "string") &&
            (entry.legacyKey === undefined || typeof entry.legacyKey === "string") &&
            (entry.entry === undefined ||
              (isRecord(entry.entry) &&
                (entry.entry.lifecycleRevision === undefined ||
                  typeof entry.entry.lifecycleRevision === "string") &&
                (entry.entry.sessionId === undefined ||
                  typeof entry.entry.sessionId === "string") &&
                (entry.entry.sessionStartedAt === undefined ||
                  typeof entry.entry.sessionStartedAt === "number"))),
        )) ||
      (command.type === "mcpOAuth.statuses" && isStringArray(command.input)) ||
      ((command.type === "mcpOAuth.readOnly" ||
        command.type === "mcpOAuth.keys" ||
        command.type === "mcpOAuth.pending" ||
        command.type === "mcpOAuth.countPrincipals") &&
        typeof command.input === "string") ||
      (command.type === "capture.readOnlyEvents" &&
        typeof command.sessionId === "string" &&
        (command.limit === undefined || typeof command.limit === "number")) ||
      (command.type === "capture.readOnlyBlob" && typeof command.blobId === "string") ||
      isPluginBlobReadCommand(command) ||
      isChannelIngressReadCommand(command) ||
      (command.type === "conversationBindings.inspect" &&
        isRecord(command.conversation) &&
        typeof command.conversation.channel === "string" &&
        typeof command.conversation.accountId === "string" &&
        typeof command.conversation.conversationId === "string" &&
        (command.conversation.parentConversationId === undefined ||
          typeof command.conversation.parentConversationId === "string")) ||
      (command.type === "cron.activeReceiptOwners" && typeof command.agentId === "string") ||
      (command.type === "cron.jobNames" &&
        (command.storePath === undefined || typeof command.storePath === "string") &&
        isStringArray(command.jobIds)) ||
      (command.type === "cron.observeRunRecovery" &&
        typeof command.storeKey === "string" &&
        Array.isArray(command.proposals) &&
        command.proposals.every(
          (proposal: unknown) =>
            isRecord(proposal) &&
            typeof proposal.jobId === "string" &&
            (proposal.queuedAtMs === undefined || typeof proposal.queuedAtMs === "number") &&
            (proposal.runningAtMs === undefined || typeof proposal.runningAtMs === "number"),
        )) ||
      (command.type === "devicePairing.list" && typeof command.nowMs === "number") ||
      (command.type === "devicePairing.lookup" && typeof command.deviceId === "string") ||
      (command.type === "devicePairing.pending" &&
        typeof command.requestId === "string" &&
        typeof command.nowMs === "number") ||
      (command.type === "devicePairing.bootstrapContext" &&
        isRecord(command.input) &&
        typeof command.input.token === "string" &&
        typeof command.input.deviceId === "string" &&
        typeof command.input.publicKey === "string" &&
        typeof command.input.nowMs === "number") ||
      command.type === "admit" ||
      command.type === "subagents.sessionList" ||
      (command.type === "subagents.forChildSession" &&
        typeof command.childSessionKey === "string") ||
      (command.type === "subagents.runs" &&
        isRecord(command.scope) &&
        (command.scope.kind === "all" ||
          command.scope.kind === "maintenance" ||
          (command.scope.kind === "session" && typeof command.scope.sessionKey === "string") ||
          (command.scope.kind === "descendants" &&
            isStringArray(command.scope.sessionKeys) &&
            Array.isArray(command.scope.liveTopology) &&
            command.scope.liveTopology.every(
              (link: unknown) =>
                isRecord(link) &&
                typeof link.childSessionKey === "string" &&
                typeof link.requesterSessionKey === "string",
            )) ||
          (command.scope.kind === "ids" && isStringArray(command.scope.runIds)))) ||
      command.type === "exec-approvals.read" ||
      ((command.type === "skills.library.descriptions" ||
        command.type === "skills.library.manifests") &&
        Array.isArray(command.input) &&
        command.input.length <= SKILL_LIBRARY_MAX_SELECTIONS &&
        command.input.every(
          (pin) =>
            isRecord(pin) && typeof pin.skillId === "string" && typeof pin.revision === "string",
        )) ||
      command.type === "agentDatabaseRegistry.read" ||
      (command.type === "agentDatabaseDeletion.snapshot" &&
        (command.purpose === "runtime" || command.purpose === "maintenance")) ||
      (command.type === "agentDeletionJournal.status" && typeof command.agentId === "string") ||
      command.type === "sessionGroups.snapshot" ||
      (command.type === "sessionGroups.members" && isRecord(command.cfg)) ||
      (command.type === "workerEnvironments.snapshot" &&
        (command.ids === undefined || isStringArray(command.ids))) ||
      (command.type === "workerEnvironments.pruneCandidates" &&
        isRecord(command.input) &&
        typeof command.input.nowMs === "number" &&
        (command.input.limit === undefined || typeof command.input.limit === "number") &&
        (command.input.cursor === undefined ||
          (isRecord(command.input.cursor) &&
            typeof command.input.cursor.changedAtMs === "number" &&
            typeof command.input.cursor.environmentId === "string"))) ||
      command.type === "userProfiles.catalog" ||
      (command.type === "userPreferences.values" &&
        typeof command.key === "string" &&
        isStringArray(command.profileIds)) ||
      command.type === "config.snapshot.read" ||
      (command.type === "githubPublication.lifecycle" &&
        (command.publicationKind === "shared" || command.publicationKind === "personal") &&
        typeof command.requestId === "string") ||
      ((command.type === "githubPublication.request" ||
        command.type === "githubRepository.request") &&
        typeof command.requestId === "string") ||
      ((command.type === "githubPublication.knownPullRequestUrls" ||
        command.type === "githubRepository.knownPullRequestUrls") &&
        isRecord(command.input)) ||
      ((command.type === "userProfiles.reconcile" ||
        command.type === "userProfiles.avatar.inspect" ||
        command.type === "userProfiles.channelIdentity.list" ||
        command.type === "userProfiles.authority.resolve") &&
        typeof command.profileId === "string") ||
      (command.type === "userProfiles.avatar.read" &&
        typeof command.profileId === "string" &&
        isRecord(command.expected) &&
        typeof command.expected.canonicalProfileId === "string" &&
        typeof command.expected.sha256 === "string" &&
        typeof command.expected.mime === "string") ||
      (command.type === "userProfiles.githubIdentity.cached" &&
        typeof command.accountId === "number" &&
        typeof command.email === "string") ||
      (command.type === "userProfiles.githubAttribution.resolve" &&
        isStringArray(command.profileIds)) ||
      (command.type === "userProfiles.channelIdentity.resolve" &&
        (Check(UserChannelIdentitySchema, command.identity) ||
          (isRecord(command.identity) &&
            typeof command.identity.authorizationId === "string" &&
            isRecord(command.identity.policy)))) ||
      (command.type === "userProfiles.email.resolve" && typeof command.email === "string") ||
      (command.type === "audit.run.inspect" &&
        isRecord(command.input) &&
        typeof command.input.now === "number" &&
        (typeof command.input.runId === "string" ||
          typeof command.input.executionId === "string")) ||
      (command.type === "githubPublication.sharedObservation" &&
        isRecord(command.input) &&
        (command.input.kind === "repository" || command.input.kind === "worktree") &&
        isRecord(command.input.session) &&
        typeof command.input.session.agentId === "string" &&
        typeof command.input.session.sessionKey === "string" &&
        typeof command.input.session.sessionId === "string" &&
        isRecord(command.input.selector) &&
        isRecord(command.input.entry)) ||
      (command.type === "sessionRepositoryWorkspaces.find" &&
        Array.isArray(command.owners) &&
        command.owners.every(
          (owner) =>
            isRecord(owner) &&
            typeof owner.agentId === "string" &&
            typeof owner.sessionKey === "string",
        )) ||
      (command.type === "workspace.snapshot" && typeof command.workspaceDir === "string") ||
      ((command.type === "updateRuns.get" ||
        command.type === "updateRuns.reconciliationCandidate") &&
        typeof command.runId === "string") ||
      command.type === "updateRuns.interruptedCandidate" ||
      command.type === "updateRuns.status" ||
      command.type === "updateRuns.historyStatus" ||
      (command.type === "updateRuns.reconciliationCandidates" &&
        isRecord(command.input) &&
        (command.input.explicit === undefined || typeof command.input.explicit === "boolean") &&
        (command.input.requireAllActive === undefined ||
          typeof command.input.requireAllActive === "boolean") &&
        (command.input.legacyOnly === undefined || typeof command.input.legacyOnly === "boolean") &&
        (command.input.repairHistorySinceMs === undefined ||
          (typeof command.input.repairHistorySinceMs === "number" &&
            Number.isFinite(command.input.repairHistorySinceMs))) &&
        (command.input.runIds === undefined || isStringArray(command.input.runIds))) ||
      (command.type === "updateRuns.list" &&
        isRecord(command.input) &&
        (command.input.limit === undefined || typeof command.input.limit === "number") &&
        (command.input.active === undefined || typeof command.input.active === "boolean") &&
        (command.input.reason === undefined || typeof command.input.reason === "string") &&
        (command.input.includeRunId === undefined ||
          typeof command.input.includeRunId === "string")) ||
      command.type === "fleet.list" ||
      (command.type === "operatorApprovals.history" && isRecord(command.input)) ||
      isTuiLastSessionReadCommand(command) ||
      command.type === "nodeHost.config" ||
      command.type === "operator.channelPolicy" ||
      (command.type === "onboardingRecommendations.read" &&
        typeof command.configKey === "string") ||
      command.type === "sandboxRegistry.list" ||
      command.type === "sandboxRegistry.browsers" ||
      (command.type === "sandboxRegistry.get" && typeof command.containerName === "string") ||
      (command.type === "sandboxRegistry.runtimeIds" &&
        typeof command.backendId === "string" &&
        typeof command.scopeKey === "string") ||
      (command.type === "fleet.get" && typeof command.tenantId === "string") ||
      command.type === "worktrees.cleanupState" ||
      (command.type === "workerPlacements.changeSnapshot" &&
        (command.profileIds === undefined || isStringArray(command.profileIds))) ||
      command.type === "workers.placementRecoveryCandidates" ||
      (command.type === "workers.placementProjection" &&
        isStringArray(command.sessionIds) &&
        Array.isArray(command.conflictBindings)))
  );
}
