import { isChannelIngressReadCommand } from "../channels/message/ingress-queue-read-contract.js";
import type {
  OpenClawStateReadCommand,
  OpenClawStateReadRequest,
} from "./openclaw-state-read.types.js";

export function captureCommand(command: OpenClawStateReadCommand): OpenClawStateReadCommand {
  if (command.type === "tui.lastSession.retiredPointers") {
    return { ...command, retiredSessionKeys: [...command.retiredSessionKeys] };
  }
  if (command.type === "userProfiles.avatar.read") {
    return { ...command, expected: { ...command.expected } };
  }
  if (command.type === "channelIngress.failedHealth") {
    return { type: command.type };
  }
  if (command.type === "channelIngress.pressureHealth") {
    return { type: command.type, input: { now: command.input.now } };
  }
  if (command.type === "channelIngress.accounts") {
    return { type: command.type, input: { channelId: command.input.channelId } };
  }
  if (command.type === "cron.jobNames") {
    return { ...command, jobIds: [...command.jobIds] };
  }
  if (command.type === "githubPublication.sharedObservation") {
    return {
      type: command.type,
      input: {
        ...command.input,
        session: { ...command.input.session },
        selector: { ...command.input.selector },
        entry: {
          ...command.input.entry,
          ...(command.input.entry.worktree
            ? { worktree: { ...command.input.entry.worktree } }
            : {}),
        },
      },
    };
  }
  if (command.type === "sessionRepositoryWorkspaces.find") {
    return {
      type: command.type,
      owners: command.owners.map(({ agentId, sessionKey }) => ({ agentId, sessionKey })),
    };
  }
  if (command.type === "userProfiles.channelIdentity.resolve") {
    return { type: command.type, identity: structuredClone(command.identity) };
  }
  if (
    command.type === "userProfiles.githubAttribution.resolve" ||
    command.type === "userPreferences.values"
  ) {
    return { ...command, profileIds: [...command.profileIds] };
  }
  if (command.type === "workerPlacements.changeSnapshot") {
    return { ...command, profileIds: command.profileIds ? [...command.profileIds] : undefined };
  }
  if (command.type === "subagents.runs") {
    return {
      ...command,
      scope:
        command.scope.kind === "descendants"
          ? {
              kind: "descendants",
              sessionKeys: [...command.scope.sessionKeys],
              liveTopology: command.scope.liveTopology.map((link) => ({ ...link })),
            }
          : command.scope.kind === "ids"
            ? { kind: "ids", runIds: [...command.scope.runIds] }
            : { ...command.scope },
    };
  }
  if (command.type === "mcpOAuth.statuses") {
    return { type: command.type, input: [...command.input] };
  }
  if (command.type === "sessionGroups.members") {
    return { ...command, cfg: structuredClone(command.cfg) };
  }
  if (command.type === "conversationBindings.inspect") {
    const { channel, accountId, conversationId, parentConversationId } = command.conversation;
    return {
      type: command.type,
      conversation: {
        channel,
        accountId,
        conversationId,
        ...(parentConversationId !== undefined ? { parentConversationId } : {}),
      },
    };
  }
  if (command.type === "cron.observeRunRecovery") {
    return {
      type: command.type,
      storeKey: command.storeKey,
      proposals: command.proposals.map(({ jobId, queuedAtMs, runningAtMs }) => ({
        jobId,
        ...(queuedAtMs === undefined ? {} : { queuedAtMs }),
        ...(runningAtMs === undefined ? {} : { runningAtMs }),
      })),
    };
  }
  if (command.type === "devicePairing.bootstrapContext") {
    return { ...command, input: { ...command.input } };
  }
  if (command.type === "operatorApprovals.history") {
    return { ...command, input: { ...command.input } };
  }
  if (
    command.type === "acpSessions.metadata" ||
    command.type === "githubPublication.knownPullRequestUrls" ||
    command.type === "githubRepository.knownPullRequestUrls" ||
    command.type === "workers.placementProjection"
  ) {
    return structuredClone(command);
  }
  if (command.type === "pluginBlob.lookup") {
    const { pluginId, namespace, key } = command.input;
    return { type: command.type, input: { pluginId, namespace, key } };
  }
  if (command.type === "pluginBlob.entries") {
    const { pluginId, namespace } = command.input;
    return { type: command.type, input: { pluginId, namespace } };
  }
  if (command.type === "updateRuns.list") {
    return { ...command, input: { ...command.input } };
  }
  if (command.type === "updateRuns.reconciliationCandidates") {
    return {
      ...command,
      input: {
        ...command.input,
        ...(command.input.runIds ? { runIds: [...command.input.runIds] } : {}),
      },
    };
  }
  if (
    command.type === "skills.library.descriptions" ||
    command.type === "skills.library.manifests"
  ) {
    return {
      type: command.type,
      input: command.input.map(({ skillId, revision }) => ({ skillId, revision })),
    };
  }
  if (command.type === "audit.run.inspect") {
    const input = command.input;
    const common = {
      now: input.now,
      decisionCursor: input.decisionCursor,
      decisionLimit: input.decisionLimit,
    };
    return {
      type: command.type,
      input:
        "executionId" in input
          ? { ...common, executionId: input.executionId }
          : {
              ...common,
              runId: input.runId,
              executionOffset: input.executionOffset,
              executionLimit: input.executionLimit,
            },
    };
  }
  if (command.type === "workerEnvironments.pruneCandidates") {
    return {
      type: command.type,
      input: {
        ...command.input,
        cursor: command.input.cursor ? { ...command.input.cursor } : undefined,
      },
    };
  }
  if (command.type === "workerEnvironments.snapshot") {
    return { type: command.type, ...(command.ids ? { ids: [...command.ids] } : {}) };
  }
  return { ...command };
}

function stringBytes(values: readonly (string | undefined)[], initial = 0): number {
  return values.reduce((bytes, value) => bytes + Buffer.byteLength(value ?? "", "utf8"), initial);
}

function commandBytes(command: OpenClawStateReadRequest["command"]): number {
  let bytes = Buffer.byteLength(command.type, "utf8");
  if (isChannelIngressReadCommand(command)) {
    return bytes + Buffer.byteLength(JSON.stringify(command.input ?? null), "utf8");
  }
  switch (command.type) {
    case "tui.lastSession.read":
      return bytes + Buffer.byteLength(command.stateKey, "utf8");
    case "tui.lastSession.retiredPointers":
      return stringBytes(command.retiredSessionKeys, bytes);
    case "acpSessions.metadata":
      return command.entries.reduce(
        (total, input) =>
          total +
          input.keys.reduce((sum, key) => sum + Buffer.byteLength(key, "utf8"), 0) +
          Buffer.byteLength(input.legacyKey ?? "", "utf8") +
          Buffer.byteLength(input.entry?.lifecycleRevision ?? "", "utf8") +
          Buffer.byteLength(input.entry?.sessionId ?? "", "utf8") +
          (input.entry?.sessionStartedAt === undefined ? 0 : 8),
        bytes,
      );
    case "capture.readOnlyEvents":
      return bytes + Buffer.byteLength(command.sessionId, "utf8") + 8;
    case "capture.readOnlyBlob":
      return bytes + Buffer.byteLength(command.blobId, "utf8");
    case "cron.jobNames":
      return stringBytes(
        command.jobIds,
        bytes + Buffer.byteLength(command.storePath ?? "", "utf8"),
      );
    case "githubPublication.sharedObservation":
      return bytes + Buffer.byteLength(JSON.stringify(command.input), "utf8");
    case "sessionRepositoryWorkspaces.find":
      return command.owners.reduce(
        (total, owner) =>
          total +
          Buffer.byteLength(owner.agentId, "utf8") +
          Buffer.byteLength(owner.sessionKey, "utf8"),
        bytes,
      );
    case "agentDatabaseDeletion.snapshot":
      return bytes + Buffer.byteLength(command.purpose, "utf8");
    case "agentDeletionJournal.status":
    case "cron.activeReceiptOwners":
      return bytes + Buffer.byteLength(command.agentId, "utf8");
    case "subagents.runs":
      return (
        bytes +
        (command.scope.kind === "descendants"
          ? stringBytes(command.scope.sessionKeys) +
            command.scope.liveTopology.reduce(
              (total, link) =>
                total +
                Buffer.byteLength(link.childSessionKey, "utf8") +
                Buffer.byteLength(link.requesterSessionKey, "utf8"),
              0,
            )
          : command.scope.kind === "session"
            ? Buffer.byteLength(command.scope.sessionKey, "utf8")
            : command.scope.kind === "ids"
              ? stringBytes(command.scope.runIds)
              : 0)
      );
    case "mcpOAuth.statuses":
      return stringBytes(command.input, bytes);
    case "mcpOAuth.readOnly":
    case "mcpOAuth.keys":
    case "mcpOAuth.pending":
    case "mcpOAuth.countPrincipals":
      return bytes + Buffer.byteLength(command.input, "utf8");
    case "sessionGroups.members":
      return bytes + Buffer.byteLength(JSON.stringify(command.cfg), "utf8");
    case "conversationBindings.inspect":
      return stringBytes(Object.values(command.conversation), bytes);
    case "cron.observeRunRecovery":
      return command.proposals.reduce(
        (total, proposal) =>
          total +
          Buffer.byteLength(proposal.jobId, "utf8") +
          (proposal.queuedAtMs === undefined ? 0 : 8) +
          (proposal.runningAtMs === undefined ? 0 : 8),
        bytes + Buffer.byteLength(command.storeKey, "utf8"),
      );
    case "devicePairing.bootstrapContext":
      return (
        bytes +
        Buffer.byteLength(command.input.token) +
        Buffer.byteLength(command.input.deviceId) +
        Buffer.byteLength(command.input.publicKey) +
        8
      );
    case "devicePairing.lookup":
      return bytes + Buffer.byteLength(command.deviceId);
    case "devicePairing.pending":
      return bytes + Buffer.byteLength(command.requestId) + 8;
    case "devicePairing.list":
      return bytes + 8 + Buffer.byteLength(command.publishedRevision ?? "");
    case "operatorApprovals.history":
      return (
        bytes +
        Buffer.byteLength(command.input.cursor ?? "", "utf8") +
        Buffer.byteLength(command.input.kind ?? "", "utf8") +
        16
      );
    case "deliveryQueue.outbound":
      return bytes + Buffer.byteLength(command.id ?? "", "utf8");
    case "githubPublication.request":
    case "githubRepository.request":
    case "githubPublication.lifecycle":
      return bytes + Buffer.byteLength(command.requestId, "utf8") + 8;
    case "githubPublication.knownPullRequestUrls":
    case "githubRepository.knownPullRequestUrls":
      return Object.values(command.input).reduce<number>(
        (total, value) =>
          total + (typeof value === "string" ? Buffer.byteLength(value, "utf8") : 8),
        bytes,
      );
    case "pluginBlob.lookup":
    case "pluginBlob.entries":
      return (
        bytes +
        Buffer.byteLength(command.input.pluginId, "utf8") +
        Buffer.byteLength(command.input.namespace, "utf8") +
        (command.type === "pluginBlob.lookup" ? Buffer.byteLength(command.input.key, "utf8") : 0)
      );
    case "subagents.forChildSession":
      return bytes + Buffer.byteLength(command.childSessionKey, "utf8");
    case "sandboxRegistry.get":
      return bytes + Buffer.byteLength(command.containerName, "utf8");
    case "sandboxRegistry.runtimeIds":
      return (
        bytes +
        Buffer.byteLength(command.backendId, "utf8") +
        Buffer.byteLength(command.scopeKey, "utf8")
      );
    case "updateRuns.get":
    case "updateRuns.reconciliationCandidate":
      return bytes + Buffer.byteLength(command.runId, "utf8");
    case "updateRuns.reconciliationCandidates":
      return stringBytes(
        command.input.runIds ?? [],
        bytes + 3 + (command.input.repairHistorySinceMs === undefined ? 0 : 8),
      );
    case "updateRuns.list":
      return (
        bytes +
        Buffer.byteLength(command.input.reason ?? "", "utf8") +
        Buffer.byteLength(command.input.includeRunId ?? "", "utf8") +
        (command.input.limit === undefined ? 0 : 8) +
        (command.input.active === undefined ? 0 : 1)
      );
    case "skills.library.descriptions":
    case "skills.library.manifests":
      return command.input.reduce(
        (total, pin) =>
          total + Buffer.byteLength(pin.skillId, "utf8") + Buffer.byteLength(pin.revision, "utf8"),
        bytes,
      );
    case "fleet.get":
      return bytes + Buffer.byteLength(command.tenantId, "utf8");
    case "onboardingRecommendations.read":
      return bytes + Buffer.byteLength(command.configKey, "utf8");
    case "userProfiles.reconcile":
    case "userProfiles.avatar.inspect":
    case "userProfiles.channelIdentity.list":
    case "userProfiles.authority.resolve":
      return bytes + Buffer.byteLength(command.profileId, "utf8");
    case "userProfiles.avatar.read":
      return (
        bytes +
        Buffer.byteLength(command.profileId, "utf8") +
        stringBytes(Object.values(command.expected))
      );
    case "userProfiles.githubIdentity.cached":
      return bytes + Buffer.byteLength(command.email, "utf8") + 8;
    case "userProfiles.githubAttribution.resolve":
    case "userPreferences.values":
    case "workerPlacements.changeSnapshot":
      return stringBytes(
        command.profileIds ?? [],
        bytes + (command.type === "userPreferences.values" ? Buffer.byteLength(command.key) : 0),
      );
    case "userProfiles.channelIdentity.resolve":
      return bytes + Buffer.byteLength(JSON.stringify(command.identity), "utf8");
    case "userProfiles.email.resolve":
      return bytes + Buffer.byteLength(command.email, "utf8");
    case "workspace.snapshot":
      return bytes + Buffer.byteLength(command.workspaceDir, "utf8");
    case "audit.run.inspect": {
      const input = command.input;
      // Each supplied numeric scalar retains one eight-byte JavaScript number.
      bytes += Buffer.byteLength(input.decisionCursor ?? "", "utf8") + 8;
      if (input.decisionLimit !== undefined) {
        bytes += 8;
      }
      if ("executionId" in input) {
        return bytes + Buffer.byteLength(input.executionId, "utf8");
      }
      return (
        bytes +
        Buffer.byteLength(input.runId, "utf8") +
        (input.executionOffset === undefined ? 0 : 8) +
        (input.executionLimit === undefined ? 0 : 8)
      );
    }
    case "workers.placementProjection":
      return Buffer.byteLength(JSON.stringify(command), "utf8");
    case "workerEnvironments.pruneCandidates":
      return (
        bytes +
        8 +
        (command.input.limit === undefined ? 0 : 8) +
        (command.input.cursor
          ? 8 + Buffer.byteLength(command.input.cursor.environmentId, "utf8")
          : 0)
      );
    case "workerEnvironments.snapshot":
      return stringBytes(command.ids ?? [], bytes);
    case "acpSessions.list":
    case "admit":
    case "agentDatabaseRegistry.read":
    case "config.snapshot.read":
    case "exec-approvals.read":
    case "fleet.list":
    case "nodeHost.config":
    case "operator.channelPolicy":
    case "sandboxRegistry.browsers":
    case "sandboxRegistry.list":
    case "sessionGroups.snapshot":
    case "subagents.sessionList":
    case "updateRuns.historyStatus":
    case "updateRuns.interruptedCandidate":
    case "updateRuns.status":
    case "userProfiles.catalog":
    case "workers.placementRecoveryCandidates":
    case "worktrees.cleanupState":
      return bytes;
  }
  return bytes;
}

export function requestBytes(request: OpenClawStateReadRequest): number {
  return stringBytes(
    [
      ...Object.entries(request.context.environment).flatMap(([key, value]) => [key, value]),
      request.context.existingSchemaPath,
      request.databasePath,
      request.location,
      request.expectedIdentity,
      request.snapshotRoot,
    ],
    commandBytes(request.command),
  );
}
