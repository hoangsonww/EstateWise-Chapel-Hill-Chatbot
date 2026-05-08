export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://estatewise-backend.vercel.app";

/**
 * Whether to render passkey UI. Defaults to enabled; set
 * NEXT_PUBLIC_PASSKEYS_ENABLED=false to hide all passkey affordances.
 */
export const PASSKEYS_ENABLED =
  process.env.NEXT_PUBLIC_PASSKEYS_ENABLED !== "false";

export type ChatMessage = { role: "user" | "model"; text: string };

/**
 * Fetches all conversations for an authenticated user.
 * @param token - The authentication token.
 * @returns A promise that resolves with the list of conversations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getConversations(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/api/conversations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to load conversations");
  }
  return await res.json();
}

/**
 * Renames a conversation.
 * @param convId - The ID of the conversation to rename.
 * @param title - The new title.
 * @param token - The authentication token.
 * @returns A promise that resolves with the updated conversation.
 */
export async function renameConversation(
  convId: string,
  title: string,
  token: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${convId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error("Failed to rename conversation");
  }
  return await res.json();
}

/**
 * Deletes a conversation.
 * @param id - The ID of the conversation to delete.
 * @param token - The authentication token.
 * @returns A promise that resolves when the conversation is deleted.
 */
export async function deleteConversation(
  id: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to delete conversation");
  }
}

/**
 * Creates a new conversation.
 * @param token - The authentication token.
 * @returns A promise that resolves with the newly created conversation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createNewConversation(token: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: "Untitled Conversation" }),
  });
  if (!res.ok) {
    throw new Error("Failed to create new conversation");
  }
  return await res.json();
}

/**
 * Sends a message to the chat API.
 * @param params - An object containing the message, optional conversation id, token, and/or history.
 * @returns A promise that resolves with the API response.
 */
export async function sendMessage(params: {
  token?: string;
  convoId?: string;
  message: string;
  history?: ChatMessage[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (params.token) {
    headers.Authorization = `Bearer ${params.token}`;
  }
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Error sending message");
  }
  return await res.json();
}

/**
 * Searches conversations by query.
 * @param query - The search term.
 * @param token - Optional authentication token.
 * @returns A promise that resolves with the search results.
 */
export async function searchConversations(
  query: string,
  token?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const url = `${API_BASE_URL}/api/conversations/search?q=${encodeURIComponent(query)}`;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Conversation search failed");
  }
  return await res.json();
}

// ────────────────────────────────────────────────────────────────────────────
// Graph API
// ────────────────────────────────────────────────────────────────────────────

export async function graphSimilar(zpid: number, limit = 10) {
  const url = `${API_BASE_URL}/api/graph/similar/${zpid}?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Graph similar failed (${res.status})`);
  }
  return await res.json();
}

export async function graphExplain(fromZpid: number, toZpid: number) {
  const url = `${API_BASE_URL}/api/graph/explain?from=${fromZpid}&to=${toZpid}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Graph explain failed (${res.status})`);
  }
  return await res.json();
}

export async function graphNeighborhood(name: string, limit = 50) {
  const url = `${API_BASE_URL}/api/graph/neighborhood/${encodeURIComponent(name)}?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Graph neighborhood failed (${res.status})`);
  }
  return await res.json();
}

export async function graphOverview(limit = 250) {
  const url = `${API_BASE_URL}/api/graph/overview?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Graph overview failed (${res.status})`);
  }
  return await res.json();
}

// Properties API
export async function getPropertiesByIds(zpids: (string | number)[]) {
  const ids = zpids.map(String).join(",");
  const url = `${API_BASE_URL}/api/properties/by-ids?ids=${encodeURIComponent(ids)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `by-ids failed (${res.status})`);
  }
  return await res.json();
}

export async function searchPropertiesForMap(q: string, topK = 200) {
  const url = `${API_BASE_URL}/api/properties?q=${encodeURIComponent(q)}&topK=${topK}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `properties search failed (${res.status})`);
  }
  return await res.json();
}

// Lookup ZPIDs by address/city/state/zip and optional beds/baths
export async function lookupZpid(params: {
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  beds?: number;
  baths?: number;
  limit?: number;
}) {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "")
      qp.set(k, String(v));
  });
  const url = `${API_BASE_URL}/api/properties/lookup?${qp.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `lookup failed (${res.status})`);
  }
  return await res.json();
}

// ────────────────────────────────────────────────────────────────────────────
// Forum Posts API
// ────────────────────────────────────────────────────────────────────────────

export interface Post {
  _id: string;
  author: { _id: string; username: string; email: string };
  title: string;
  content: string;
  category: string;
  upvotes: string[];
  downvotes: string[];
  commentCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  post: string;
  author: { _id: string; username: string; email: string };
  content: string;
  upvotes: string[];
  downvotes: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getPosts(params?: {
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const qp = new URLSearchParams();
  if (params?.category) qp.set("category", params.category);
  if (params?.page) qp.set("page", String(params.page));
  if (params?.limit) qp.set("limit", String(params.limit));
  if (params?.sortBy) qp.set("sortBy", params.sortBy);
  if (params?.sortOrder) qp.set("sortOrder", params.sortOrder);

  const url = `${API_BASE_URL}/api/posts${qp.toString() ? `?${qp.toString()}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch posts (${res.status})`);
  }
  return await res.json();
}

export async function getPost(id: string): Promise<Post> {
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch post (${res.status})`);
  }
  return await res.json();
}

export async function createPost(
  data: { title: string; content: string; category?: string },
  token: string,
): Promise<Post> {
  const res = await fetch(`${API_BASE_URL}/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create post");
  }
  return await res.json();
}

export async function updatePost(
  id: string,
  data: { title?: string; content?: string; category?: string },
  token: string,
): Promise<Post> {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update post");
  }
  return await res.json();
}

export async function deletePost(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete post");
  }
}

export async function upvotePost(id: string, token: string): Promise<Post> {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}/upvote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to upvote post");
  }
  return await res.json();
}

export async function downvotePost(id: string, token: string): Promise<Post> {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}/downvote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to downvote post");
  }
  return await res.json();
}

export async function searchPosts(
  query: string,
  category?: string,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
) {
  const qp = new URLSearchParams({ q: query });
  if (category) qp.set("category", category);
  if (sortBy) qp.set("sortBy", sortBy);
  if (sortOrder) qp.set("sortOrder", sortOrder);

  const url = `${API_BASE_URL}/api/posts/search?${qp.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Search failed");
  }
  return await res.json();
}

// ────────────────────────────────────────────────────────────────────────────
// Forum Comments API
// ────────────────────────────────────────────────────────────────────────────

export async function getCommentsByPost(postId: string): Promise<Comment[]> {
  const url = `${API_BASE_URL}/api/comments/post/${postId}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch comments");
  }
  return await res.json();
}

export async function createComment(
  data: { postId: string; content: string },
  token: string,
): Promise<Comment> {
  const res = await fetch(`${API_BASE_URL}/api/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create comment");
  }
  return await res.json();
}

export async function updateComment(
  id: string,
  content: string,
  token: string,
): Promise<Comment> {
  const res = await fetch(`${API_BASE_URL}/api/comments/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update comment");
  }
  return await res.json();
}

export async function deleteComment(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/comments/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete comment");
  }
}

export async function upvoteComment(
  id: string,
  token: string,
): Promise<Comment> {
  const res = await fetch(`${API_BASE_URL}/api/comments/${id}/upvote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to upvote comment");
  }
  return await res.json();
}

export async function downvoteComment(
  id: string,
  token: string,
): Promise<Comment> {
  const res = await fetch(`${API_BASE_URL}/api/comments/${id}/downvote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to downvote comment");
  }
  return await res.json();
}

// ────────────────────────────────────────────────────────────────────────────
// WebAuthn / Passkeys API
// ────────────────────────────────────────────────────────────────────────────

export interface PasskeyCredentialSummary {
  id: string;
  credentialID: string;
  nickname: string;
  transports: string[];
  deviceType?: "singleDevice" | "multiDevice";
  backedUp?: boolean;
  createdAt: string;
  lastUsedAt: string;
}

export async function getRegistrationOptions(token: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/auth/webauthn/register/options`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start passkey registration");
  }
  return await res.json();
}

export async function verifyRegistration(
  token: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any,
  nickname?: string,
) {
  const res = await fetch(`${API_BASE_URL}/api/auth/webauthn/register/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ response, nickname }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to register passkey");
  }
  return (await res.json()) as {
    verified: boolean;
    credential: PasskeyCredentialSummary;
  };
}

export async function getAuthenticationOptions(email?: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/webauthn/login/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(email ? { email } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start passkey login");
  }
  return await res.json();
}

export async function verifyAuthentication(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any;
  email?: string;
  sessionId?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/webauthn/login/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Passkey login failed");
  }
  return (await res.json()) as {
    token: string;
    user: { username: string; email: string };
  };
}

export async function listPasskeys(
  token: string,
): Promise<PasskeyCredentialSummary[]> {
  const res = await fetch(`${API_BASE_URL}/api/auth/webauthn/credentials`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to list passkeys");
  }
  const data = await res.json();
  return data.credentials || [];
}

export async function renamePasskey(
  token: string,
  id: string,
  nickname: string,
) {
  const res = await fetch(
    `${API_BASE_URL}/api/auth/webauthn/credentials/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nickname }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to rename passkey");
  }
  return (await res.json()) as { credential: PasskeyCredentialSummary };
}

export async function deletePasskey(token: string, id: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/auth/webauthn/credentials/${id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete passkey");
  }
}
