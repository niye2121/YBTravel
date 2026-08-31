const assert = require("node:assert/strict");
const {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} = require("@nestjs/common");
const { MessagingService } = require("../dist/modules/messaging/messaging.service.js");

async function run() {
  let status = "connected";
  let recipient = {
    jid: "12025550123@s.whatsapp.net",
    phoneNumber: "12025550123",
    displayName: "Example Contact",
  };
  let resolvedNumber = null;
  let storedRecipient = null;
  let emittedConversationId = null;

  const channel = {
    getStatus: () => status,
    resolveDirectRecipient: async (phoneNumber) => {
      resolvedNumber = phoneNumber;
      return recipient;
    },
  };
  const conversations = {
    findOrCreateConversation: async (jid, phoneNumber, displayName) => {
      storedRecipient = { jid, phoneNumber, displayName };
      return 42;
    },
  };
  const gateway = {
    emitConversationUpdated: (id) => {
      emittedConversationId = id;
    },
  };
  const service = new MessagingService(channel, conversations, gateway);

  assert.deepEqual(await service.startDirectConversation("+1 (202) 555-0123"), { id: 42 });
  assert.equal(resolvedNumber, "12025550123");
  assert.deepEqual(storedRecipient, recipient);
  assert.equal(emittedConversationId, 42);

  await assert.rejects(
    () => service.startDirectConversation("202-555-0123 ext 4"),
    BadRequestException,
  );

  status = "disconnected";
  await assert.rejects(
    () => service.startDirectConversation("+1 202 555 0123"),
    ServiceUnavailableException,
  );

  status = "connected";
  recipient = null;
  await assert.rejects(
    () => service.startDirectConversation("+1 202 555 0123"),
    NotFoundException,
  );

  console.log("WhatsApp new-conversation service checks passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
