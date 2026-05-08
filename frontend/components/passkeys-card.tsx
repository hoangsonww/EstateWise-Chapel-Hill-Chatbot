"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Fingerprint,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PasskeyCredentialSummary,
  deletePasskey,
  listPasskeys,
  renamePasskey,
} from "@/lib/api";
import { passkeysAvailable, registerPasskey } from "@/lib/passkeys";

type Props = { token: string };

export function PasskeysCard({ token }: Props) {
  const [credentials, setCredentials] = useState<PasskeyCredentialSummary[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const supported = passkeysAvailable();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPasskeys(token);
      setCredentials(data);
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to load passkeys");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await registerPasskey(token);
      toast.success("Passkey added.");
      await refresh();
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e?.name === "AbortError" || e?.name === "NotAllowedError") {
        toast("Cancelled.");
      } else {
        toast.error(e?.message || "Couldn't add passkey.");
      }
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (cred: PasskeyCredentialSummary) => {
    setEditingId(cred.id);
    setEditingNickname(cred.nickname);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingNickname("");
  };

  const saveRename = async (id: string) => {
    const nickname = editingNickname.trim();
    if (!nickname) {
      toast.error("Nickname is required.");
      return;
    }
    setBusyId(id);
    try {
      await renamePasskey(token, id, nickname);
      toast.success("Renamed.");
      await refresh();
      cancelEdit();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to rename passkey");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Remove this passkey? You'll need a password or another passkey to sign in.",
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      await deletePasskey(token, id);
      toast.success("Passkey removed.");
      await refresh();
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to delete passkey");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5" />
          Passkeys
        </CardTitle>
        <CardDescription>
          Sign in faster with Face ID, Touch ID, Windows Hello, or your phone.
          Passkeys never leave your device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported && (
          <p className="text-sm text-muted-foreground">
            This browser doesn&apos;t support passkeys. Try Chrome, Safari,
            Edge, or Firefox on a recent OS.
          </p>
        )}

        {supported && loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading passkeys…
          </div>
        )}

        {supported && !loading && credentials.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any passkeys yet.
          </p>
        )}

        {supported && credentials.length > 0 && (
          <ul className="divide-y divide-border rounded-md border border-border">
            {credentials.map((cred) => {
              const isEditing = editingId === cred.id;
              const isBusy = busyId === cred.id;
              return (
                <li
                  key={cred.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={editingNickname}
                          onChange={(e) => setEditingNickname(e.target.value)}
                          maxLength={60}
                          autoFocus
                          className="max-w-xs"
                          disabled={isBusy}
                        />
                        <Button
                          size="sm"
                          onClick={() => saveRename(cred.id)}
                          disabled={isBusy}
                        >
                          {isBusy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          disabled={isBusy}
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium truncate">{cred.nickname}</p>
                        <p className="text-xs text-muted-foreground">
                          {cred.backedUp ? "Synced" : "This device"} · added{" "}
                          {new Date(cred.createdAt).toLocaleDateString()} · last
                          used {new Date(cred.lastUsedAt).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(cred)}
                        disabled={isBusy}
                        aria-label="Rename passkey"
                        title="Rename"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(cred.id)}
                        disabled={isBusy}
                        aria-label="Remove passkey"
                        title="Remove"
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {supported && (
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{adding ? "Setting up…" : "Add a passkey"}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
