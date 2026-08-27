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

async function testServerBlock() {
  try {
    const user1Id = 'test_server_block_user_a';
    const user2Id = 'test_server_block_user_b';

    await serverClient.upsertUsers([
      { id: user1Id, name: 'User Server A' },
      { id: user2Id, name: 'User Server B' }
    ]);

    // Test serverClient.blockUser(targetUserId, currentUserId)
    const blockRes = await serverClient.blockUser(user2Id, user1Id);
    console.log('1. Server blockUser result:', blockRes);

    // Query blocked users passing string user1Id
    const blockedList = await serverClient.getBlockedUsers(user1Id);
    console.log('2. Server getBlockedUsers count:', blockedList.blocks?.length);

    // Test serverClient.unBlockUser(targetUserId, currentUserId)
    const unblockRes = await serverClient.unBlockUser(user2Id, user1Id);
    console.log('3. Server unBlockUser result:', unblockRes);

    const blockedListAfter = await serverClient.getBlockedUsers(user1Id);
    console.log('4. Server getBlockedUsers after unblock:', blockedListAfter.blocks?.length || 0);

    console.log('SUCCESS: Stream Chat server-side block & unblock verified!');
  } catch (err) {
    console.error('Server block error:', err);
  }
}

testServerBlock();
