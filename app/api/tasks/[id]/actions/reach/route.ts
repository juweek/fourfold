import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { assertNoError, db } from "@/lib/db";
import { getSettings } from "@/lib/today";
import type { Contact, Task } from "@/lib/types";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const contactId = typeof body.contact_id === "string" ? body.contact_id.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!contactId || !subject || !message) {
      return NextResponse.json({ error: "Choose a recipient and complete the subject and message." }, { status: 400 });
    }
    if (subject.length > 200 || message.length > 20000) {
      return NextResponse.json({ error: "The email is too long to send from this composer." }, { status: 400 });
    }

    const [{ data: taskData, error: taskError }, { data: contactData, error: contactError }, settings] = await Promise.all([
      db().from("tasks").select("*").eq("id", id).single(),
      db().from("contacts").select("*").eq("id", contactId).single(),
      getSettings(),
    ]);
    assertNoError(taskError);
    assertNoError(contactError);
    const task = taskData as unknown as Task;
    const contact = contactData as unknown as Contact;

    if (task.action_type !== "reach") {
      return NextResponse.json({ error: "This quest is not designated as a Reach action." }, { status: 409 });
    }
    if (task.completed_at) {
      return NextResponse.json({ error: "This quest has already been completed." }, { status: 409 });
    }
    if (!contact.email) {
      return NextResponse.json({ error: `${contact.name} does not have an email address yet.` }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
    const resend = new Resend(apiKey);
    const senderEmail = settings.outreach_sender_email || "onboarding@resend.dev";
    const sent = await resend.emails.send({
      from: `Fourfold <${senderEmail}>`,
      to: contact.email,
      subject,
      text: message,
    }, { idempotencyKey: `fourfold-reach-${task.id}` });
    if (sent.error) throw new Error(sent.error.message);

    const completedAt = new Date().toISOString();
    const { data: completedTask, error: completeError } = await db().from("tasks").update({
      completed_at: completedAt,
      contact_id: contact.id,
    }).eq("id", task.id).select("*").single();
    assertNoError(completeError);

    const { error: eventError } = await db().from("task_action_events").insert({
      task_id: task.id,
      contact_id: contact.id,
      action_type: "reach",
      status: "sent",
      provider_id: sent.data?.id ?? null,
      recipient_email: contact.email,
      subject,
    });
    if (eventError) console.error("Email sent, but its task action event could not be recorded:", eventError.message);

    return NextResponse.json({
      id: sent.data?.id,
      task: completedTask,
      recipient: { id: contact.id, name: contact.name, email: contact.email },
    });
  } catch (error) {
    return apiError(error);
  }
}
