import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { publishAndPersistNotification } from "@/lib/notification-persistence";
import { sendEmail } from "@/lib/email";

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
    const projectSuffix = projectName ? ` on ${projectName}` : "";

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

    // 4. Send Email Notifications (async, non-blocking)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3101";
    const postUrl = `${baseUrl}/citizen-feed#${postType}-${postId}`;

    for (const [, email] of recipientsMap.entries()) {
      if (!email || !email.includes("@")) continue;

      sendEmail({
        to: email,
        subject: `New comment on ${postLabel}${projectSuffix} | Infra Watch`,
        text: `Hello,\n\n${commenterName} commented on a ${postLabel} you are subscribed to${projectSuffix}:\n\n"${commentText}"\n\nView the post and reply here: ${postUrl}\n\n- The Infra Watch Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
            <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 16px 24px; border-radius: 12px 12px 0 0;">
              <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700;">INFRA Watch Citizen Feed</h2>
            </div>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 15px; margin-top: 0;">Hello,</p>
              <p style="font-size: 15px; color: #334155;">
                <strong>${commenterName}</strong> added a comment on a ${postLabel} you are following${projectSuffix ? ` for <strong>${projectName}</strong>` : ""}:
              </p>
              <div style="background: #f8fafc; border-left: 4px solid #059669; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-style: italic; color: #475569;">
                &ldquo;${commentText}&rdquo;
              </div>
              <div style="margin-top: 24px;">
                <a href="${postUrl}" style="display: inline-block; background: #059669; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  View Post &amp; Discussion
                </a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                You received this email because you turned on notifications for this post on INFRA Watch.
              </p>
            </div>
          </div>
        `,
      }).catch((err) => {
        console.warn(`Failed to send comment email to ${email}:`, err);
      });
    }
  } catch (error) {
    console.error("Error in notifyPostSubscribers:", error);
  }
}
