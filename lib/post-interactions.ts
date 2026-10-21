import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { publishAndPersistNotification } from "@/lib/notification-persistence";

let tablesInitialized = false;

/**
 * Ensures additive tables exist for saved posts, post subscriptions, and feedback comments.
 * Completely non-destructive: uses CREATE TABLE IF NOT EXISTS.
 */
export async function ensurePostInteractionsTables() {
  if (tablesInitialized) return;

  try {
    // 1. Saved posts / bookmarks
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS saved_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        post_id TEXT NOT NULL,
        post_type TEXT NOT NULL DEFAULT 'feedback',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS saved_posts_user_post_uidx ON saved_posts(user_id, post_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS saved_posts_user_id_idx ON saved_posts(user_id)
    `);

    // 2. Post notification subscriptions
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS post_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        user_email TEXT,
        post_id TEXT NOT NULL,
        post_type TEXT NOT NULL DEFAULT 'feedback',
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS post_subscriptions_user_post_uidx ON post_subscriptions(user_id, post_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS post_subscriptions_post_id_idx ON post_subscriptions(post_id)
    `);

    // 3. Feedback comments
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS feedback_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        comment TEXT NOT NULL,
        media JSONB DEFAULT '[]'::jsonb,
        helpful_count INTEGER NOT NULL DEFAULT 0,
        unhelpful_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS feedback_comments_feedback_id_idx ON feedback_comments(feedback_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS feedback_comments_created_at_idx ON feedback_comments(created_at)
    `);

    tablesInitialized = true;
  } catch (error) {
    console.error("Failed to ensure post interactions tables:", error);
  }
}

/**
 * Save / Bookmark a post for a user
 */
export async function savePost(userId: string, postId: string, postType: string = "feedback") {
  await ensurePostInteractionsTables();
  await db.execute(sql`
    INSERT INTO saved_posts (user_id, post_id, post_type)
    VALUES (${userId}, ${postId}, ${postType})
    ON CONFLICT (user_id, post_id) DO NOTHING
  `);
}

/**
 * Remove bookmark for a post
 */
export async function unsavePost(userId: string, postId: string) {
  await ensurePostInteractionsTables();
  await db.execute(sql`
    DELETE FROM saved_posts
    WHERE user_id = ${userId} AND post_id = ${postId}
  `);
}

/**
 * Get all saved post IDs for a user
 */
export async function getUserSavedPostIds(userId: string): Promise<string[]> {
  await ensurePostInteractionsTables();
  try {
    const result = await db.execute<{ post_id: string }>(sql`
      SELECT post_id FROM saved_posts WHERE user_id = ${userId}
    `);
    return Array.from(result).map((row) => row.post_id);
  } catch {
    return [];
  }
}

/**
 * Subscribe a user to comment notifications for a post
 */
export async function subscribeToPost(
  userId: string,
  userEmail: string | undefined,
  postId: string,
  postType: string = "feedback",
) {
  await ensurePostInteractionsTables();
  await db.execute(sql`
    INSERT INTO post_subscriptions (user_id, user_email, post_id, post_type)
    VALUES (${userId}, ${userEmail || null}, ${postId}, ${postType})
    ON CONFLICT (user_id, post_id) DO UPDATE SET user_email = EXCLUDED.user_email
  `);
}

/**
 * Unsubscribe a user from comment notifications for a post
 */
export async function unsubscribeFromPost(userId: string, postId: string) {
  await ensurePostInteractionsTables();
  await db.execute(sql`
    DELETE FROM post_subscriptions
    WHERE user_id = ${userId} AND post_id = ${postId}
  `);
}

/**
 * Get all subscribed post IDs for a user
 */
export async function getUserSubscribedPostIds(userId: string): Promise<string[]> {
  await ensurePostInteractionsTables();
  try {
    const result = await db.execute<{ post_id: string }>(sql`
      SELECT post_id FROM post_subscriptions WHERE user_id = ${userId}
    `);
    return Array.from(result).map((row) => row.post_id);
  } catch {
    return [];
  }
}

/**
 * Get all subscribers for a post
 */
export async function getPostSubscribers(
  postId: string,
): Promise<Array<{ userId: string; userEmail: string | null }>> {
  await ensurePostInteractionsTables();
  try {
    const result = await db.execute<{ user_id: string; user_email: string | null }>(sql`
      SELECT user_id, user_email FROM post_subscriptions WHERE post_id = ${postId}
    `);
    return Array.from(result).map((row) => ({
      userId: row.user_id,
      userEmail: row.user_email,
    }));
  } catch {
    return [];
  }
}

/**
 * Broadcast in-app and email notifications to all subscribers when a comment is added
 */
export async function notifyPostSubscribers(options: {
  postId: string;
  postType: "feedback" | "issue";
  commenterId?: string;
  commenterName: string;
  commentText: string;
  projectName?: string | null;
}) {
  const { postId, postType, commenterId, commenterName, commentText, projectName } = options;

  try {
    // 1. Fetch subscribers from DB
    const subscribers = await getPostSubscribers(postId);

    // 2. Also check if the original post creator should be notified
    let authorUserId: string | null = null;
    let authorEmail: string | null = null;

    if (postType === "feedback") {
      const feedbackRows = await db.execute<{ user_id: string | null; email: string | null }>(sql`
        SELECT f.user_id, u.email
        FROM feedback f
        LEFT JOIN "user" u ON u.id = f.user_id
        WHERE f.id = ${postId}::uuid
      `);
      const row = Array.from(feedbackRows)[0];
      if (row?.user_id) {
        authorUserId = row.user_id;
        authorEmail = row.email;
      }
    } else {
      const issueRows = await db.execute<{ reporter_user_id: string | null; reporter_email: string | null }>(sql`
        SELECT reporter_user_id, reporter_email
        FROM issues
        WHERE id = ${postId}::uuid
      `);
      const row = Array.from(issueRows)[0];
      if (row?.reporter_user_id) {
        authorUserId = row.reporter_user_id;
        authorEmail = row.reporter_email;
      }
    }

    // Merge author if not already in subscribers
    const recipientsMap = new Map<string, string | null>();
    for (const sub of subscribers) {
      recipientsMap.set(sub.userId, sub.userEmail);
    }
    if (authorUserId && !recipientsMap.has(authorUserId)) {
      recipientsMap.set(authorUserId, authorEmail);
    }

    // Don't notify the commenter themselves
    if (commenterId) {
      recipientsMap.delete(commenterId);
    }

    if (recipientsMap.size === 0) return;

    const recipientUserIds = Array.from(recipientsMap.keys());
    const snippet = commentText.length > 80 ? `${commentText.slice(0, 80)}...` : commentText;
    const postLabel = postType === "feedback" ? "feedback post" : "issue report";

    // 3. Send In-App Notifications
    await publishAndPersistNotification(
      {
        type: "comment_posted",
        title: `New comment on ${postLabel}`,
        message: `${commenterName} commented: "${snippet}"`,
        metadata: {
          postId,
          postType,
          commenterName,
          projectName,
        },
      },
      recipientUserIds,
    );

  } catch (error) {
    console.error("Error in notifyPostSubscribers:", error);
  }
}
