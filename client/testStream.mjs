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

function getStreamReactionKey(emoji) {
  const map = {
    '👍': 'like',
    '❤️': 'love',
    '😂': 'laugh',
    '😮': 'wow',
    '😢': 'sad',
    '🙏': 'pray'
  };
  if (map[emoji]) return map[emoji];
  return 'emoji_' + Array.from(emoji).map((char) => char.codePointAt(0).toString(16)).join('_');
}

async function testExpandedReactions() {
  try {
    const user1Id = 'test_user_a_123';
    const user2Id = 'test_user_b_456';

    await serverClient.upsertUsers([
      { id: user1Id, name: 'User A' },
      { id: user2Id, name: 'User B' }
    ]);

    const channel = serverClient.channel('messaging', 'test_channel_reply_react_4', {
      created_by_id: user1Id,
      members: [user1Id, user2Id]
    });

    await channel.create();

    const clientA = StreamChat.getInstance(apiKey);
    const tokenA = serverClient.createToken(user1Id);
    await clientA.connectUser({ id: user1Id, name: 'User A' }, tokenA);

    const channelA = clientA.channel('messaging', 'test_channel_reply_react_4');
    await channelA.watch();

    const msg1Res = await channelA.sendMessage({ text: 'Hello' });

    // Test quick reaction 'pray'
    const prayKey = getStreamReactionKey('🙏');
    const prayRes = await channelA.sendReaction(msg1Res.message.id, { type: prayKey });
    console.log('Pray reaction sent:', prayRes.message.reaction_counts);

    // Test expanded emoji '🌟' -> 'emoji_1f31f'
    const starKey = getStreamReactionKey('🌟');
    const starRes = await channelA.sendReaction(msg1Res.message.id, { type: starKey });
    console.log('Star hex key reaction sent:', starRes.message.reaction_counts);

    await clientA.disconnectUser();
    console.log('SUCCESS: All quick and expanded hex reactions verified with Stream Chat API!');
  } catch (err) {
    console.error('Error:', err);
  }
}

testExpandedReactions();
