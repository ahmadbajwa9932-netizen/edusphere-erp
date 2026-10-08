"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesApi, classesApi } from "../../../../lib/api";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import { Table, Tr, Td, TableFooter } from "../../../../components/ui/Table";
import {
  Plus, Trash2, MessageSquare, Search, Eye,
  Users, GraduationCap, BookOpen, Globe, Mail, MailOpen,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS = ["Message", "Sender", "Recipient", "Sent At", "Status", "Actions"];

const RECIPIENT_TYPES = [
  "All", "All Students", "All Teachers", "All Parents", "Class", "Individual",
];

const RECIPIENT_ICON = {
  All:          Globe,
  "All Students": GraduationCap,
  "All Teachers": BookOpen,
  "All Parents":  Users,
  Class:          GraduationCap,
  Individual:     Users,
};

const RECIPIENT_COLOR = {
  All:            "bg-indigo-50 text-indigo-600",
  "All Students": "bg-emerald-50 text-emerald-600",
  "All Teachers": "bg-purple-50 text-purple-600",
  "All Parents":  "bg-amber-50 text-amber-700",
  Class:          "bg-sky-50 text-sky-600",
  Individual:     "bg-pink-50 text-pink-600",
};

const selectCls = "w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-gray-600 bg-white";
const labelCls  = "text-[12px] font-medium text-gray-600";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const queryClient = useQueryClient();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [isRead,        setIsRead]        = useState("");
  const [page,          setPage]          = useState(1);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [composeModal, setComposeModal] = useState(false);
  const [viewTarget,   setView]         = useState(null);
  const [deleteId,     setDeleteId]     = useState(null);

  const emptyForm = {
    subject: "", body: "",
    senderName: "Admin", senderRole: "Admin",
    recipientType: "All", classId: "", recipientName: "",
  };
  const [form,        setForm]        = useState(emptyForm);
  const [formErrors,  setFormErrors]  = useState({});
  const [serverError, setServerError] = useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["messages", search, recipientType, isRead, page],
    queryFn:  () => messagesApi.getAll({ search, recipientType, isRead, page, limit: 20 }),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn:  classesApi.getAll,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: messagesApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["messages"] }); closeCompose(); },
    onError: (err) => setServerError(err?.response?.data?.error || "Something went wrong."),
  });

  const markReadMutation = useMutation({
    mutationFn: messagesApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: messagesApi.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["messages"] }); setDeleteId(null); },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (formErrors[field]) setFormErrors((p) => ({ ...p, [field]: "" }));
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (!form.subject.trim())       e.subject       = "Subject is required";
    if (!form.body.trim())          e.body          = "Message body is required";
    if (!form.senderName.trim())    e.senderName    = "Sender name is required";
    if (!form.recipientType)        e.recipientType = "Recipient type is required";
    if (form.recipientType === "Class" && !form.classId)
                                    e.classId       = "Please select a class";
    if (form.recipientType === "Individual" && !form.recipientName.trim())
                                    e.recipientName = "Recipient name is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCompose = () => {
    setForm(emptyForm); setFormErrors({}); setServerError(""); setComposeModal(true);
  };

  const closeCompose = () => { setComposeModal(false); setServerError(""); };

  const handleSend = () => {
    if (!validate()) return;
    createMutation.mutate(form);
  };

  const handleView = (msg) => {
    setView(msg);
    if (!msg.isRead) markReadMutation.mutate(msg.id);
  };

  const clearFilters = () => { setSearch(""); setRecipientType(""); setIsRead(""); setPage(1); };
  const hasFilters = search || recipientType || isRead;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const messages = data?.messages || [];
  const unread   = messages.filter((m) => !m.isRead).length;
  const read     = messages.filter((m) => m.isRead).length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <PageHeader title="Messages" description="Compose and manage messages to students, teachers and parents">
        <Button icon={Plus} onClick={openCompose}>Compose Message</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sent",  value: data?.total || 0, color: "bg-indigo-50 text-indigo-600",  icon: MessageSquare },
          { label: "Unread",      value: unread,            color: "bg-amber-50 text-amber-600",    icon: Mail          },
          { label: "Read",        value: read,              color: "bg-emerald-50 text-emerald-600",icon: MailOpen      },
          { label: "Recipients",  value: new Set(messages.map((m) => m.recipientType)).size,
                                                            color: "bg-purple-50 text-purple-600",  icon: Users         },
        ].map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon size={16} />
              </div>
              <div>
                <p className="text-[11px] text-gray-400">{s.label}</p>
                <p className="text-[20px] font-bold text-gray-800">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search subject, sender, body..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 placeholder:text-gray-300"
          />
        </div>
        <select value={recipientType} onChange={(e) => { setRecipientType(e.target.value); setPage(1); }} className={selectCls + " max-w-[160px]"}>
          <option value="">All Recipients</option>
          {RECIPIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={isRead} onChange={(e) => { setIsRead(e.target.value); setPage(1); }} className={selectCls + " max-w-[130px]"}>
          <option value="">All Status</option>
          <option value="false">Unread</option>
          <option value="true">Read</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="text-[12px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50">Clear</button>
        )}
      </div>

      {/* Table */}
      <div>
        <Table
          columns={COLUMNS}
          isLoading={isLoading}
          isEmpty={!isLoading && messages.length === 0}
          emptyIcon={MessageSquare}
          emptyText="No messages found"
          emptySubtext="Click 'Compose Message' to send the first message"
        >
          {messages.map((msg) => {
            const RIcon = RECIPIENT_ICON[msg.recipientType] || Globe;
            return (
              <Tr key={msg.id}>
                {/* Subject */}
                <Td first>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.isRead ? "bg-gray-100" : "bg-indigo-100"}`}>
                      {msg.isRead
                        ? <MailOpen size={13} className="text-gray-400" />
                        : <Mail     size={13} className="text-indigo-500" />
                      }
                    </div>
                    <div>
                      <p className={`text-[13px] leading-tight line-clamp-1 max-w-[220px] ${msg.isRead ? "text-gray-600" : "text-gray-800 font-medium"}`}>
                        {msg.subject}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 max-w-[220px]">{msg.body}</p>
                    </div>
                  </div>
                </Td>

                {/* Sender */}
                <Td>
                  <div>
                    <p className="text-[13px] text-gray-700 font-medium">{msg.senderName}</p>
                    <p className="text-[11px] text-gray-400">{msg.senderRole}</p>
                  </div>
                </Td>

                {/* Recipient */}
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${RECIPIENT_COLOR[msg.recipientType] || "bg-gray-100 text-gray-600"}`}>
                      <RIcon size={10} />
                      {msg.recipientType}
                    </span>
                    {msg.class && (
                      <span className="text-[11px] text-gray-400">· {msg.class.name}</span>
                    )}
                    {msg.recipientName && (
                      <span className="text-[11px] text-gray-400">· {msg.recipientName}</span>
                    )}
                  </div>
                </Td>

                {/* Sent At */}
                <Td>
                  <span className="text-[12px] text-gray-500">{formatDate(msg.sentAt)}</span>
                </Td>

                {/* Read status */}
                <Td>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    msg.isRead
                      ? "bg-gray-50 text-gray-400 border border-gray-100"
                      : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                  }`}>
                    {msg.isRead ? "Read" : "Unread"}
                  </span>
                </Td>

                {/* Actions */}
                <Td>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleView(msg)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="View message"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(msg.id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Table>

        <TableFooter page={page} totalPages={data?.totalPages} total={data?.total} label="messages" onPageChange={setPage} />
      </div>

      {/* ── Compose Modal ──────────────────────────────────────────────────── */}
      <Modal open={composeModal} onClose={closeCompose} title="Compose Message" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sender Name *"
              placeholder="e.g. Principal"
              value={form.senderName}
              onChange={(e) => set("senderName", e.target.value)}
              error={formErrors.senderName}
            />
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Sender Role</label>
              <select value={form.senderRole} onChange={(e) => set("senderRole", e.target.value)} className={selectCls}>
                <option value="Admin">Admin</option>
                <option value="Principal">Principal</option>
                <option value="Teacher">Teacher</option>
                <option value="Office">Office</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Recipient Type *</label>
              <select value={form.recipientType} onChange={(e) => set("recipientType", e.target.value)} className={selectCls}>
                {RECIPIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {formErrors.recipientType && <p className="text-[11px] text-red-500">{formErrors.recipientType}</p>}
            </div>

            {/* Class selector — only if Class */}
            {form.recipientType === "Class" && (
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Class *</label>
                <select value={form.classId} onChange={(e) => set("classId", e.target.value)} className={selectCls}>
                  <option value="">Select class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {formErrors.classId && <p className="text-[11px] text-red-500">{formErrors.classId}</p>}
              </div>
            )}

            {/* Recipient name — only if Individual */}
            {form.recipientType === "Individual" && (
              <Input
                label="Recipient Name *"
                placeholder="Full name of recipient"
                value={form.recipientName}
                onChange={(e) => set("recipientName", e.target.value)}
                error={formErrors.recipientName}
              />
            )}
          </div>

          <Input
            label="Subject *"
            placeholder="e.g. Fee Reminder for March 2025"
            value={form.subject}
            onChange={(e) => set("subject", e.target.value)}
            error={formErrors.subject}
          />

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Message *</label>
            <textarea
              rows={6}
              placeholder="Write your message here..."
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none placeholder:text-gray-300"
            />
            {formErrors.body && <p className="text-[11px] text-red-500">{formErrors.body}</p>}
          </div>

          {serverError && <p className="text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={closeCompose}>Cancel</Button>
          <Button className="flex-1" disabled={createMutation.isPending} onClick={handleSend}>
            {createMutation.isPending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </Modal>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!viewTarget} onClose={() => setView(null)} title="Message Details" size="md">
        {viewTarget && (
          <div className="space-y-4">
            <div>
              <p className="text-[15px] font-semibold text-gray-800">{viewTarget.subject}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] text-gray-400">From: <span className="font-medium text-gray-600">{viewTarget.senderName}</span> ({viewTarget.senderRole})</span>
                <span className="text-gray-200">·</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${RECIPIENT_COLOR[viewTarget.recipientType] || "bg-gray-100 text-gray-600"}`}>
                  {viewTarget.recipientType}
                  {viewTarget.class && ` — ${viewTarget.class.name}`}
                  {viewTarget.recipientName && ` — ${viewTarget.recipientName}`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-400">Sent At</p>
                <p className="text-[12px] font-medium text-gray-700">{formatDate(viewTarget.sentAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-400">Status</p>
                <p className={`text-[12px] font-medium ${viewTarget.isRead ? "text-gray-500" : "text-indigo-600"}`}>
                  {viewTarget.isRead ? "Read" : "Unread"}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-4">
              <p className="text-[10px] text-gray-400 mb-2">Message</p>
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{viewTarget.body}</p>
            </div>
          </div>
        )}
        <div className="mt-5">
          <Button variant="secondary" className="w-full" onClick={() => setView(null)}>Close</Button>
        </div>
      </Modal>

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Message">
        <div className="flex flex-col items-center text-center gap-3 pb-2">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-gray-800">Delete this message?</p>
            <p className="text-[12px] text-gray-400 mt-1">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteId)}>
            {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
          </Button>
        </div>
      </Modal>

    </div>
  );
}