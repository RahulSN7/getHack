import { StreamChat } from 'stream-chat';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

console.log('Stream Key:', apiKey ? 'FOUND' : 'MISSING');
console.log('Stream Secret:', apiSecret ? 'FOUND' : 'MISSING');

if (!apiKey || !apiSecret) {
  process.exit(1);
}

const serverClient = StreamChat.getInstance(apiKey, apiSecret);

async function testStreamCapabilities() {
  try {
    // Create two test users
    const user1Id = 'test_user_a_123';
    const user2Id = 'test_user_b_456';

    await serverClient.upsertUsers([
      { id: user1Id, name: 'User A' },
      { id: user2Id, name: 'User B' }
    ]);

    // Create a channel
    const channel = serverClient.channel('messaging', 'test_channel_reply_react', {
      created_by_id: user1Id,
      members: [user1Id, user2Id]
    });

    await channel.create();

    // Client for User A
    const clientA = StreamChat.getInstance(apiKey);
    const tokenA = serverClient.createToken(user1Id);
    await clientA.connectUser({ id: user1Id, name: 'User A' }, tokenA);

    const channelA = clientA.channel('messaging', 'test_channel_reply_react');
    await channelA.watch();

    // Send original message
    const msg1Res = await channelA.sendMessage({ text: 'Hello from User A' });
    console.log('Message 1 sent:', msg1Res.message.id);

    // Send reaction on Msg 1
    const reactRes = await channelA.sendReaction(msg1Res.message.id, { type: '👍' });
    console.log('Reaction sent:', reactRes.message.reaction_counts, reactRes.message.latest_reactions);

    // Toggle reaction off
    const deleteReactRes = await channelA.deleteReaction(msg1Res.message.id, '👍');
    console.log('Reaction deleted:', deleteReactRes.message.reaction_counts);

    // Send thread reply to Msg 1
    const replyRes = await channelA.sendMessage({
      text: 'This is a reply to Msg 1',
      parent_id: msg1Res.message.id
    });
    console.log('Reply sent:', replyRes.message.id, 'parent_id:', replyRes.message.parent_id);

    await clientA.disconnectUser();
    console.log('Stream test completed successfully!');
  } catch (err) {
    console.error('Error in Stream test:', err);
  }
}

testStreamCapabilities();
