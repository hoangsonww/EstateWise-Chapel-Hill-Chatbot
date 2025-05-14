export const API_BASE_URL = "https://estatewise-backend.vercel.app";

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

export const fetchHealthStatus = async () => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/health`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};
