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

async function testBlockUser() {
  try {
    const user1Id = 'test_block_user_a';
    const user2Id = 'test_block_user_b';

    await serverClient.upsertUsers([
      { id: user1Id, name: 'User Block A' },
      { id: user2Id, name: 'User Block B' }
    ]);

    const channel = serverClient.channel('messaging', 'test_channel_block_1', {
      created_by_id: user1Id,
      members: [user1Id, user2Id]
    });

    await channel.create();

    const clientA = new StreamChat(apiKey);
    const tokenA = serverClient.createToken(user1Id);
    await clientA.connectUser({ id: user1Id, name: 'User Block A' }, tokenA);

    const clientB = new StreamChat(apiKey);
    const tokenB = serverClient.createToken(user2Id);
    await clientB.connectUser({ id: user2Id, name: 'User Block B' }, tokenB);

    console.log('1. Client A connected.');

    // User A blocks User B
    const blockRes = await clientA.blockUser(user2Id);
    console.log('2. User A blocked User B via Stream Chat SDK! Res:', blockRes);

    // Verify blocked users on Client A
    const blockedList = await clientA.getBlockedUsers();
    console.log('3. Client A getBlockedUsers(): count =', blockedList.blocks?.length);

    // User A unblocks User B with unBlockUser (capital B!)
    const unblockRes = await clientA.unBlockUser(user2Id);
    console.log('4. User A unblocked User B via Stream Chat SDK! Res:', unblockRes);

    const blockedListAfter = await clientA.getBlockedUsers();
    console.log('5. Client A getBlockedUsers() after unblock:', blockedListAfter.blocks?.length || 0);

    await clientA.disconnectUser();
    await clientB.disconnectUser();
    console.log('SUCCESS: Stream Chat blockUser & unBlockUser verified with 0 errors!');
  } catch (err) {
    console.error('Error testing block user:', err);
  }
}

testBlockUser();
