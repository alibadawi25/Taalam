import { supabase } from "./supabaseClient";

function normalizeNote(note) {
  if (!note) {
    return null;
  }

  return {
    id: Number(note.id) || null,
    lessonId: Number(note.lesson_id) || null,
    userId: note.user_id || null,
    content: note.content || "",
    timestampSeconds: Math.max(0, Math.floor(Number(note.timestamp_seconds) || 0)),
    isStarred: Boolean(note.is_starred),
    createdAt: note.created_at || null,
    updatedAt: note.updated_at || null,
  };
}

async function getCurrentUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user?.id ?? null;
}

export async function fetchNotesForLesson(lessonId) {
  const numericLessonId = Number(lessonId);
  const userId = await getCurrentUserId();

  if (!userId || !Number.isFinite(numericLessonId) || numericLessonId <= 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("notes")
    .select(
      "id, lesson_id, user_id, content, timestamp_seconds, is_starred, created_at, updated_at",
    )
    .eq("lesson_id", numericLessonId)
    .order("is_starred", { ascending: false })
    .order("timestamp_seconds", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeNote).filter(Boolean);
}

export async function createNote(lessonId, { content, timestampSeconds }) {
  const numericLessonId = Number(lessonId);
  const userId = await getCurrentUserId();
  const trimmedContent = String(content || "").trim();

  if (!userId) {
    throw new Error("Authentication is required");
  }

  if (!Number.isFinite(numericLessonId) || numericLessonId <= 0) {
    throw new Error("A valid lesson is required");
  }

  if (!trimmedContent) {
    throw new Error("Note content is required");
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      lesson_id: numericLessonId,
      content: trimmedContent,
      timestamp_seconds: Math.max(0, Math.floor(Number(timestampSeconds) || 0)),
      is_starred: false,
    })
    .select(
      "id, lesson_id, user_id, content, timestamp_seconds, is_starred, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return normalizeNote(data);
}

export async function updateNote(noteId, updates = {}) {
  const numericNoteId = Number(noteId);
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Authentication is required");
  }

  if (!Number.isFinite(numericNoteId) || numericNoteId <= 0) {
    throw new Error("A valid note is required");
  }

  const payload = {};

  if (typeof updates.content === "string") {
    payload.content = updates.content.trim();
  }

  if (typeof updates.isStarred === "boolean") {
    payload.is_starred = updates.isStarred;
  }

  if (updates.timestampSeconds != null) {
    payload.timestamp_seconds = Math.max(
      0,
      Math.floor(Number(updates.timestampSeconds) || 0),
    );
  }

  const { data, error } = await supabase
    .from("notes")
    .update(payload)
    .eq("id", numericNoteId)
    .select(
      "id, lesson_id, user_id, content, timestamp_seconds, is_starred, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return normalizeNote(data);
}

export async function deleteNote(noteId) {
  const numericNoteId = Number(noteId);
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Authentication is required");
  }

  if (!Number.isFinite(numericNoteId) || numericNoteId <= 0) {
    throw new Error("A valid note is required");
  }

  const { error } = await supabase.from("notes").delete().eq("id", numericNoteId);

  if (error) {
    throw error;
  }

  return true;
}
