import { LemmyHttp } from 'lemmy-js-client';
import { ReplyNotification } from '../types/Notification';
import { log } from '../util/log';

export const getLastReply = async (
  instance: string,
  authToken: string,
): Promise<ReplyNotification | null> => {
  const lemmy = new LemmyHttp(`https://${instance}`, {
    headers: {
      'User-Agent': 'Memmy Push 1.0',
      Authorization: `Bearer ${authToken}`,
    },
  });

  try {
    const res = await lemmy.getReplies({
      auth: authToken,
      sort: 'New',
      limit: 1,
      unread_only: true,
    });

    if (res.replies.length < 1) return null;

    const reply = res.replies[0];

    return {
      postId: reply.post.id,
      commentId: reply.comment.id,
      senderName: reply.creator.name,
      content: reply.comment.content,
    };
  } catch (e: any) {
    log(`Error occurred while getting notifications for ${instance}.`);
    console.log(e);
    return null;
  }
};
