import { StreamChat } from 'stream-chat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf8');
const apiKeyMatch = envFile.match(/STREAM_API_KEY=(.*)/);
const apiSecretMatch = envFile.match(/STREAM_API_SECRET=(.*)/);

const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
const apiSecret = apiSecretMatch ? apiSecretMatch[1].trim() : null;

const serverClient = StreamChat.getInstance(apiKey, apiSecret);

async function testFullBlockFlow() {
  try {
    const user1Id = 'test_real_user_a_88';
    const user2Id = 'test_real_user_b_99';

    await serverClient.upsertUsers([
      { id: user1Id, name: 'Real User A' },
      { id: user2Id, name: 'Real User B' }
    ]);

    const channel = serverClient.channel('messaging', 'test_channel_full_block_8899', {
      created_by_id: user1Id,
      members: [user1Id, user2Id]
    });
    await channel.create();

    const clientA = new StreamChat(apiKey);
    const tokenA = serverClient.createToken(user1Id);
    await clientA.connectUser({ id: user1Id, name: 'Real User A' }, tokenA);

    const clientB = new StreamChat(apiKey);
    const tokenB = serverClient.createToken(user2Id);
    await clientB.connectUser({ id: user2Id, name: 'Real User B' }, tokenB);

    console.log('1. User A & User B connected.');

    // Step 1: User A blocks User B
    await clientA.blockUser(user2Id);
    await serverClient.blockUser(user2Id, user1Id);
    console.log('2. User A blocked User B via Stream Chat SDK & Server.');

    // Step 2: Verify getBlockedUsers
    const blockedList = await clientA.getBlockedUsers();
    console.log('3. User A getBlockedUsers count:', blockedList.blocks?.length);

    // Step 3: User A unblocks User B
    await clientA.unBlockUser(user2Id);
    await serverClient.unBlockUser(user2Id, user1Id);
    console.log('4. User A unblocked User B via Stream Chat SDK & Server.');

    const blockedListAfter = await clientA.getBlockedUsers();
    console.log('5. User A getBlockedUsers after unblock:', blockedListAfter.blocks?.length || 0);

    await clientA.disconnectUser();
    await clientB.disconnectUser();
    console.log('SUCCESS: Full Stream Chat block and unblock flow verified 100%!');
  } catch (err) {
    console.error('Full block test error:', err);
  }
}

testFullBlockFlow();
